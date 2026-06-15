import { useEffect, useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Sparkles, Environment, ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';
import './App.css';

// --- Types for DTO Graph ---
interface FusedNode {
  id: string;
  type: string; // 'pr', 'issue', 'message'
  name: string;
  attributes: Record<string, any>;
}

interface UnifiedProjectGraph {
  nodes: FusedNode[];
  edges: any[];
}

interface PipelineState {
  run_id: string;
  unified_graph?: UnifiedProjectGraph;
  crr?: {
    crr: number;
    total_ai_cost_usd: number;
    estimated_rework_cost_usd: number;
  };
}

interface ProjectData {
  id: string;
  name: string;
  telemetry: {
    prs: number;
    issues: number;
    agents: number;
    crr: number;
  };
  risks: {
    title: string;
    probability: number;
    desc: string;
    severity: 'critical' | 'warning';
  }[];
  approvals: {
    title: string;
    type: string;
  }[];
  events: {
    type: 'success' | 'info' | 'error';
    text: string;
  }[];
  graph: UnifiedProjectGraph;
}

interface SimulationRun {
  id: string;
  scenarioName: string;
  status: 'Running' | 'Completed' | 'Vetoed' | 'Failed';
  qaLimit: number;
  opponentLimit: number;
  conflicts: number;
  timestamp: string;
}

interface IngestionEvent {
  id: string;
  type: 'commit' | 'webhook' | 'websocket' | 'sync';
  text: string;
  time: string;
}

// --- Dynamic Mock Datasets for Professional DTO Console ---
const mockProjects: Record<string, ProjectData> = {
  'proj-alpha': {
    id: 'proj-alpha',
    name: 'Project Alpha (Frontend)',
    telemetry: { prs: 3, issues: 5, agents: 3, crr: 1.45 },
    risks: [
      {
        title: 'CSS Regressions in Component Library',
        probability: 70,
        desc: 'Proposed merge of layout adjustments might override atomic design tokens, leading to button alignment issues across core screens.',
        severity: 'warning'
      },
      {
        title: 'Stale bundle chunk imports',
        probability: 40,
        desc: 'Unreferenced route definitions in route configuration may prevent optimal chunk splitting during tree shaking.',
        severity: 'warning'
      }
    ],
    approvals: [
      { title: 'PR #204: Migrate CSS to Design System Tokens', type: 'pr' }
    ],
    events: [
      { type: 'success', text: 'Frontend build verified and optimized in staging.' },
      { type: 'info', text: 'Agent debating dependency upgrades on UI elements.' },
      { type: 'info', text: 'Compute-to-Rework Ratio stable at 1.45.' }
    ],
    graph: {
      nodes: [
        { id: 'a-pr1', type: 'pr', name: 'PR #204: Design System Migration', attributes: { status: 'Under Review', author: 'Lara' } },
        { id: 'a-pr2', type: 'pr', name: 'PR #205: Update Nav Bar', attributes: { status: 'Draft', author: 'Dan' } },
        { id: 'a-pr3', type: 'pr', name: 'PR #206: Lazy Load Images', attributes: { status: 'Approved', author: 'Sarah' } },
        { id: 'a-is1', type: 'issue', name: 'Issue #55: Button Alignment Broken', attributes: { status: 'Active', author: 'Alex' } },
        { id: 'a-is2', type: 'issue', name: 'Issue #56: Mobile Menu Layout', attributes: { status: 'Active', author: 'Alex' } },
        { id: 'a-is3', type: 'issue', name: 'Issue #57: Font Loading Flash', attributes: { status: 'Backlog', author: 'Sarah' } },
        { id: 'a-is4', type: 'issue', name: 'Issue #58: Tab Accessibility', attributes: { status: 'Active', author: 'Dan' } },
        { id: 'a-is5', type: 'issue', name: 'Issue #59: Redundant CSS Selectors', attributes: { status: 'Active', author: 'Lara' } }
      ],
      edges: []
    }
  },
  'proj-beta': {
    id: 'proj-beta',
    name: 'Project Beta (Backend API)',
    telemetry: { prs: 6, issues: 8, agents: 3, crr: 0.72 },
    risks: [
      {
        title: 'SQL Query N+1 Bottleneck in Auth Middleware',
        probability: 90,
        desc: 'Cascading database queries detected on user authorization validation. May increase response latencies by up to 300ms.',
        severity: 'critical'
      },
      {
        title: 'Connection Pool Leak under High Concurrency',
        probability: 65,
        desc: 'Unreleased client sessions in the payment gateway routes could lead to request starvation under peak traffic.',
        severity: 'warning'
      }
    ],
    approvals: [
      { title: 'PR #411: Add Redis Caching Layer to User Profile Endpoint', type: 'pr' }
    ],
    events: [
      { type: 'info', text: 'API endpoints benchmarked against latencies.' },
      { type: 'error', text: 'Critic Agent raised latency alarm on connection pool limits.' },
      { type: 'info', text: 'Worker Agent proposing cache policy fallback parameters.' }
    ],
    graph: {
      nodes: [
        { id: 'b-pr1', type: 'pr', name: 'PR #411: Redis Cache Integration', attributes: { status: 'Under Review', author: 'Mikael' } },
        { id: 'b-pr2', type: 'pr', name: 'PR #412: Database Indexing', attributes: { status: 'Approved', author: 'John' } },
        { id: 'b-pr3', type: 'pr', name: 'PR #413: Refactor Session Auth', attributes: { status: 'Draft', author: 'Mikael' } },
        { id: 'b-pr4', type: 'pr', name: 'PR #414: Rate Limiter Settings', attributes: { status: 'Under Review', author: 'Elena' } },
        { id: 'b-pr5', type: 'pr', name: 'PR #415: Fix CORS Settings', attributes: { status: 'Draft', author: 'Elena' } },
        { id: 'b-pr6', type: 'pr', name: 'PR #416: Update Stripe SDK', attributes: { status: 'Under Review', author: 'John' } },
        { id: 'b-is1', type: 'issue', name: 'Issue #112: Auth Latency Spike', attributes: { status: 'Active', author: 'Elena' } },
        { id: 'b-is2', type: 'issue', name: 'Issue #113: DB Connection Pool Exhaustion', attributes: { status: 'Active', author: 'John' } },
        { id: 'b-is3', type: 'issue', name: 'Issue #114: Rate Limit Bypass', attributes: { status: 'Active', author: 'Mikael' } },
        { id: 'b-is4', type: 'issue', name: 'Issue #115: CORS Wildcard Warning', attributes: { status: 'Backlog', author: 'Elena' } },
        { id: 'b-is5', type: 'issue', name: 'Issue #116: User Profile Slow Loading', attributes: { status: 'Active', author: 'John' } },
        { id: 'b-is6', type: 'issue', name: 'Issue #117: Unhandled Exception in Webhook', attributes: { status: 'Active', author: 'Mikael' } },
        { id: 'b-is7', type: 'issue', name: 'Issue #118: Session Expiry Window', attributes: { status: 'Active', author: 'John' } },
        { id: 'b-is8', type: 'issue', name: 'Issue #119: API Spec Discrepancy', attributes: { status: 'Backlog', author: 'Elena' } }
      ],
      edges: []
    }
  },
  'proj-gamma': {
    id: 'proj-gamma',
    name: 'Project Gamma (Data Pipeline)',
    telemetry: { prs: 2, issues: 12, agents: 3, crr: 0.34 },
    risks: [
      {
        title: 'JSON Schema Mismatch in BigQuery Loader',
        probability: 95,
        desc: 'Recent field alterations in telemetry schemas will trigger load failures during the nightly BigQuery ingestion run.',
        severity: 'critical'
      },
      {
        title: 'Memory Runaway in Dataproc Batch Process',
        probability: 80,
        desc: 'Unindexed partition filtering on large GCS logs threatens spark executors with out-of-memory overhead.',
        severity: 'critical'
      }
    ],
    approvals: [
      { title: 'PR #95: Re-partition BigLake Iceberg catalog', type: 'pr' }
    ],
    events: [
      { type: 'info', text: 'Worker Agent attempting validation on streaming sink.' },
      { type: 'error', text: 'Critic Agent vetoed merge: schema validation mismatch.' },
      { type: 'success', text: 'Event log Merkle-chain validated and sealed.' }
    ],
    graph: {
      nodes: [
        { id: 'g-pr1', type: 'pr', name: 'PR #95: Iceberg Partitioning', attributes: { status: 'Under Review', author: 'Tomi' } },
        { id: 'g-pr2', type: 'pr', name: 'PR #96: BigQuery Load Task', attributes: { status: 'Draft', author: 'Tomi' } },
        { id: 'g-is1', type: 'issue', name: 'Issue #80: BQ Ingestion Failures', attributes: { status: 'Active', author: 'Tomi' } },
        { id: 'g-is2', type: 'issue', name: 'Issue #81: Spark Batch Memory Runaway', attributes: { status: 'Active', author: 'Minna' } },
        { id: 'g-is3', type: 'issue', name: 'Issue #82: Schema Drift in Logs', attributes: { status: 'Active', author: 'Minna' } },
        { id: 'g-is4', type: 'issue', name: 'Issue #83: Partition Key Missing', attributes: { status: 'Active', author: 'Tomi' } },
        { id: 'g-is5', type: 'issue', name: 'Issue #84: Latency in Stream Loader', attributes: { status: 'Active', author: 'Minna' } },
        { id: 'g-is6', type: 'issue', name: 'Issue #85: Backpressure on PubSub', attributes: { status: 'Active', author: 'Tomi' } },
        { id: 'g-is7', type: 'issue', name: 'Issue #86: Duplicate Event Records', attributes: { status: 'Active', author: 'Tomi' } },
        { id: 'g-is8', type: 'issue', name: 'Issue #87: Dataform Model Compilation', attributes: { status: 'Active', author: 'Minna' } },
        { id: 'g-is9', type: 'issue', name: 'Issue #88: Iceberg Metadata Corrupted', attributes: { status: 'Active', author: 'Tomi' } },
        { id: 'g-is10', type: 'issue', name: 'Issue #89: Missing Audit Trail Fields', attributes: { status: 'Active', author: 'Minna' } },
        { id: 'g-is11', type: 'issue', name: 'Issue #90: Timestamp Offset Ingestion', attributes: { status: 'Backlog', author: 'Tomi' } },
        { id: 'g-is12', type: 'issue', name: 'Issue #91: DB Connection Limit GCP', attributes: { status: 'Backlog', author: 'Minna' } }
      ],
      edges: []
    }
  }
};

// --- Sound Effects ---
const playHoverSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Sleek technical feedback tone
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    // Ignore autoplay blocks
  }
};

// --- 3D Professional DTO Network Simulation Components ---

// Sleek Cylindrical Dependency Link between nodes
function DependencyEdge({ start, end }: { start: [number, number, number], end: [number, number, number] }) {
  const startVec = new THREE.Vector3(...start);
  const endVec = new THREE.Vector3(...end);
  const distance = startVec.distanceTo(endVec);
  const position = startVec.clone().add(endVec).multiplyScalar(0.5);
  
  // Orient cylinder along the vector between start and end
  const direction = endVec.clone().sub(startVec).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
  
  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[0.012, 0.012, distance, 6]} />
      <meshBasicMaterial color="#4450b7" opacity={0.25} transparent />
    </mesh>
  );
}

// Labeled, sleek Verification Agent Node (Server Module style)
function VerificationAgentNode({ 
  position, 
  color, 
  role, 
  actionText, 
  bounceOffset = 0, 
  nodeType, 
  speedMultiplier = 1 
}: { 
  position: [number, number, number], 
  color: string, 
  role: string, 
  actionText: string, 
  bounceOffset?: number, 
  nodeType: 'worker' | 'critic' | 'opponent',
  speedMultiplier?: number
}) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const baseHeight = position[1];
      const bounce = Math.sin(state.clock.elapsedTime * 1.5 * speedMultiplier + bounceOffset) * 0.02;
      const hoverElevate = hovered ? 0.35 : 0;
      // Smooth interpolation for floating action
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, baseHeight + bounce + hoverElevate, 0.1);
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.05 * speedMultiplier;
    }
  });

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHovered(true);
    playHoverSound();
  };

  return (
    <group 
      ref={groupRef}
      position={position} 
      onPointerOver={handlePointerOver}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      {/* Floating Role Label Badge */}
      <Html position={[0, 1.3, 0]} center pointerEvents="none">
        <div className="agent-label-badge" style={{ borderColor: color }}>
          {role.toUpperCase()}
        </div>
      </Html>

      <Float speed={1.5 * speedMultiplier} rotationIntensity={0.1} floatIntensity={0.1}>
        {nodeType === 'worker' && (
          // Worker: Sleek Chamfered Cylinder module
          <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.8, 6]} />
            <meshStandardMaterial color={hovered ? '#4450b7' : '#2d3345'} roughness={0.3} metalness={0.8} />
          </mesh>
        )}
        {nodeType === 'critic' && (
          // Critic: Double ringed disk/column module
          <group position={[0, 0.4, 0]}>
            <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
              <cylinderGeometry args={[0.4, 0.4, 0.15, 8]} />
              <meshStandardMaterial color={hovered ? '#ffffff' : '#8d99ae'} roughness={0.2} metalness={0.9} />
            </mesh>
            <mesh castShadow receiveShadow position={[0, 0.2, 0]}>
              <cylinderGeometry args={[0.3, 0.3, 0.15, 8]} />
              <meshStandardMaterial color={hovered ? '#ffffff' : '#8d99ae'} roughness={0.2} metalness={0.9} />
            </mesh>
          </group>
        )}
        {nodeType === 'opponent' && (
          // Opponent: Angular Diamond prism module
          <mesh castShadow receiveShadow position={[0, 0.4, 0]} rotation={[0, 0, Math.PI / 4]}>
            <octahedronGeometry args={[0.42, 0]} />
            <meshStandardMaterial color={hovered ? '#ff5555' : '#7209b7'} roughness={0.4} metalness={0.7} />
          </mesh>
        )}

        {/* Core Light Indicator */}
        <mesh position={[0, 0.4, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color={hovered ? '#ffffff' : color} />
        </mesh>
      </Float>

      {hovered && (
        <Html position={[0, 1.8, 0]} center zIndexRange={[100, 0]}>
          <div className="glass-tooltip">
            <strong>{role} Agent</strong>
            <p>{actionText}</p>
          </div>
        </Html>
      )}
    </group>
  );
}

// Professional Telemetry Node (Octahedron for PRs, Dodecahedron for Issues)
function DTONode({ position, node }: { position: [number, number, number], node: FusedNode }) {
  const [hovered, setHovered] = useState(false);
  const isPR = node.type === 'pr';
  const color = isPR ? '#2ea043' : '#ba1a1a';

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHovered(true);
    playHoverSound();
  };

  return (
    <group 
      position={position}
      onPointerOver={handlePointerOver}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      <mesh castShadow receiveShadow>
        {isPR ? (
          <octahedronGeometry args={[0.26, 0]} />
        ) : (
          <dodecahedronGeometry args={[0.22, 0]} />
        )}
        <meshStandardMaterial 
          color={hovered ? '#ffffff' : color} 
          roughness={0.35} 
          metalness={0.2}
          emissive={color}
          emissiveIntensity={hovered ? 0.9 : 0.25}
        />
      </mesh>
      
      {/* Node status halos on hover */}
      {hovered && (
        <mesh>
          <sphereGeometry args={[0.45, 12, 12]} />
          <meshBasicMaterial color={color} transparent opacity={0.12} wireframe />
        </mesh>
      )}

      {hovered && (
        <Html position={[0, 0.8, 0]} center zIndexRange={[100, 0]}>
          <div className="glass-tooltip node-tooltip">
            <span className={`badge ${node.type}`}>{node.type.toUpperCase()}</span>
            <strong>{node.name}</strong>
            {node.attributes.status && <p>Status: {node.attributes.status}</p>}
            {node.attributes.author && <p>Author: {node.attributes.author}</p>}
          </div>
        </Html>
      )}
    </group>
  );
}

function GridOverlay({ crr, qaLimit }: { crr?: number, qaLimit: number }) {
  const isAlert = crr === undefined || crr < 1.0;
  // Map qaLimit (1M to 10M) to sparkles count.
  const sparklesCount = Math.floor(qaLimit * 30);
  
  return (
    <>
      {isAlert ? (
        <>
          <ambientLight intensity={0.45} color="#5e6472" />
          <directionalLight position={[10, 10, 5]} intensity={0.4} color="#788090" castShadow />
          {/* Subtle alert particles */}
          <Sparkles count={sparklesCount * 2} scale={15} size={2.5} speed={2.8} opacity={0.3} color="#ff8888" position={[0, 6, 0]} />
        </>
      ) : (
        <>
          <ambientLight intensity={0.8} color="#f0f3fa" />
          <directionalLight position={[12, 15, 6]} intensity={1.1} color="#f8fafd" castShadow />
          {/* Operational status particles */}
          <Sparkles count={sparklesCount} scale={12} size={1.5} speed={0.2} opacity={0.2} color="#88a8ff" position={[0, 4, 0]} />
        </>
      )}
    </>
  );
}

function DTOSimulation({ 
  graph, 
  crr, 
  qaLimit, 
  opponentLimit 
}: { 
  graph: UnifiedProjectGraph | null, 
  crr?: number, 
  qaLimit: number, 
  opponentLimit: number 
}) {
  const isAlert = crr === undefined || crr < 1.0;
  const gridColor = isAlert ? '#e63946' : '#4450b7';
  const bgColor = isAlert ? '#fdf8f5' : '#fbf9f6'; // Warm minimalist backgrounds

  // Precompute positions for telemetry nodes so we can draw connecting edges
  const nodePositions = graph?.nodes?.map((node, index) => {
    const angle = (index / graph.nodes.length) * Math.PI * 2;
    const radius = 5.5 + (index % 3) * 0.7;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = 0.4 + Math.sin(index * 35) * 0.2; // Float slightly off the grid floor
    return { id: node.id, node, position: [x, y, z] as [number, number, number] };
  }) || [];

  return (
    <>
      <color attach="background" args={[bgColor]} />
      
      <Environment preset="city" />
      <GridOverlay crr={crr} qaLimit={qaLimit} />
      
      {/* Precision CAD-like grid floor */}
      <gridHelper args={[80, 80, gridColor, '#e8e4df']} position={[0, 0, 0]} />
      
      {/* Soft ground reflector shadow */}
      <ContactShadows position={[0, -0.01, 0]} opacity={0.25} scale={20} blur={2.5} far={4} color="#1b1c22" />

      {/* Verification Agents (Sleek Modules) */}
      <VerificationAgentNode 
        position={[-4, 0, -4]} 
        color="#00e5ff" 
        role="Worker" 
        actionText="Synthesizing PR resolutions..." 
        bounceOffset={0} 
        nodeType="worker" 
        speedMultiplier={opponentLimit}
      />
      <VerificationAgentNode 
        position={[4, 0, -3.5]} 
        color="#8455ef" 
        role="Opponent" 
        actionText="Hunting for dependency conflicts!" 
        bounceOffset={1.5} 
        nodeType="opponent" 
        speedMultiplier={opponentLimit}
      />
      <VerificationAgentNode 
        position={[0, 0, -6.5]} 
        color="#8d99ae" 
        role="Critic" 
        actionText="Awaiting consensus..." 
        bounceOffset={3} 
        nodeType="critic" 
        speedMultiplier={opponentLimit}
      />

      {/* Connecting Dependency Edges (PRs linked to Issues) */}
      {nodePositions.map((nPos, index) => {
        if (nPos.node.type === 'pr') {
          // Relate to next Issue node in the list
          const nextIssue = nodePositions.slice(index + 1).find(n => n.node.type === 'issue') 
            || nodePositions.find(n => n.node.type === 'issue');
          
          if (nextIssue) {
            return (
              <DependencyEdge 
                key={`edge-${nPos.id}-${nextIssue.id}`} 
                start={nPos.position} 
                end={nextIssue.position} 
              />
            );
          }
        }
        return null;
      })}

      {/* Network Nodes */}
      {nodePositions.map((nPos) => (
        <DTONode key={nPos.id} position={nPos.position} node={nPos.node} />
      ))}
    </>
  );
}

// --- SVG Cost Curve Chart ---
function CostChart({ projectCrr }: { projectCrr: number }) {
  // Manual rework climbs up
  const manualPoints = [
    { x: 50, y: 150 },
    { x: 130, y: 125 },
    { x: 210, y: 100 },
    { x: 290, y: 75 },
    { x: 370, y: 55 },
    { x: 450, y: 30 }
  ];
  
  // Simulation starts lower and flatlines, even lower if CRR is high (more optimal)
  const simBase = projectCrr >= 1.0 ? 120 : 138;
  const simPoints = [
    { x: 50, y: 155 },
    { x: 130, y: 135 },
    { x: 210, y: simBase + 5 },
    { x: 290, y: simBase },
    { x: 370, y: simBase - 2 },
    { x: 450, y: simBase - 5 }
  ];

  const manualPath = `M ${manualPoints.map(p => `${p.x} ${p.y}`).join(' L ')}`;
  const simPath = `M ${simPoints.map(p => `${p.x} ${p.y}`).join(' L ')}`;

  return (
    <div className="cost-chart-container">
      <div className="chart-header">
        <span className="legend-item">
          <span className="dot manual"></span>
          Manual Rework
        </span>
        <span className="legend-item">
          <span className="dot sim"></span>
          Simulation (DTO)
        </span>
      </div>
      <svg viewBox="0 0 500 200" className="cost-svg">
        {/* Grid lines */}
        <line x1="50" y1="30" x2="450" y2="30" stroke="rgba(0,0,0,0.04)" />
        <line x1="50" y1="70" x2="450" y2="70" stroke="rgba(0,0,0,0.04)" />
        <line x1="50" y1="110" x2="450" y2="110" stroke="rgba(0,0,0,0.04)" />
        <line x1="50" y1="150" x2="450" y2="150" stroke="rgba(0,0,0,0.04)" />
        
        {/* Paths */}
        <path d={manualPath} fill="none" stroke="#ba1a1a" strokeWidth="1.5" strokeDasharray="4,4" />
        <path d={simPath} fill="none" stroke="#4450b7" strokeWidth="2.5" />
        
        {/* Points */}
        {manualPoints.map((p, i) => (
          <circle key={`m-${i}`} cx={p.x} cy={p.y} r="3.5" fill="#ba1a1a" />
        ))}
        {simPoints.map((p, i) => (
          <circle key={`s-${i}`} cx={p.x} cy={p.y} r="4.5" fill="#4450b7" />
        ))}
        
        {/* Axes */}
        <line x1="50" y1="170" x2="450" y2="170" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
        <line x1="50" y1="20" x2="50" y2="170" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
        
        {/* Axis labels */}
        <text x="42" y="34" textAnchor="end" fontSize="9" fill="#9ea0a8" fontFamily="var(--mono-font)">$60k</text>
        <text x="42" y="114" textAnchor="end" fontSize="9" fill="#9ea0a8" fontFamily="var(--mono-font)">$20k</text>
        <text x="42" y="154" textAnchor="end" fontSize="9" fill="#9ea0a8" fontFamily="var(--mono-font)">$5k</text>
        
        <text x="50" y="185" textAnchor="middle" fontSize="9" fill="#9ea0a8" fontFamily="var(--font-family)">Day 1</text>
        <text x="250" y="185" textAnchor="middle" fontSize="9" fill="#9ea0a8" fontFamily="var(--font-family)">Day 15</text>
        <text x="450" y="185" textAnchor="middle" fontSize="9" fill="#9ea0a8" fontFamily="var(--font-family)">Day 30</text>
      </svg>
    </div>
  );
}

// --- Main App ---
function App() {
  const [pipelineState, setPipelineState] = useState<PipelineState | null>(null);
  const [zenMode, setZenMode] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>('');
  
  // Custom dynamically connected projects list
  const [customProjects, setCustomProjects] = useState<ProjectData[]>([]);

  // Navigation tabs state
  const [currentTab, setCurrentTab] = useState<string>('overview');

  // Cognitive Budget slider states
  const [qaLimit, setQaLimit] = useState<number>(5.0); // 1M to 10M tokens
  const [opponentLimit, setOpponentLimit] = useState<number>(1.0); // 0.1M to 2.0M tokens
  const [limitsEnforced, setLimitsEnforced] = useState(false);

  // Connection Modal state
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectModalTab, setConnectModalTab] = useState<'file' | 'api'>('file');
  const [spreadsheetName, setSpreadsheetName] = useState('');
  const [sheetsLink, setSheetsLink] = useState('');
  const [selectedApiPlatform, setSelectedApiPlatform] = useState<'jira' | 'linear'>('jira');
  const [apiLink, setApiLink] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectLogs, setConnectLogs] = useState<string[]>([]);

  // Scenarios dynamic state
  const [runs, setRuns] = useState<Record<string, SimulationRun[]>>({
    'proj-alpha': [
      { id: 'RUN-99841', scenarioName: 'Sandbox Alpha-1', status: 'Completed', qaLimit: 5.0, opponentLimit: 1.0, conflicts: 0, timestamp: '10 mins ago' },
      { id: 'RUN-99840', scenarioName: 'Sandbox Alpha-2', status: 'Vetoed', qaLimit: 4.5, opponentLimit: 1.2, conflicts: 2, timestamp: '1 hour ago' },
      { id: 'RUN-99839', scenarioName: 'Sandbox Alpha-3', status: 'Failed', qaLimit: 3.0, opponentLimit: 1.8, conflicts: 5, timestamp: '3 hours ago' }
    ],
    'proj-beta': [
      { id: 'RUN-99752', scenarioName: 'Sandbox Beta-1', status: 'Completed', qaLimit: 6.0, opponentLimit: 0.8, conflicts: 0, timestamp: '20 mins ago' },
      { id: 'RUN-99751', scenarioName: 'Sandbox Beta-2', status: 'Failed', qaLimit: 4.0, opponentLimit: 1.5, conflicts: 4, timestamp: '2 hours ago' }
    ],
    'proj-gamma': [
      { id: 'RUN-99611', scenarioName: 'Sandbox Gamma-1', status: 'Completed', qaLimit: 7.0, opponentLimit: 1.0, conflicts: 0, timestamp: '30 mins ago' }
    ],
    'proj-live': []
  });

  const [activeSimId, setActiveSimId] = useState<string | null>(null);

  // Ingestion dynamic logs
  const [ingestionEvents, setIngestionEvents] = useState<Record<string, IngestionEvent[]>>({
    'proj-alpha': [
      { id: 'EVT-101', type: 'commit', text: 'Commit #f402ad: update button padding in buttons.css (Lara)', time: '2 mins ago' },
      { id: 'EVT-102', type: 'webhook', text: 'Webhook received from GitHub: push to dev branch', time: '5 mins ago' },
      { id: 'EVT-103', type: 'sync', text: 'Telemetry sync completed: 3 PRs, 5 Issues parsed', time: '12 mins ago' }
    ],
    'proj-beta': [
      { id: 'EVT-201', type: 'commit', text: 'Commit #882bde: fix Redis cache expiration policy (Mikael)', time: '8 mins ago' },
      { id: 'EVT-202', type: 'webhook', text: 'GitHub Webhook: PR #411 comments synchronized', time: '1 hour ago' }
    ],
    'proj-gamma': [
      { id: 'EVT-301', type: 'webhook', text: 'GitHub Sync: schema compilation check complete', time: '45 mins ago' }
    ],
    'proj-live': []
  });

  const [isSyncing, setIsSyncing] = useState(false);

  // Settings states
  const [consensusThreshold, setConsensusThreshold] = useState<number>(75);
  const [defaultModel, setDefaultModel] = useState<string>('Gemini 2.5 Pro');
  const [retentionPolicy, setRetentionPolicy] = useState<string>('7 days');
  const [alertChannels, setAlertChannels] = useState({
    email: false,
    webhook: true,
    slack: true
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Project data adjustments on sync
  const [projectMetricsOffset, setProjectMetricsOffset] = useState<Record<string, { prs: number, issues: number }>>({
    'proj-alpha': { prs: 0, issues: 0 },
    'proj-beta': { prs: 0, issues: 0 },
    'proj-gamma': { prs: 0, issues: 0 },
    'proj-live': { prs: 0, issues: 0 }
  });

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8765/ws');
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'state_update') {
          setPipelineState(msg.data);
        }
      } catch (err) {}
    };
    return () => ws.close();
  }, []);

  // Resolve active project by ID (merging mock datasets and dynamically added projects)
  const allProjectsMap = {
    ...mockProjects,
    ...customProjects.reduce((acc, proj) => {
      acc[proj.id] = proj;
      return acc;
    }, {} as Record<string, ProjectData>)
  };

  const activeProjectData = selectedProject && selectedProject !== 'proj-live'
    ? {
        ...allProjectsMap[selectedProject],
        telemetry: {
          ...allProjectsMap[selectedProject].telemetry,
          prs: allProjectsMap[selectedProject].telemetry.prs + (projectMetricsOffset[selectedProject]?.prs || 0),
          issues: allProjectsMap[selectedProject].telemetry.issues + (projectMetricsOffset[selectedProject]?.issues || 0)
        }
      }
    : selectedProject === 'proj-live'
      ? {
          id: 'proj-live',
          name: 'Live Pipeline (WS)',
          telemetry: {
            prs: (pipelineState?.unified_graph?.nodes?.filter(n => n.type === 'pr').length || 0) + (projectMetricsOffset['proj-live']?.prs || 0),
            issues: (pipelineState?.unified_graph?.nodes?.filter(n => n.type === 'issue').length || 0) + (projectMetricsOffset['proj-live']?.issues || 0),
            agents: 3,
            crr: pipelineState?.crr?.crr || 0.00
          },
          risks: [
            {
              title: 'Dependency Drift in Auth Module',
              probability: 85,
              desc: 'If PR #42 merges before ENG-101, the simulation predicts cascading build failures in the authentication package.',
              severity: 'critical' as const
            },
            {
              title: 'Memory Leak in Physics Engine',
              probability: 60,
              desc: 'Recent commits to the spatial solver indicate potential memory leaks during high-entity simulations.',
              severity: 'warning' as const
            }
          ],
          approvals: [
            { title: 'PR #102: Sequential Merge Strategy', type: 'pr' }
          ],
          events: [
            { type: 'success' as const, text: 'CRR improved by 0.15 in the last hour.' },
            { type: 'info' as const, text: 'Scenario Strategist running background simulations...' },
            { type: 'info' as const, text: 'Waiting for incoming webhook events...' }
          ],
          graph: pipelineState?.unified_graph || { nodes: [], edges: [] }
        }
      : null;

  // Derived dashboard metrics based on limits
  const tokenBurn = (qaLimit * 1.8 + opponentLimit * 0.9).toFixed(1);
  const hoursSaved = activeProjectData 
    ? Math.round(activeProjectData.telemetry.crr * 150 + qaLimit * 12)
    : 0;

  // Trigger scenario handler
  const handleTriggerScenario = () => {
    if (!selectedProject) return;
    const newRunId = `RUN-${Math.floor(10000 + Math.random() * 90000)}`;
    const newRun: SimulationRun = {
      id: newRunId,
      scenarioName: `Sandbox ${activeProjectData?.name.split(' ')[1] || 'Project'}-${(runs[selectedProject]?.length || 0) + 1}`,
      status: 'Running',
      qaLimit,
      opponentLimit,
      conflicts: Math.random() > 0.6 ? Math.floor(Math.random() * 3) + 1 : 0,
      timestamp: 'Just now'
    };

    // Add running item
    setRuns(prev => ({
      ...prev,
      [selectedProject]: [newRun, ...(prev[selectedProject] || [])]
    }));
    setActiveSimId(newRunId);

    // Simulate completion after 3 seconds
    setTimeout(() => {
      setRuns(prev => {
        const projectRuns = prev[selectedProject] || [];
        const updated = projectRuns.map(run => {
          if (run.id === newRunId) {
            return {
              ...run,
              status: run.conflicts > 0 ? (Math.random() > 0.5 ? 'Vetoed' : 'Failed') : 'Completed'
            } as SimulationRun;
          }
          return run;
        });
        return { ...prev, [selectedProject]: updated };
      });
      setActiveSimId(null);
      
      // Append event log
      if (activeProjectData) {
        activeProjectData.events.unshift({
          type: newRun.conflicts > 0 ? 'error' : 'success',
          text: `Simulation run ${newRunId} resolved: ${newRun.conflicts} conflicts detected.`
        });
      }
    }, 3000);
  };

  // Trigger telemetry sync handler
  const handleTriggerSync = () => {
    if (!selectedProject) return;
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      // Randomly modify telemetry numbers (adds a PR or issue)
      const isPR = Math.random() > 0.5;
      setProjectMetricsOffset(prev => ({
        ...prev,
        [selectedProject]: {
          prs: (prev[selectedProject]?.prs || 0) + (isPR ? 1 : 0),
          issues: (prev[selectedProject]?.issues || 0) + (!isPR ? 1 : 0)
        }
      }));

      // Add timeline log
      const newEventId = `EVT-${Math.floor(400 + Math.random() * 600)}`;
      const newEvent: IngestionEvent = {
        id: newEventId,
        type: 'sync',
        text: `Manual sync complete: Added 1 active ${isPR ? 'PR node' : 'Issue node'} to coordinate workspace.`,
        time: 'Just now'
      };

      setIngestionEvents(prev => ({
        ...prev,
        [selectedProject]: [newEvent, ...(prev[selectedProject] || [])]
      }));

      // Append general event log
      if (activeProjectData) {
        activeProjectData.events.unshift({
          type: 'success',
          text: `Telemetry pipeline synced. Workspace mapping re-indexed.`
        });
      }
    }, 1500);
  };

  // Handle settings save config
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    }, 1000);
  };

  // Simulated Custom Project Workspace Ingestion
  const handleSyncWorkspaceClick = () => {
    setIsConnecting(true);
    setConnectLogs([]);

    const steps = connectModalTab === 'file' 
      ? [
          'Initializing spreadsheet parse engine...',
          `Ingesting data columns from ${spreadsheetName || 'Google SheetsLink'}...`,
          'Resolving rows to dependency vertices...',
          'Calibrating Causal DTO Graph elements...',
          'Project World Model workspace successfully created!'
        ]
      : [
          `Connecting to ${selectedApiPlatform === 'jira' ? 'Jira Atlassian' : 'Linear App'} REST API...`,
          'Authenticating token credentials...',
          'Downloading backlog items & repository branches...',
          'Resolving parent/child dependency constraints...',
          'Project World Model workspace successfully created!'
        ];

    // Log progression step by step
    steps.forEach((stepText, idx) => {
      setTimeout(() => {
        setConnectLogs(prev => [...prev, stepText]);
        
        // Final completion step
        if (idx === steps.length - 1) {
          setTimeout(() => {
            const customName = connectModalTab === 'file'
              ? (spreadsheetName ? spreadsheetName.split('.')[0] : 'Sheet Ingestion')
              : (selectedApiPlatform === 'jira' ? 'Jira Board' : 'Linear Workspace');
            
            const customId = `custom-${Date.now()}`;
            
            // Seed a custom project data set
            const newProj: ProjectData = {
              id: customId,
              name: `${customName} (Custom)`,
              telemetry: {
                prs: connectModalTab === 'file' ? 4 : 8,
                issues: connectModalTab === 'file' ? 8 : 15,
                agents: 3,
                crr: connectModalTab === 'file' ? 1.28 : 0.82
              },
              risks: [
                {
                  title: 'Circular dependency chain in backlog',
                  probability: 80,
                  desc: 'A loop detected between issue ENG-120 and PR #104. Simulation warns of potential infinite verification loops.',
                  severity: 'critical' as const
                }
              ],
              approvals: [
                { title: 'Ingestion validation run #100', type: 'pr' }
              ],
              events: [
                { type: 'success', text: 'Telemetry successfully mapped from external link.' }
              ],
              graph: {
                nodes: [
                  { id: `${customId}-pr1`, type: 'pr', name: 'PR #100: Custom Patch', attributes: { status: 'Under Review', author: 'Auditor' } },
                  { id: `${customId}-is1`, type: 'issue', name: 'Issue ENG-120: Cycle Refactor', attributes: { status: 'Active', author: 'Engineer' } },
                  { id: `${customId}-is2`, type: 'issue', name: 'Issue ENG-121: Null Pointer Fix', attributes: { status: 'Active', author: 'Engineer' } }
                ],
                edges: []
              }
            };

            // Seed runs and ingestion event placeholders
            setRuns(prev => ({ ...prev, [customId]: [] }));
            setIngestionEvents(prev => ({
              ...prev,
              [customId]: [
                { id: `EVT-CUST-1`, type: 'sync', text: 'Repository ingestion sync established.', time: 'Just now' }
              ]
            }));

            setProjectMetricsOffset(prev => ({
              ...prev,
              [customId]: { prs: 0, issues: 0 }
            }));

            // Save and select
            setCustomProjects(prev => [...prev, newProj]);
            setSelectedProject(customId);
            setIsConnecting(false);
            setShowConnectModal(false);
            setSpreadsheetName('');
            setSheetsLink('');
            setApiLink('');
            setApiToken('');
            setCurrentTab('overview');
          }, 1000);
        }
      }, (idx + 1) * 750);
    });
  };

  return (
    <div className={`app-container ${zenMode ? 'zen-active' : 'standard-active'}`}>
      
      {/* Left Sidebar Nav Drawer (B rebranding renames to Project World Model) */}
      <aside className={`sidebar-nav ${zenMode ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          <span className="material-symbols-outlined brand-icon">query_stats</span>
          <span className="brand-text">Project World Model</span>
        </div>
        <nav className="sidebar-menu">
          <button 
            onClick={() => setCurrentTab('overview')} 
            className={`menu-item-btn ${currentTab === 'overview' ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="menu-text">Overview</span>
          </button>
          <button 
            onClick={() => setCurrentTab('scenarios')} 
            className={`menu-item-btn ${currentTab === 'scenarios' ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">schema</span>
            <span className="menu-text">Scenarios</span>
          </button>
          <button 
            onClick={() => setCurrentTab('crr')} 
            className={`menu-item-btn ${currentTab === 'crr' ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">analytics</span>
            <span className="menu-text">CRR Analysis</span>
          </button>
          <button 
            onClick={() => setCurrentTab('tokens')} 
            className={`menu-item-btn ${currentTab === 'tokens' ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">toll</span>
            <span className="menu-text">Token Ingestion</span>
          </button>
          <button 
            onClick={() => setCurrentTab('settings')} 
            className={`menu-item-btn ${currentTab === 'settings' ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="menu-text">Settings</span>
          </button>
        </nav>
        <div className="sidebar-footer">
          <span className="badge version">v2.1.0</span>
        </div>
      </aside>

      {/* Main Layout Container (Header + Content Workspace) */}
      <div className="main-layout">
        
        {/* Sticky Top Navigation Bar */}
        <header className="top-nav">
          <div className="header-left">
            <div className="breadcrumbs">
              <span className="crumb parent">Workspace</span>
              <span className="crumb-separator">/</span>
              <span className="crumb current">
                {activeProjectData ? activeProjectData.name : 'Console'}
              </span>
            </div>
          </div>
          
          <div className="nav-controls">
            {!selectedProject && (
              <div className="start-here-nav-hint">
                <span>Start Here</span>
                <span className="arrow">→</span>
              </div>
            )}
            <select 
              className="project-selector" 
              value={selectedProject} 
              onChange={(e) => {
                setSelectedProject(e.target.value);
                if (!e.target.value) setZenMode(false);
              }}
            >
              <option value="">-- Select Project Workspace --</option>
              <option value="proj-alpha">Project Alpha (Frontend)</option>
              <option value="proj-beta">Project Beta (Backend API)</option>
              <option value="proj-gamma">Project Gamma (Data Pipeline)</option>
              <option value="proj-live">Live Pipeline (FastAPI WebSocket)</option>
              
              {/* Dynamically display custom connected projects */}
              {customProjects.map(proj => (
                <option key={proj.id} value={proj.id}>{proj.name}</option>
              ))}
            </select>

            {/* Connect Workspace Button */}
            <button 
              className="connect-workspace-btn"
              onClick={() => {
                setShowConnectModal(true);
                setConnectLogs([]);
                setIsConnecting(false);
              }}
              title="Add Excel file, Google Sheet, Jira or Linear repository"
            >
              <span className="material-symbols-outlined btn-add-icon">add_circle</span>
              Connect Workspace
            </button>

            <button 
              className={`toggle-btn ${zenMode ? 'active' : ''}`} 
              onClick={() => setZenMode(!zenMode)}
              disabled={!selectedProject}
              title={!selectedProject ? "Select a project to enable simulation" : "Toggle DTO Simulation"}
            >
              <span className="material-symbols-outlined btn-icon-span">
                {zenMode ? 'grid_view' : '3d_rotation'}
              </span>
              {zenMode ? 'Exit DTO Simulation' : 'Enter DTO Simulation'}
            </button>
            
            <div className="user-profile">
              <div className="avatar">SS</div>
              <div className="user-info">
                <span className="user-name">Scenario Strategist</span>
                <span className="user-role">Lead Auditor</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Workspace */}
        <div className="content-wrapper">
          
          {/* 3D Background Canvas Layer */}
          <div className="canvas-container">
            <Canvas shadows camera={{ position: [0, 8, 12], fov: 48 }}>
              <OrbitControls makeDefault maxPolarAngle={Math.PI / 2 - 0.05} minDistance={5} maxDistance={25} />
              <DTOSimulation 
                graph={activeProjectData?.graph || null} 
                crr={activeProjectData?.telemetry?.crr} 
                qaLimit={qaLimit}
                opponentLimit={opponentLimit}
              />
            </Canvas>
          </div>

          {/* Dynamic UI Overlay Layer */}
          <div className="ui-layer">
            {!activeProjectData ? (
              // Premium Centered Onboarding View for First-time Users
              <div className="onboarding-container">
                <div className="glass-card onboarding-card">
                  <h2>Welcome to Project World Model</h2>
                  <p className="onboarding-subtitle">Causal Digital Twin of the Project</p>
                  
                  <div className="onboarding-steps">
                    <div className="onboarding-step">
                      <span className="step-num">1</span>
                      <div className="step-content">
                        {currentTab === 'overview' && (
                          <>
                            <h4>Select or Connect a Project Workspace</h4>
                            <p>Pick a repository from the selector above or click <strong>Connect Workspace</strong> to ingest your own spreadsheet files (Excel / Google Sheet) or link Jira/Linear APIs.</p>
                          </>
                        )}
                        {currentTab === 'scenarios' && (
                          <>
                            <h4>Configure Active Scenarios</h4>
                            <p>Select a workspace first. Once initialized, you can model counterfactual sandboxes and trigger sandbox simulations to detect circular dependency conflicts.</p>
                          </>
                        )}
                        {currentTab === 'crr' && (
                          <>
                            <h4>View CRR Deep Costs</h4>
                            <p>Choose a repository to view a total Compute-to-Rework cost breakdown. Audit Worker, Critic, and Opponent token usage margins.</p>
                          </>
                        )}
                        {currentTab === 'tokens' && (
                          <>
                            <h4>Track Ingestion Streams</h4>
                            <p>Select a workspace to view incoming webhook logs, Git commits, and FastAPI WebSocket notifications. Perform manual syncs to pull active states.</p>
                          </>
                        )}
                        {currentTab === 'settings' && (
                          <>
                            <h4>Configure System Settings</h4>
                            <p>Please select a repository workspace to unlock settings controls, Consensus threshold parameters, and alert notification destinations.</p>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="onboarding-step">
                      <span className="step-num">2</span>
                      <div className="step-content">
                        <h4>Audit Counterfactual Predictions</h4>
                        <p>Review high-probability bottlenecks and cascading integration risks simulated in the latent sandboxes overnight.</p>
                      </div>
                    </div>
                    
                    <div className="onboarding-step">
                      <span className="step-num">3</span>
                      <div className="step-content">
                        <h4>Exercise your Veto override</h4>
                        <p>Calibrate autonomous verification agent incentive structures and reject unstable code merges to preserve system convergence.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="onboarding-connect-action">
                    <button 
                      className="onboarding-action-btn"
                      onClick={() => {
                        setShowConnectModal(true);
                        setConnectLogs([]);
                        setIsConnecting(false);
                      }}
                    >
                      <span className="material-symbols-outlined">add_circle</span>
                      Connect Your Own Project Workspace
                    </button>
                  </div>
                </div>
              </div>
            ) : !zenMode ? (
              // Option 2 Layout: Switchable tabs standard views
              <div className="standard-main-content">
                
                {/* 1. OVERVIEW TAB VIEW */}
                {currentTab === 'overview' && (
                  <>
                    {/* 3 Top Metric Cards */}
                    <div className="metrics-row">
                      {/* Card 1: CRR */}
                      <div className="metric-card">
                        <div className="metric-header">
                          <span className="metric-title">CRR (Compute/Rework Ratio)</span>
                          <div className="tooltip-trigger">
                            <span className="material-symbols-outlined info-icon-styled">info</span>
                            <span className="tooltip-text">Compute-to-Rework Ratio: Measures agent validation token cost vs avoided developer expert rework hours. Target &gt; 1.0.</span>
                          </div>
                        </div>
                        <div className="metric-body">
                          <span className="metric-value">{activeProjectData.telemetry.crr.toFixed(2)}x</span>
                          <span className={`metric-trend-badge ${activeProjectData.telemetry.crr >= 1.0 ? 'positive' : 'negative'}`}>
                            <span className="material-symbols-outlined trend-icon">
                              {activeProjectData.telemetry.crr >= 1.0 ? 'trending_up' : 'trending_down'}
                            </span>
                            {activeProjectData.telemetry.crr >= 1.0 ? '+12.4% vs manual' : 'debt warning'}
                          </span>
                        </div>
                        <div className="metric-footer">
                          Target CRR is &gt;1.0x. Measures verification efficiency.
                        </div>
                      </div>

                      {/* Card 2: Daily Token Burn */}
                      <div className="metric-card">
                        <div className="metric-header">
                          <span className="metric-title">Daily Token Burn</span>
                          <span className="material-symbols-outlined header-icon">toll</span>
                        </div>
                        <div className="metric-body">
                          <div className="metric-value-row">
                            <span className="metric-value">{tokenBurn}M</span>
                            <span className="metric-cap">/ 20M cap</span>
                          </div>
                          <div className="token-progress-bar-container">
                            <div className="token-progress-bar" style={{ width: `${Math.min((parseFloat(tokenBurn) / 20) * 100, 100)}%` }}></div>
                          </div>
                        </div>
                        <div className="metric-footer">
                          Active compute budget utilization envelope.
                        </div>
                      </div>

                      {/* Card 3: Human Hours Saved */}
                      <div className="metric-card">
                        <div className="metric-header">
                          <span className="metric-title">Human Hours Saved</span>
                          <span className="material-symbols-outlined header-icon">schedule</span>
                        </div>
                        <div className="metric-body">
                          <span className="metric-value">{hoursSaved} hrs</span>
                          <span className="metric-trend-badge positive">
                            <span className="material-symbols-outlined trend-icon">verified</span>
                            Active Sandbox
                          </span>
                        </div>
                        <div className="metric-footer">
                          Estimated expert engineering hours saved this run.
                        </div>
                      </div>
                    </div>

                    {/* Central Grid Layout: Left SVG Chart, Right Cognitive Budget Controls */}
                    <div className="central-grid">
                      
                      {/* Left: SVG Cost Chart */}
                      <div className="glass-card chart-card">
                        <div className="chart-card-header">
                          <h3>Cost Analysis: Simulation vs Manual Rework</h3>
                          <p className="subtitle">Predicted cumulative expenditures over 30-day window</p>
                        </div>
                        <CostChart projectCrr={activeProjectData.telemetry.crr} />
                      </div>

                      {/* Right: Cognitive Budget Controls */}
                      <div className="glass-card controls-card">
                        <div className="controls-header">
                          <h3>Cognitive Budget Controls</h3>
                          {limitsEnforced && (
                            <span className="limits-status-badge secured">
                              <span className="material-symbols-outlined icon-small">lock</span>
                              SECURED
                            </span>
                          )}
                        </div>
                        
                        <div className="control-slider-group">
                          <div className="slider-label-row">
                            <span className="slider-title">QA Agent Limit</span>
                            <span className="slider-value-badge">{qaLimit.toFixed(1)}M tokens</span>
                          </div>
                          <input 
                            type="range" 
                            min="1.0" 
                            max="10.0" 
                            step="0.5" 
                            value={qaLimit} 
                            onChange={(e) => setQaLimit(parseFloat(e.target.value))}
                            disabled={limitsEnforced}
                            className="budget-slider"
                          />
                          <p className="slider-help-text">Sets maximum validation budget. Scales 3D simulation particle count.</p>
                        </div>

                        <div className="control-slider-group">
                          <div className="slider-label-row">
                            <span className="slider-title">Art/Opponent Agent Limit</span>
                            <span className="slider-value-badge">{opponentLimit.toFixed(1)}M tokens</span>
                          </div>
                          <input 
                            type="range" 
                            min="0.1" 
                            max="2.0" 
                            step="0.1" 
                            value={opponentLimit} 
                            onChange={(e) => setOpponentLimit(parseFloat(e.target.value))}
                            disabled={limitsEnforced}
                            className="budget-slider"
                          />
                          <p className="slider-help-text">Alters opponent search depth. Regulates verification agent floating speeds.</p>
                        </div>

                        <button 
                          className={`enforce-btn ${limitsEnforced ? 'enforced' : ''}`}
                          onClick={() => setLimitsEnforced(!limitsEnforced)}
                        >
                          <span className="material-symbols-outlined btn-lock-icon">
                            {limitsEnforced ? 'lock_open' : 'lock'}
                          </span>
                          {limitsEnforced ? 'Unlock Controls' : 'Enforce Limits'}
                        </button>
                      </div>

                    </div>

                    {/* Project Completion Prediction & Causal Triage */}
                    <div className="glass-card prediction-triage-card" style={{ gridColumn: '1 / -1', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '1rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            Project Completion Prediction & Causal Triage
                          </h3>
                          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-sub)' }}>
                            Closed-loop simulation forecasting and corrective path optimizations
                          </p>
                        </div>
                        <span className={`status-pill ${activeProjectData.telemetry.crr >= 1.0 ? 'completed' : 'failed'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '6px 16px', borderRadius: '12px', fontWeight: 700 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                            {activeProjectData.telemetry.crr >= 1.0 ? 'check_circle' : 'warning'}
                          </span>
                          {activeProjectData.telemetry.crr >= 1.0 ? 'ON TRACK (92% Probability)' : 'AT RISK OF DELAY (48% Probability)'}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginTop: '8px' }}>
                        {/* Column 1: Prediction Detail */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Delivery Forecast
                          </div>
                          {activeProjectData.telemetry.crr >= 1.0 ? (
                            <>
                              <div style={{ fontSize: '2.5rem', fontWeight: 850, color: 'var(--success)', fontFamily: 'var(--mono-font)', lineHeight: 1 }}>92%</div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>Predicted Completion: On Time</div>
                              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-sub)', lineHeight: 1.4 }}>
                                Causal simulation confirms high probability of integration convergence. No circular dependency loops or critical-severity bottlenecks are currently predicted to delay the target release date.
                              </p>
                            </>
                          ) : (
                            <>
                              <div style={{ fontSize: '2.5rem', fontWeight: 850, color: 'var(--error)', fontFamily: 'var(--mono-font)', lineHeight: 1 }}>48%</div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>Predicted Completion: Delayed (5d)</div>
                              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-sub)', lineHeight: 1.4 }}>
                                Grounding prediction error and low Compute-to-Rework Ratio indicate high risk of integration failure. Cascading dependencies in pull request merges threaten delivery milestones.
                              </p>
                            </>
                          )}
                        </div>

                        {/* Column 2: Corrective Action Recommendations */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Recommended Corrective Action Plan
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {activeProjectData.telemetry.crr >= 1.0 ? (
                              <>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'rgba(46, 160, 67, 0.04)', border: '1px solid rgba(46, 160, 67, 0.12)', padding: '12px', borderRadius: '10px' }}>
                                  <span className="material-symbols-outlined" style={{ color: 'var(--success)', fontSize: '1.3rem' }}>lock</span>
                                  <div>
                                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>Maintain Current Cognitive Limits</strong>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-sub)' }}>The active QA Agent Token Limit of {qaLimit}M and Opponent Agent Limit of {opponentLimit}M are perfectly scaled for the current complexity. Keep limits enforced to stay within budget.</p>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'rgba(68, 80, 183, 0.04)', border: '1px solid rgba(68, 80, 183, 0.12)', padding: '12px', borderRadius: '10px' }}>
                                  <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '1.3rem' }}>playlist_add_check</span>
                                  <div>
                                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>Continuous Merging Schedule</strong>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-sub)' }}>Proceed with approval of pending PRs. The digital twin predicts zero circular lockouts or regression conflicts from the current queue.</p>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'rgba(255, 118, 118, 0.05)', border: '1px solid rgba(255, 118, 118, 0.15)', padding: '12px', borderRadius: '10px' }}>
                                  <span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: '1.3rem' }}>group_add</span>
                                  <div>
                                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>1. Reallocate Developer to Core Bottlenecks</strong>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-sub)' }}>Move 1 senior engineer to resolve the active dependency bottlenecks (e.g. database schema alignment or authentication API slow path). <span style={{ color: 'var(--success)', fontWeight: 600 }}>Recovers 4.8 hrs rework, raises completion probability to 68%.</span></p>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'rgba(255, 215, 0, 0.05)', border: '1px solid rgba(255, 215, 0, 0.18)', padding: '12px', borderRadius: '10px' }}>
                                  <span className="material-symbols-outlined" style={{ color: '#b89200', fontSize: '1.3rem' }}>speed</span>
                                  <div>
                                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>2. Adjust Cognitive Token Budget Limits</strong>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-sub)' }}>Increase the <strong>QA Agent Limit</strong> from {qaLimit}M to at least <strong>6.5M tokens</strong>. Expanding the search space allows the simulation engine to generate safer, more comprehensive resolution strategies.</p>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'rgba(68, 80, 183, 0.04)', border: '1px solid rgba(68, 80, 183, 0.12)', padding: '12px', borderRadius: '10px' }}>
                                  <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '1.3rem' }}>pause_circle</span>
                                  <div>
                                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>3. Defer High-Risk Integrations</strong>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-sub)' }}>Pause merging of large PRs with active collisions (e.g., modular refactors) until downstream dependency layers are validated and stabilized.</p>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Bento Grid Section */}
                    <div className="bento-grid">
                      
                      {/* Bento Card 1: Active Scenario */}
                      <div className="glass-card bento-card active-scenario-card">
                        <h3>Active Scenario</h3>
                        <p className="scenario-name">Scenario {selectedProject.includes('custom') ? 'Custom Ingestion' : selectedProject === 'proj-live' ? 'Live Ingestion' : 'Sandbox v4.1'}</p>
                        <div className="scenario-run">
                          <span className="run-dot active"></span>
                          <span className="run-id">Run ID: #{selectedProject.includes('custom') ? 'CUST-SYNC' : selectedProject === 'proj-live' ? 'WS-LIVE' : '99841'}</span>
                        </div>
                        <div className="avatar-group">
                          <div className="avatar-circle" style={{ backgroundColor: '#5e6ad2' }}>L</div>
                          <div className="avatar-circle" style={{ backgroundColor: '#2ea043' }}>D</div>
                          <div className="avatar-circle" style={{ backgroundColor: '#e65f00' }}>S</div>
                          <span className="avatar-label">+3 agents</span>
                        </div>
                        <p className="scenario-desc">Simulating PR validation & edge case coverage automatically.</p>
                      </div>

                      {/* Bento Card 2: Infrastructure Uptime */}
                      <div className="glass-card bento-card uptime-card">
                        <h3>Infrastructure Uptime</h3>
                        <div className="uptime-value-row">
                          <span className="uptime-val">99.9%</span>
                          <span className="uptime-status">
                            <span className="pulse-dot"></span>
                            Operational
                          </span>
                        </div>
                        <div className="server-grid">
                          {Array.from({ length: 24 }).map((_, i) => (
                            <div key={i} className="server-dot healthy" title={`Node ${i+1}: Active`}></div>
                          ))}
                        </div>
                        <p className="uptime-desc">All cluster nodes verified and responsive.</p>
                      </div>

                      {/* Bento Card 3: Risk Level */}
                      <div className="glass-card bento-card risk-card">
                        <h3>System Integration Risk</h3>
                        <div className="risk-content">
                          <div className={`risk-glow-indicator ${activeProjectData.telemetry.crr >= 1.0 ? 'low' : 'high'}`}>
                            {activeProjectData.telemetry.crr >= 1.0 ? 'LOW' : 'CRITICAL'}
                          </div>
                          <div className="risk-meta">
                            <span className="risk-title">
                              {activeProjectData.telemetry.crr >= 1.0 ? 'Stable Convergence' : 'Rework Spillover'}
                            </span>
                            <p className="risk-desc-text">
                              {activeProjectData.telemetry.crr >= 1.0 
                                ? 'Model confirms clean integration pathway with no circular dependency chains.' 
                                : 'Critical N+1 queries or layout regressions threaten target delivery deadlines.'}
                            </p>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Project details list below (PRs, Issues, Approvals, Event Log) */}
                    <div className="standard-bottom-panels">
                      
                      {/* Risks & Bottlenecks */}
                      <div className="glass-card panel-item flex-col">
                        <h3>Predicted Risks & Bottlenecks</h3>
                        <p className="panel-subtitle">Causal Digital Twin Counterfactual Predictions</p>
                        <div className="risks-list">
                          {activeProjectData.risks.length > 0 ? (
                            activeProjectData.risks.map((risk, idx) => (
                              <div key={idx} className={`risk-item ${risk.severity}`}>
                                <div className="risk-header">
                                  <span className="badge">{risk.probability}% PROBABILITY</span>
                                </div>
                                <p><strong>{risk.title}</strong></p>
                                <p className="risk-desc">{risk.desc}</p>
                              </div>
                            ))
                          ) : (
                            <div className="empty-state">No integration risks predicted.</div>
                          )}
                        </div>
                      </div>

                      {/* Action Required & Events */}
                      <div className="glass-card panel-item flex-col">
                        <h3>Action Required & Events</h3>
                        <div className="action-required">
                          <h4>Pending Approvals</h4>
                          {activeProjectData.approvals.length > 0 ? (
                            activeProjectData.approvals.map((approval, idx) => (
                              <div key={idx} className="approval-card">
                                <p><strong>{approval.title}</strong></p>
                                <div className="btn-group">
                                  <button className="approve-btn">Approve</button>
                                  <button className="veto-btn relative-tooltip">
                                    Veto
                                    <span className="tooltip-text">Veto rejects the merge proposal and updates AI critic rewards to search for safe alternatives.</span>
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="empty-state-text">No approvals pending.</div>
                          )}
                        </div>

                        <div className="event-stream-section mt-auto">
                          <h4>Causal Event Log</h4>
                          <div className="event-rows-container">
                            {activeProjectData.events.map((evt, idx) => (
                              <div key={idx} className="event-row">
                                <span className={`badge ${evt.type}`}>{evt.type}</span>
                                <span className="event-text">{evt.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                    </div>
                  </>
                )}

                {/* 2. SCENARIOS TAB VIEW */}
                {currentTab === 'scenarios' && (
                  <div className="tab-container flex-col animate-fade-in">
                    <div className="tab-header-row">
                      <div>
                        <h2>Scenario Modeling & Sandbox Runs</h2>
                        <p className="tab-subtitle">Trigger counterfactual pipeline sandboxes to audit code integrations</p>
                      </div>
                      <button 
                        className="action-trigger-btn"
                        onClick={handleTriggerScenario}
                        disabled={activeSimId !== null}
                      >
                        <span className="material-symbols-outlined">play_circle</span>
                        {activeSimId ? 'Running Sandbox...' : 'Trigger New Simulation Sandbox'}
                      </button>
                    </div>

                    {activeSimId && (
                      <div className="glass-card active-simulation-alert">
                        <div className="sim-loading-row">
                          <div className="sync-spinner"></div>
                          <div>
                            <strong>Active Simulation Running: {activeSimId}</strong>
                            <p>Orchestrator invoking Worker and critic agents to construct Merkle chains...</p>
                          </div>
                        </div>
                        <div className="sim-progress-bar-container">
                          <div className="sim-progress-bar-fill"></div>
                        </div>
                      </div>
                    )}

                    <div className="glass-card">
                      <h3>Simulation Execution Log</h3>
                      <table className="scenario-table">
                        <thead>
                          <tr>
                            <th>Run ID</th>
                            <th>Scenario Title</th>
                            <th>Status</th>
                            <th>QA Limit</th>
                            <th>Opponent Limit</th>
                            <th>Conflicts Detected</th>
                            <th>Execution Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(runs[selectedProject] || []).length > 0 ? (
                            (runs[selectedProject] || []).map((run) => (
                              <tr key={run.id}>
                                <td className="run-id-col">{run.id}</td>
                                <td><strong>{run.scenarioName}</strong></td>
                                <td>
                                  <span className={`status-pill ${run.status.toLowerCase()}`}>
                                    {run.status === 'Running' && <span className="pulse-dot-small"></span>}
                                    {run.status}
                                  </span>
                                </td>
                                <td className="mono-col">{run.qaLimit.toFixed(1)}M</td>
                                <td className="mono-col">{run.opponentLimit.toFixed(1)}M</td>
                                <td>
                                  <span className={`conflict-badge ${run.conflicts > 0 ? 'alert' : 'clean'}`}>
                                    {run.conflicts} conflicts
                                  </span>
                                </td>
                                <td className="time-col">{run.timestamp}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="table-empty">
                                No simulation sandboxes executed for this project yet. Click the trigger button above to initialize.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. CRR ANALYSIS TAB VIEW */}
                {currentTab === 'crr' && (
                  <div className="tab-container flex-col animate-fade-in">
                    <div className="tab-header-row">
                      <div>
                        <h2>CRR (Compute-to-Rework Ratio) Cost Audits</h2>
                        <p className="tab-subtitle">Analyze automated agent execution costs against avoided developer rework overheads</p>
                      </div>
                    </div>

                    <div className="crr-analysis-grid">
                      {/* Cost Ledger Card */}
                      <div className="glass-card cost-ledger-card">
                        <h3>Compute Cost & Savings Ledger</h3>
                        <div className="cost-ledger-row">
                          <span className="ledger-label">Worker Agent Ingestion Cost:</span>
                          <span className="ledger-val mono-col">${(qaLimit * 14.4).toFixed(2)}</span>
                        </div>
                        <div className="cost-ledger-row">
                          <span className="ledger-label">Critic Agent Verification Cost:</span>
                          <span className="ledger-val mono-col">${(qaLimit * 6.3).toFixed(2)}</span>
                        </div>
                        <div className="cost-ledger-row">
                          <span className="ledger-label">Opponent Agent Conflict Cost:</span>
                          <span className="ledger-val mono-col">${(opponentLimit * 12.0).toFixed(2)}</span>
                        </div>
                        <hr className="ledger-hr" />
                        <div className="cost-ledger-row total-row">
                          <span className="ledger-label">Total AI Simulation Cost:</span>
                          <span className="ledger-val mono-col">${(qaLimit * 20.7 + opponentLimit * 12.0).toFixed(2)}</span>
                        </div>
                        <div className="cost-ledger-row savings-row">
                          <span className="ledger-label">Estimated Developer Rework Savings:</span>
                          <span className="ledger-val mono-col">+${(hoursSaved * 75).toFixed(2)}</span>
                        </div>
                        <div className="cost-ledger-row net-row">
                          <span className="ledger-label">Net Strategic Value Generated:</span>
                          <span className={`ledger-val mono-col ${(hoursSaved * 75 - (qaLimit * 20.7 + opponentLimit * 12.0)) >= 0 ? 'positive' : 'negative'}`}>
                            ${(hoursSaved * 75 - (qaLimit * 20.7 + opponentLimit * 12.0)).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Agent Breakdown Table */}
                      <div className="glass-card agent-allocation-card">
                        <h3>Agent Capacity Allocation</h3>
                        <table className="agent-breakdown-table">
                          <thead>
                            <tr>
                              <th>Agent Role</th>
                              <th>Token Alloc.</th>
                              <th>Calculated Price</th>
                              <th>Priority</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td><strong>Worker Agent</strong></td>
                              <td className="mono-col">{(qaLimit * 0.7).toFixed(1)}M</td>
                              <td className="mono-col">$0.075 / M</td>
                              <td>High</td>
                              <td><span className="status-pill completed">Active</span></td>
                            </tr>
                            <tr>
                              <td><strong>Critic Agent</strong></td>
                              <td className="mono-col">{(qaLimit * 0.3).toFixed(1)}M</td>
                              <td className="mono-col">$0.150 / M</td>
                              <td>Medium</td>
                              <td><span className="status-pill completed">Active</span></td>
                            </tr>
                            <tr>
                              <td><strong>Opponent Agent</strong></td>
                              <td className="mono-col">{opponentLimit.toFixed(1)}M</td>
                              <td className="mono-col">$0.250 / M</td>
                              <td>Critical</td>
                              <td><span className="status-pill completed">Active</span></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="glass-card optimization-tips-card">
                      <h3>
                        <span className="material-symbols-outlined lightbulb-icon">lightbulb</span>
                        Automated Strategist Recommendations
                      </h3>
                      {activeProjectData.telemetry.crr >= 1.0 ? (
                        <div className="recommendation-box safe">
                          <strong>OPTIMAL STABILITY DETECTED</strong>
                          <p>The Compute-to-Rework Ratio is currently <strong>{activeProjectData.telemetry.crr.toFixed(2)}x</strong>. Simulation verification is successfully preventing regressions. Keep current Cognitive limits in place to preserve economic convergence.</p>
                        </div>
                      ) : (
                        <div className="recommendation-box risk">
                          <strong>CRITICAL DEBT SPILLOVER DETECTED</strong>
                          <p>The Compute-to-Rework Ratio is <strong>{activeProjectData.telemetry.crr.toFixed(2)}x</strong> (Below target 1.0x). Rework costs are outpacing simulation efficiency. <strong>Action Recommended:</strong> Increase the <strong>QA Agent Limit</strong> to at least <strong>6.5M tokens</strong> to expand sandbox coverage and resolve circular queries.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. TOKEN INGESTION TAB VIEW */}
                {currentTab === 'tokens' && (
                  <div className="tab-container flex-col animate-fade-in">
                    <div className="tab-header-row">
                      <div>
                        <h2>Token Ingestion Pipeline Logs</h2>
                        <p className="tab-subtitle">Monitor incoming webhooks, commits, and manual synchronizations</p>
                      </div>
                      <button 
                        className="action-trigger-btn"
                        onClick={handleTriggerSync}
                        disabled={isSyncing}
                      >
                        <span className="material-symbols-outlined btn-sync-icon">
                          {isSyncing ? 'sync' : 'cached'}
                        </span>
                        {isSyncing ? 'Syncing...' : 'Trigger Telemetry Ingestion'}
                      </button>
                    </div>

                    {isSyncing && (
                      <div className="glass-card active-sync-alert">
                        <div className="sync-spinner-row">
                          <div className="spinner-circle"></div>
                          <div>
                            <strong>Fetching latest pipeline commits...</strong>
                            <p>Polling FastAPI WebSocket repository listener for delta logs...</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="glass-card">
                      <h3>Ingestion Event Streams</h3>
                      <div className="ingestion-timeline">
                        {(ingestionEvents[selectedProject] || []).length > 0 ? (
                          (ingestionEvents[selectedProject] || []).map((evt) => (
                            <div key={evt.id} className="timeline-item-row">
                              <div className="timeline-left">
                                <span className={`badge ${evt.type}`}>{evt.type}</span>
                              </div>
                              <div className="timeline-center">
                                <span className="timeline-text">{evt.text}</span>
                              </div>
                              <div className="timeline-right">
                                <span className="timeline-time">{evt.time}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="empty-state">No ingestion streams logged for this project.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. SETTINGS TAB VIEW */}
                {currentTab === 'settings' && (
                  <div className="tab-container flex-col animate-fade-in">
                    <div className="tab-header-row">
                      <div>
                        <h2>System settings & default configurations</h2>
                        <p className="tab-subtitle">Configure orchestrator models, Consensus thresholds, and alert destinations</p>
                      </div>
                    </div>

                    <div className="glass-card settings-card-form">
                      <form onSubmit={handleSaveSettings} className="settings-form">
                        
                        <div className="form-group-row">
                          <label className="form-label">
                            <strong>Agent Consensus Threshold</strong>
                            <span className="label-description">Minimum consensus required by Critic Agents to approve proposals.</span>
                          </label>
                          <div className="form-input-control">
                            <div className="threshold-slider-row">
                              <input 
                                type="range" 
                                min="50" 
                                max="100" 
                                step="5" 
                                value={consensusThreshold} 
                                onChange={(e) => setConsensusThreshold(parseInt(e.target.value))}
                                className="settings-slider"
                              />
                              <span className="threshold-val">{consensusThreshold}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="form-group-row">
                          <label className="form-label">
                            <strong>Default LLM Core Model</strong>
                            <span className="label-description">Primary model invoked by Worker and Critic Agents during runs.</span>
                          </label>
                          <div className="form-input-control">
                            <select 
                              value={defaultModel} 
                              onChange={(e) => setDefaultModel(e.target.value)}
                              className="settings-select"
                            >
                              <option value="Gemini 2.5 Pro">Gemini 2.5 Pro (Recommended)</option>
                              <option value="Gemini 2.5 Flash">Gemini 2.5 Flash</option>
                              <option value="Gemini 1.5 Pro">Gemini 1.5 Pro</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group-row">
                          <label className="form-label">
                            <strong>Sandbox Retention Policy</strong>
                            <span className="label-description">Lifespan duration of counterfactual branch nodes before auto-purging.</span>
                          </label>
                          <div className="form-input-control">
                            <select 
                              value={retentionPolicy} 
                              onChange={(e) => setRetentionPolicy(e.target.value)}
                              className="settings-select"
                            >
                              <option value="24 hours">24 Hours</option>
                              <option value="7 days">7 Days</option>
                              <option value="30 days">30 Days</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group-row">
                          <label className="form-label">
                            <strong>Notification Destinations</strong>
                            <span className="label-description">Deliver alert reports and merge approvals on these channels.</span>
                          </label>
                          <div className="form-input-control checkbox-column">
                            <label className="checkbox-label">
                              <input 
                                type="checkbox" 
                                checked={alertChannels.email} 
                                onChange={(e) => setAlertChannels(prev => ({ ...prev, email: e.target.checked }))} 
                              />
                              <span>Email notifications</span>
                            </label>
                            <label className="checkbox-label">
                              <input 
                                type="checkbox" 
                                checked={alertChannels.webhook} 
                                onChange={(e) => setAlertChannels(prev => ({ ...prev, webhook: e.target.checked }))} 
                              />
                              <span>REST Webhook Endpoint</span>
                            </label>
                            <label className="checkbox-label">
                              <input 
                                type="checkbox" 
                                checked={alertChannels.slack} 
                                onChange={(e) => setAlertChannels(prev => ({ ...prev, slack: e.target.checked }))} 
                              />
                              <span>Slack Ingestion Alerts</span>
                            </label>
                          </div>
                        </div>

                        <div className="form-submit-row">
                          <button 
                            type="submit" 
                            className={`settings-save-btn ${saveStatus}`}
                            disabled={saveStatus !== 'idle'}
                          >
                            <span className="material-symbols-outlined">
                              {saveStatus === 'saved' ? 'check_circle' : 'save'}
                            </span>
                            {saveStatus === 'idle' && 'Save System Configuration'}
                            {saveStatus === 'saving' && 'Saving...'}
                            {saveStatus === 'saved' && 'Configuration Saved!'}
                          </button>
                        </div>

                      </form>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              // Zen Mode overlay: Miniature floating HUDs over 3D coordinates space
              <div className="zen-hud-overlay">
                
                {/* Top Left: Workspace Overview HUD */}
                <div className="glass-card hud-card workspace-hud animate-hud-left">
                  <div className="hud-header">
                    <span className="material-symbols-outlined">analytics</span>
                    <h3>Workspace Overview</h3>
                  </div>
                  <p className="hud-project-title"><strong>{activeProjectData.name}</strong></p>
                  <div className="hud-metric-row">
                    <div>
                      <span className="hud-val">{activeProjectData.telemetry.prs}</span>
                      <span className="hud-lbl">PRs Nodes</span>
                    </div>
                    <div>
                      <span className="hud-val">{activeProjectData.telemetry.issues}</span>
                      <span className="hud-lbl">Issues Nodes</span>
                    </div>
                  </div>
                </div>

                {/* Top Right: Causal Efficiency HUD */}
                <div className="glass-card hud-card efficiency-hud animate-hud-right">
                  <div className="hud-header">
                    <span className="material-symbols-outlined">speed</span>
                    <h3>Causal Efficiency</h3>
                  </div>
                  <div className="metric-value">{activeProjectData.telemetry.crr.toFixed(2)}x</div>
                  <div className="metric-sub">
                    Sim Status: <strong className={activeProjectData.telemetry.crr >= 1.0 ? 'status-green' : 'status-red'}>
                      {activeProjectData.telemetry.crr >= 1.0 ? 'Optimal' : 'Debt Warning'}
                    </strong>
                  </div>
                </div>

                {/* Bottom Right: Cognitive Budget Controls HUD */}
                <div className="glass-card hud-card budget-hud animate-hud-bottom">
                  <div className="hud-header">
                    <h3>Cognitive Budget HUD</h3>
                    {limitsEnforced && (
                      <span className="limits-status-badge secured">
                        <span className="material-symbols-outlined icon-small">lock</span>
                        SECURED
                      </span>
                    )}
                  </div>
                  
                  <div className="control-slider-group">
                    <div className="slider-label-row">
                      <span className="slider-title">QA Agent Limit</span>
                      <span className="slider-value-badge">{qaLimit.toFixed(1)}M</span>
                    </div>
                    <input 
                      type="range" 
                      min="1.0" 
                      max="10.0" 
                      step="0.5" 
                      value={qaLimit} 
                      onChange={(e) => setQaLimit(parseFloat(e.target.value))}
                      disabled={limitsEnforced}
                      className="budget-slider"
                    />
                  </div>

                  <div className="control-slider-group">
                    <div className="slider-label-row">
                      <span className="slider-title">Opponent Agent Limit</span>
                      <span className="slider-value-badge">{opponentLimit.toFixed(1)}M</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.1" 
                      max="2.0" 
                      step="0.1" 
                      value={opponentLimit} 
                      onChange={(e) => setOpponentLimit(parseFloat(e.target.value))}
                      disabled={limitsEnforced}
                      className="budget-slider"
                    />
                  </div>

                  <button 
                    className={`enforce-btn ${limitsEnforced ? 'enforced' : ''}`}
                    onClick={() => setLimitsEnforced(!limitsEnforced)}
                  >
                    <span className="material-symbols-outlined">
                      {limitsEnforced ? 'lock_open' : 'lock'}
                    </span>
                    {limitsEnforced ? 'Unlock' : 'Enforce Limits'}
                  </button>
                </div>

              </div>
            )}
          </div>

          {/* ==========================================================================
             Connect Workspace Modal Overlay
             ========================================================================== */}
          {showConnectModal && (
            <div className="modal-overlay">
              <div className="glass-card modal-card animate-fade-in">
                
                <div className="modal-header">
                  <h3>
                    <span className="material-symbols-outlined">add_circle</span>
                    Connect New Project Workspace
                  </h3>
                  <button className="close-modal-btn" onClick={() => setShowConnectModal(false)} disabled={isConnecting}>
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="modal-tabs">
                  <button 
                    className={`modal-tab-btn ${connectModalTab === 'file' ? 'active' : ''}`}
                    onClick={() => setConnectModalTab('file')}
                    disabled={isConnecting}
                  >
                    <span className="material-symbols-outlined">table_view</span>
                    File Ingestion (Excel/CSV)
                  </button>
                  <button 
                    className={`modal-tab-btn ${connectModalTab === 'api' ? 'active' : ''}`}
                    onClick={() => setConnectModalTab('api')}
                    disabled={isConnecting}
                  >
                    <span className="material-symbols-outlined">api</span>
                    Jira / Linear Link
                  </button>
                </div>

                <div className="modal-body">
                  {connectModalTab === 'file' ? (
                    <div className="modal-form animate-fade-in">
                      <div className="file-uploader-box">
                        <span className="material-symbols-outlined cloud-icon">cloud_upload</span>
                        <p>Drag and drop your spreadsheet (.xlsx, .csv) here, or click to browse</p>
                        <input 
                          type="file" 
                          className="file-hidden-input" 
                          accept=".xlsx,.xls,.csv"
                          disabled={isConnecting}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setSpreadsheetName(e.target.files[0].name);
                            }
                          }}
                        />
                        {spreadsheetName && (
                          <div className="file-selected-badge animate-fade-in">
                            <span className="material-symbols-outlined file-badge-icon">insert_drive_file</span>
                            <span>{spreadsheetName}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="form-input-row-vertical">
                        <label><strong>Google Sheets Link (Optional)</strong></label>
                        <input 
                          type="text" 
                          placeholder="https://docs.google.com/spreadsheets/d/..." 
                          className="modal-text-input"
                          value={sheetsLink}
                          onChange={(e) => setSheetsLink(e.target.value)}
                          disabled={isConnecting || spreadsheetName !== ''}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="modal-form animate-fade-in">
                      <div className="form-input-row-vertical">
                        <label><strong>Select Platform</strong></label>
                        <select 
                          value={selectedApiPlatform} 
                          onChange={(e) => setSelectedApiPlatform(e.target.value as 'jira' | 'linear')}
                          className="modal-select-input"
                          disabled={isConnecting}
                        >
                          <option value="jira">Jira Software API</option>
                          <option value="linear">Linear App API</option>
                        </select>
                      </div>

                      <div className="form-input-row-vertical">
                        <label><strong>Workspace Connection URL</strong></label>
                        <input 
                          type="text" 
                          placeholder={selectedApiPlatform === 'jira' ? 'https://company.atlassian.net/projects/PWM' : 'https://linear.app/workspace/pwm'} 
                          className="modal-text-input"
                          value={apiLink}
                          onChange={(e) => setApiLink(e.target.value)}
                          disabled={isConnecting}
                        />
                      </div>

                      <div className="form-input-row-vertical">
                        <label><strong>Personal Access Token</strong></label>
                        <input 
                          type="password" 
                          placeholder="••••••••••••••••••••••••••••••••" 
                          className="modal-text-input"
                          value={apiToken}
                          onChange={(e) => setApiToken(e.target.value)}
                          disabled={isConnecting}
                        />
                      </div>
                    </div>
                  )}

                  {isConnecting && (
                    <div className="connection-progress-logs animate-fade-in">
                      <div className="logs-header-spinner-row">
                        <div className="sync-spinner"></div>
                        <span>Synchronizing Causal Graph...</span>
                      </div>
                      <div className="logs-timeline-container">
                        {connectLogs.map((log, idx) => (
                          <div key={idx} className="log-line-item animate-fade-in">
                            <span className="material-symbols-outlined check-icon">check_circle</span>
                            <span>{log}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button 
                    className="cancel-modal-btn" 
                    onClick={() => setShowConnectModal(false)}
                    disabled={isConnecting}
                  >
                    Cancel
                  </button>
                  <button 
                    className="submit-modal-btn"
                    onClick={handleSyncWorkspaceClick}
                    disabled={isConnecting || (connectModalTab === 'file' && !spreadsheetName && !sheetsLink) || (connectModalTab === 'api' && (!apiLink || !apiToken))}
                  >
                    {isConnecting ? 'Synchronizing...' : 'Connect & Sync'}
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default App;
