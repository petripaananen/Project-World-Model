// Copyright 2026 Petri Paananen
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { useEffect, useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Sparkles, Environment, ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';
import './App.css';
import { GameGardenScene } from './spark/GameGardenScene';
import { KanbanBoard } from './components/KanbanBoard';
import { SprintDashboard } from './components/SprintDashboard';
import { StakeholderMap } from './components/StakeholderMap';
import { FlowMetrics } from './components/FlowMetrics';
import { ProjectLifecycle } from './components/ProjectLifecycle';

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
  cycle?: {
    phase: string;
    title: string;
    description: string;
    local_time: string;
    timezone: string;
  };
  calibration?: {
    factor: number;
    history: Array<{
      timestamp: string;
      error: number;
      calibration_factor: number;
    }>;
  };
  debt_report?: {
    generated_at: string;
    repo: string;
    total_debt_items: number;
    total_estimated_rework_hours: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    conflicts: Array<{
      conflict_type: string;
      severity: string;
      description: string;
      affected_files: string[];
      involved_prs: number[];
      involved_branches: string[];
      involved_issues: string[];
      estimated_rework_hours: number;
      causal_evidence?: {
        probability: number;
        confidence: number;
        counterfactual: string;
        causal_chain: string[];
        impact_distribution: Record<string, number>;
      };
    }>;
  };
  proposals?: any[];
  verdicts?: any[];
  human_approved?: boolean;
  human_notes?: string;
  events?: Array<{
    event_type: string;
    actor: string;
    summary: string;
    timestamp: string;
    details?: any;
  }>;
  sprint_state?: any;
}

interface ProjectData {
  id: string;
  name: string;
  telemetry: {
    prs: number;
    issues: number;
    agents: number;
    crr: number;
    sprintVelocity?: number;
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
    telemetry: { prs: 3, issues: 5, agents: 3, crr: 1.45, sprintVelocity: 85 },
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
        { id: 'a-pr1', type: 'pr', name: 'PR #204: Design System Migration', attributes: { status: 'Under Review', author: 'Lara', epic: 'Epic: UI Redesign', storyPoints: 5, commentCount: 3 } },
        { id: 'a-pr2', type: 'pr', name: 'PR #205: Update Nav Bar', attributes: { status: 'Draft', author: 'Dan', epic: 'Epic: UI Redesign', storyPoints: 3, commentCount: 1 } },
        { id: 'a-pr3', type: 'pr', name: 'PR #206: Lazy Load Images', attributes: { status: 'Approved', author: 'Sarah', epic: 'Epic: Performance Optimization', storyPoints: 2, commentCount: 4 } },
        { id: 'a-is1', type: 'issue', name: 'Issue #55: Button Alignment Broken', attributes: { status: 'Active', author: 'Alex', epic: 'Epic: UI Redesign', priority: 'High', storyPoints: 5, component: 'Frontend', dueDaysRemaining: 2, commentCount: 6, subTasks: [{ name: 'Fix padding', status: 'Done' }, { name: 'Update tokens', status: 'In Progress' }] } },
        { id: 'a-is2', type: 'issue', name: 'Issue #56: Mobile Menu Layout', attributes: { status: 'Active', author: 'Alex', epic: 'Epic: UI Redesign', priority: 'Medium', storyPoints: 3, component: 'Frontend', dueDaysRemaining: 5, commentCount: 2, flagged: true, subTasks: [{ name: 'Design mockup', status: 'Done' }, { name: 'Write media queries', status: 'In Progress' }] } },
        { id: 'a-is3', type: 'issue', name: 'Issue #57: Font Loading Flash', attributes: { status: 'Backlog', author: 'Sarah', epic: 'Epic: Performance Optimization', priority: 'Low', storyPoints: 1, component: 'Frontend', dueDaysRemaining: 15, commentCount: 0 } },
        { id: 'a-is4', type: 'issue', name: 'Issue #58: Tab Accessibility', attributes: { status: 'Active', author: 'Dan', epic: 'Epic: UI Redesign', priority: 'Medium', storyPoints: 3, component: 'Frontend', dueDaysRemaining: 1, commentCount: 4 } },
        { id: 'a-is5', type: 'issue', name: 'Issue #59: Redundant CSS Selectors', attributes: { status: 'Active', author: 'Lara', epic: 'Epic: Technical Debt Clean', priority: 'Low', storyPoints: 2, component: 'Frontend', dueDaysRemaining: -1, commentCount: 1 } }
      ],
      edges: [
        { id: 'e-a1', source: 'a-is1', target: 'a-is2', type: 'blocks' }
      ]
    }
  },
  'proj-beta': {
    id: 'proj-beta',
    name: 'Project Beta (Backend API)',
    telemetry: { prs: 6, issues: 8, agents: 3, crr: 0.72, sprintVelocity: 40 },
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
        { id: 'b-pr1', type: 'pr', name: 'PR #411: Redis Cache Integration', attributes: { status: 'Under Review', author: 'Mikael', epic: 'Epic: Cache Infrastructure', storyPoints: 8, commentCount: 5 } },
        { id: 'b-pr2', type: 'pr', name: 'PR #412: Database Indexing', attributes: { status: 'Approved', author: 'John', epic: 'Epic: Cache Infrastructure', storyPoints: 3, commentCount: 2 } },
        { id: 'b-pr3', type: 'pr', name: 'PR #413: Refactor Session Auth', attributes: { status: 'Draft', author: 'Mikael', epic: 'Epic: Security Audit', storyPoints: 5, commentCount: 0 } },
        { id: 'b-pr4', type: 'pr', name: 'PR #414: Rate Limiter Settings', attributes: { status: 'Under Review', author: 'Elena', epic: 'Epic: Security Audit', storyPoints: 3, commentCount: 4 } },
        { id: 'b-pr5', type: 'pr', name: 'PR #415: Fix CORS Settings', attributes: { status: 'Draft', author: 'Elena', epic: 'Epic: Security Audit', storyPoints: 1, commentCount: 1 } },
        { id: 'b-pr6', type: 'pr', name: 'PR #416: Update Stripe SDK', attributes: { status: 'Under Review', author: 'John', epic: 'Epic: Stripe Billing integration', storyPoints: 5, commentCount: 3 } },
        { id: 'b-is1', type: 'issue', name: 'Issue #112: Auth Latency Spike', attributes: { status: 'Active', author: 'Elena', epic: 'Epic: Security Audit', priority: 'High', storyPoints: 8, component: 'Backend', dueDaysRemaining: 1, commentCount: 10, flagged: true, subTasks: [{ name: 'Audit JWT validation', status: 'Done' }, { name: 'Optimize DB query', status: 'In Progress' }] } },
        { id: 'b-is2', type: 'issue', name: 'Issue #113: DB Connection Pool Exhaustion', attributes: { status: 'Active', author: 'John', epic: 'Epic: Cache Infrastructure', priority: 'High', storyPoints: 5, component: 'Database', dueDaysRemaining: 3, commentCount: 7, subTasks: [{ name: 'Increase pool size', status: 'Done' }, { name: 'Fix leak in transaction', status: 'In Progress' }] } },
        { id: 'b-is3', type: 'issue', name: 'Issue #114: Rate Limit Bypass', attributes: { status: 'Active', author: 'Mikael', epic: 'Epic: Security Audit', priority: 'High', storyPoints: 5, component: 'Backend', dueDaysRemaining: -2, commentCount: 4, flagged: true } },
        { id: 'b-is4', type: 'issue', name: 'Issue #115: CORS Wildcard Warning', attributes: { status: 'Backlog', author: 'Elena', epic: 'Epic: Security Audit', priority: 'Medium', storyPoints: 3, component: 'Backend', dueDaysRemaining: 10, commentCount: 1 } },
        { id: 'b-is5', type: 'issue', name: 'Issue #116: User Profile Slow Loading', attributes: { status: 'Active', author: 'John', epic: 'Epic: Cache Infrastructure', priority: 'Medium', storyPoints: 5, component: 'Backend', dueDaysRemaining: 4, commentCount: 2 } },
        { id: 'b-is6', type: 'issue', name: 'Issue #117: Unhandled Exception in Webhook', attributes: { status: 'Active', author: 'Mikael', epic: 'Epic: Stripe Billing integration', priority: 'High', storyPoints: 5, component: 'Backend', dueDaysRemaining: 2, commentCount: 8, subTasks: [{ name: 'Add try-catch', status: 'Done' }, { name: 'Alerting webhook errors', status: 'In Progress' }] } },
        { id: 'b-is7', type: 'issue', name: 'Issue #118: Session Expiry Window', attributes: { status: 'Active', author: 'John', epic: 'Epic: Security Audit', priority: 'Low', storyPoints: 2, component: 'Backend', dueDaysRemaining: 6, commentCount: 2 } },
        { id: 'b-is8', type: 'issue', name: 'Issue #119: API Spec Discrepancy', attributes: { status: 'Backlog', author: 'Elena', epic: 'Epic: Cache Infrastructure', priority: 'Low', storyPoints: 3, component: 'Backend', dueDaysRemaining: 14, commentCount: 0 } }
      ],
      edges: [
        { id: 'e-b1', source: 'b-is1', target: 'b-is2', type: 'blocks' },
        { id: 'e-b2', source: 'b-is3', target: 'b-is1', type: 'blocks' }
      ]
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
  const [dtoSimActive, setDtoSimActive] = useState(false);
  const [selectedGardenNode, setSelectedGardenNode] = useState<FusedNode | null>(null);
  const [filters, setFilters] = useState({
    showEpics: true,
    showBees: true,
    showSubtasks: true,
    showWebs: true,
    showDewdrops: true,
    showVines: true,
    showWeather: true,
    showAgents: true,
  });
  const [uiVisible, setUiVisible] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [expandedConflictId, setExpandedConflictId] = useState<number | null>(null);
  const [humanApprovedState, setHumanApprovedState] = useState<boolean | null>(null);
  const [humanNotesText, setHumanNotesText] = useState<string>('');
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleTriggerSimulation = async () => {
    setIsSimulating(true);
    playHoverSound();
    try {
      const response = await fetch('/api/pipeline/trigger', {
        method: 'POST',
      });
      if (response.ok) {
        console.log("Pipeline simulation triggered successfully.");
      }
    } catch (err) {
      console.error("Failed to trigger pipeline simulation:", err);
    } finally {
      // Keep loader visible for 3.5 seconds to showcase multi-stage verification
      setTimeout(() => setIsSimulating(false), 3500);
    }
  };
  
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
  const [activeTracker, setActiveTracker] = useState<'jira' | 'linear'>('jira');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          if (data.tracker) {
            setActiveTracker(data.tracker);
          }
        }
      } catch (err) {
        console.error("Failed to fetch active tracker config:", err);
      }
    };
    fetchConfig();
  }, []);

  const handleSwitchTracker = async (tracker: 'jira' | 'linear') => {
    playHoverSound();
    try {
      const res = await fetch(`/api/config/tracker?tracker=${tracker}`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.tracker) {
          setActiveTracker(data.tracker);
        }
      }
    } catch (err) {
      console.error("Failed to update active tracker:", err);
    }
  };

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

  const handleSubmitDecision = async (approved: boolean) => {
    setDecisionSubmitting(true);
    try {
      const response = await fetch(`/api/decision?approved=${approved}&notes=${encodeURIComponent(humanNotesText)}`, {
        method: 'POST',
      });
      if (response.ok) {
        setHumanApprovedState(approved);
        if (pipelineState) {
          setPipelineState({
            ...pipelineState,
            human_approved: approved,
            human_notes: humanNotesText,
          });
        }
      }
    } catch (err) {
      console.error("Failed to submit audit decision:", err);
    } finally {
      setDecisionSubmitting(false);
    }
  };

  useEffect(() => {
    setSelectedGardenNode(null);
  }, [selectedProject]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/ws`);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard: do not trigger hotkeys if user is focusing an input field
      const activeEl = document.activeElement;
      if (activeEl) {
        const tag = activeEl.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || activeEl.getAttribute('contenteditable') === 'true') {
          return;
        }
      }

      const key = e.key.toLowerCase();
      
      // Toggle mappings
      if (key === 'e') {
        playHoverSound();
        setFilters(prev => ({ ...prev, showEpics: !prev.showEpics }));
      } else if (key === 'b') {
        playHoverSound();
        setFilters(prev => ({ ...prev, showBees: !prev.showBees }));
      } else if (key === 's') {
        playHoverSound();
        setFilters(prev => ({ ...prev, showSubtasks: !prev.showSubtasks }));
      } else if (key === 'w') {
        playHoverSound();
        setFilters(prev => ({ ...prev, showWebs: !prev.showWebs }));
      } else if (key === 'd') {
        playHoverSound();
        setFilters(prev => ({ ...prev, showDewdrops: !prev.showDewdrops }));
      } else if (key === 'v') {
        playHoverSound();
        setFilters(prev => ({ ...prev, showVines: !prev.showVines }));
      } else if (key === 't') {
        playHoverSound();
        setFilters(prev => ({ ...prev, showWeather: !prev.showWeather }));
      } else if (key === 'a') {
        playHoverSound();
        setFilters(prev => ({ ...prev, showAgents: !prev.showAgents }));
      } else if (key === 'h' || key === '?') {
        playHoverSound();
        setUiVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  // Enrich graph nodes with risk probabilities, comment count (reviews), and priority for classical garden
  const enrichedGraph = useMemo(() => {
    if (!activeProjectData?.graph) return undefined;
    const nodes = activeProjectData.graph.nodes.map((node, i) => {
      // Find if this node is involved in any active conflicts
      const conflicts = pipelineState?.debt_report?.conflicts || [];
      const conflict = conflicts.find(c => 
        (node.type === 'pr' && c.involved_prs?.some(id => node.name.includes(id.toString()))) ||
        (node.type === 'issue' && c.involved_issues?.some(id => node.name.includes(id)))
      );
      
      let riskProbability = conflict?.causal_evidence?.probability ?? 0;
      if (node.type === 'issue' && !conflict) {
        // Fallback or default risk based on mock data risks
        const risks = activeProjectData.risks || [];
        const riskIdx = i % Math.max(risks.length, 1);
        const risk = risks[riskIdx];
        riskProbability = risk ? risk.probability / 100 : 0.35;
      }
      
      // Enrich attributes
      return {
        ...node,
        attributes: {
          ...node.attributes,
          riskProbability,
          reviews: node.attributes.reviews !== undefined ? node.attributes.reviews : (node.type === 'pr' ? (node.attributes.status === 'Approved' ? 2 : node.attributes.status === 'Under Review' ? 1 : 0) : undefined),
          priority: node.attributes.priority !== undefined ? node.attributes.priority : (node.type === 'issue' ? (i % 3 === 0 ? 'High' : i % 3 === 1 ? 'Medium' : 'Low') : undefined),
        }
      };
    });
    return { ...activeProjectData.graph, nodes };
  }, [activeProjectData, pipelineState]);

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
    <div className={`app-container ${dtoSimActive ? 'dto-sim-active' : 'standard-active'}`}>
      
      {/* Left Sidebar Nav Drawer (B rebranding renames to Project World Model) */}
      <aside className={`sidebar-nav ${dtoSimActive ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          <span className="material-symbols-outlined brand-icon">query_stats</span>
          <span className="brand-text">Project World Model</span>
        </div>
        <nav className="sidebar-menu">
          <button 
            onClick={() => setCurrentTab('overview')} 
            className={`menu-item-btn ${currentTab === 'overview' ? 'active' : ''}`}
            title="Command Console — Your central command dashboard mapping real-time observation, predictive risk simulations, and project control gates."
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="menu-text">Command Console</span>
          </button>
          <button 
            onClick={() => setCurrentTab('kanban')} 
            className={`menu-item-btn ${currentTab === 'kanban' ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">view_kanban</span>
            <span className="menu-text">Board</span>
          </button>
          <button 
            onClick={() => setCurrentTab('sprint')} 
            className={`menu-item-btn ${currentTab === 'sprint' ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">alarm</span>
            <span className="menu-text">Sprint Panel</span>
          </button>
          <button 
            onClick={() => setCurrentTab('stakeholders')} 
            className={`menu-item-btn ${currentTab === 'stakeholders' ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">groups</span>
            <span className="menu-text">Stakeholder Map</span>
          </button>
          <button 
            onClick={() => setCurrentTab('flow')} 
            className={`menu-item-btn ${currentTab === 'flow' ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">insights</span>
            <span className="menu-text">Flow Metrics</span>
          </button>
          <button 
            onClick={() => setCurrentTab('lifecycle')} 
            className={`menu-item-btn ${currentTab === 'lifecycle' ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined">route</span>
            <span className="menu-text">Project Lifecycle</span>
          </button>
          <button 
            onClick={() => setCurrentTab('scenarios')} 
            className={`menu-item-btn ${currentTab === 'scenarios' ? 'active' : ''}`}
            title="Scenario Sandbox — Simulate project changes (like adding developers or scope) to preview the impact on delivery timelines and costs."
          >
            <span className="material-symbols-outlined">schema</span>
            <span className="menu-text">Scenario Sandbox</span>
          </button>
          <button 
            onClick={() => setCurrentTab('strategic')} 
            className={`menu-item-btn ${currentTab === 'strategic' ? 'active' : ''}`}
            title="Strategic Balance Sheet — Monitors system compute costs, development activity, and efficiency balance alerts (Jevons Paradox)."
          >
            <span className="material-symbols-outlined">analytics</span>
            <span className="menu-text">Strategic Balance Sheet</span>
          </button>
          <button 
            onClick={() => setCurrentTab('calibration')} 
            className={`menu-item-btn ${currentTab === 'calibration' ? 'active' : ''}`}
            title="Simulation Alignment — Auto-corrects AI forecast models against actual repository history to maintain simulation accuracy."
          >
            <span className="material-symbols-outlined">query_stats</span>
            <span className="menu-text">Simulation Alignment</span>
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
                if (!e.target.value) setDtoSimActive(false);
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

            {/* Active Tracker Pill Switcher */}
            <div className="tracker-switcher-container">
              <span className="tracker-switcher-label">Active Source:</span>
              <div className="tracker-switcher-pills">
                <button 
                  className={`tracker-pill-btn ${activeTracker === 'jira' ? 'active' : ''}`}
                  onClick={() => handleSwitchTracker('jira')}
                  title="Switch to Jira Project Tracking"
                >
                  Jira
                </button>
                <button 
                  className={`tracker-pill-btn ${activeTracker === 'linear' ? 'active' : ''}`}
                  onClick={() => handleSwitchTracker('linear')}
                  title="Switch to Linear Project Tracking"
                >
                  Linear
                </button>
              </div>
            </div>

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
            {/* Run Simulation Button */}
            <button 
              className={`trigger-pipeline-btn ${isSimulating ? 'active' : ''}`}
              onClick={handleTriggerSimulation}
              disabled={isSimulating}
              title="Run a live project observation, simulation, and multi-agent audit cycle."
            >
              <span className="material-symbols-outlined btn-icon-span">
                {isSimulating ? 'sync' : 'play_circle'}
              </span>
              {isSimulating ? 'Analyzing...' : 'Trigger Live Analysis'}
            </button>

            <button 
              className={`toggle-btn ${dtoSimActive ? 'active' : ''}`} 
              onClick={() => setDtoSimActive(!dtoSimActive)}
              disabled={!selectedProject}
              title={!selectedProject ? "Select a project to enable digital twin view" : "Toggle 3D Digital Twin View"}
            >
              <span className="material-symbols-outlined btn-icon-span">
                {dtoSimActive ? 'grid_view' : '3d_rotation'}
              </span>
              {dtoSimActive ? 'Exit 3D Digital Twin' : 'Enter 3D Digital Twin'}
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
            {/* Standard mode: React-Three-Fiber DTO Simulation */}
            {!dtoSimActive && (
              <Canvas shadows camera={{ position: [0, 8, 12], fov: 48 }}>
                <OrbitControls makeDefault maxPolarAngle={Math.PI / 2 - 0.05} minDistance={5} maxDistance={25} />
                <DTOSimulation 
                  graph={activeProjectData?.graph || null} 
                  crr={activeProjectData?.telemetry?.crr} 
                  qaLimit={qaLimit}
                  opponentLimit={opponentLimit}
                />
              </Canvas>
            )}

            {/* DTO Simulation: Classical Garden Simulation */}
            <GameGardenScene
              active={dtoSimActive}
              crr={activeProjectData?.telemetry?.crr}
              projectName={activeProjectData?.name}
              graph={enrichedGraph}
              qaLimit={qaLimit}
              opponentLimit={opponentLimit}
              eventCount={selectedProject ? (ingestionEvents[selectedProject]?.length || 0) : 0}
              onSelectNode={setSelectedGardenNode}
              sprintVelocity={activeProjectData?.telemetry?.sprintVelocity}
              filters={filters}
              uiVisible={uiVisible}
            />
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
                            <h4>Scenario Sandbox</h4>
                            <p>Select a workspace first. Once initialized, you can simulate scenario changes (like team scaling or scope changes) and predict interdependency conflicts.</p>
                          </>
                        )}
                        {currentTab === 'strategic' && (
                          <>
                            <h4>Strategic Balance Sheet</h4>
                            <p>Choose a repository to view the balance sheet (Economics, Human, Technology). Audit compute costs and check for efficiency balance alerts (Jevons Paradox).</p>
                          </>
                        )}
                        {currentTab === 'calibration' && (
                          <>
                            <h4>Simulation Alignment</h4>
                            <p>Monitor AI forecast accuracy metrics as the model aligns simulated predictions with real observed history.</p>
                          </>
                        )}
                        {currentTab === 'settings' && (
                          <>
                            <h4>Configure System Settings</h4>
                            <p>Please select a repository workspace to unlock settings controls, Consensus threshold parameters, and alert notification destinations.</p>
                          </>
                        )}
                        {currentTab === 'kanban' && (
                          <>
                            <h4>Task Board View</h4>
                            <p>Please select a repository workspace to view the active work items, track open task capacity limits, and identify overdue items.</p>
                          </>
                        )}
                        {currentTab === 'sprint' && (
                          <>
                            <h4>Sprint Dashboard View</h4>
                            <p>Please select a repository workspace to view the current Sprint Goal, burn down/up charts, and check items against the Definition of Done (DoD).</p>
                          </>
                        )}
                        {currentTab === 'stakeholders' && (
                          <>
                            <h4>Stakeholder Map View</h4>
                            <p>Please select a repository workspace to explore communication link strength, assign RACI matrices, and monitor stakeholder inactivity risks.</p>
                          </>
                        )}
                        {currentTab === 'flow' && (
                          <>
                            <h4>Flow Metrics View</h4>
                            <p>Please select a repository workspace to view the Cumulative Flow Diagram (CFD), Cycle Time Scatterplot, and Throughput Histograms.</p>
                          </>
                        )}
                        {currentTab === 'lifecycle' && (
                          <>
                            <h4>Project Lifecycle View</h4>
                            <p>Please select a repository workspace to trace the phase timeline (Ideation to Support) and check the PMBOK Risk Register.</p>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="onboarding-step">
                      <span className="step-num">2</span>
                      <div className="step-content">
                        <h4>Audit Predicted Project Risks</h4>
                        <p>Review predicted bottlenecks and delivery delays simulated by the AI models overnight.</p>
                      </div>
                    </div>
                    
                    <div className="onboarding-step">
                      <span className="step-num">3</span>
                      <div className="step-content">
                        <h4>Make Management Decisions</h4>
                        <p>Decide whether to approve recommendations and prevent risky code changes from being merged.</p>
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
            ) : !dtoSimActive ? (
              // Option 2 Layout: Switchable tabs standard views
              <div className="standard-main-content">
                               {/* 1. OVERVIEW TAB VIEW */}
                {currentTab === 'overview' && (
                  <>
                    {/* 24h Clock HUD */}
                    {(() => {
                      const hour = new Date().getHours();
                      const cycle = pipelineState?.cycle || (
                        (22 <= hour || hour < 6)
                          ? { phase: "night", title: "Agent Simulation", description: "Asynchronous models running background validation.", local_time: `${hour}:00`, timezone: "Europe/Helsinki" }
                          : (6 <= hour && hour < 10)
                            ? { phase: "morning", title: "Review & Triage", description: "Scenario Strategist reviews overnight conflict reports.", local_time: `${hour}:00`, timezone: "Europe/Helsinki" }
                            : (10 <= hour && hour < 18)
                              ? { phase: "day", title: "Human-in-the-Loop", description: "Collaborative refinement of integration strategies.", local_time: `${hour}:00`, timezone: "Europe/Helsinki" }
                              : { phase: "evening", title: "Objective Setting", description: "Setting parameters for the next overnight cycle.", local_time: `${hour}:00`, timezone: "Europe/Helsinki" }
                      );
                      
                      return (
                        <div className="cycle-hud">
                          <div className="cycle-info-row">
                            <span className={`cycle-badge ${cycle.phase}`}>
                              <span className="pulse-dot-small" style={{ display: cycle.phase === 'night' ? 'inline-block' : 'none' }}></span>
                              {cycle.title}
                            </span>
                            <span className="cycle-desc">{cycle.description}</span>
                          </div>
                          <div className="cycle-clock">
                            {cycle.local_time} ({cycle.timezone})
                          </div>
                        </div>
                      );
                    })()}

                    {/* Observe-Predict-Act 3-Column Console */}
                    <div className="observe-predict-act-grid">
                      
                      {/* Column 1: Observation Ingestion (Observe) */}
                      <div className="opa-column observe-col">
                        <div className="column-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="material-symbols-outlined column-icon">visibility</span>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <h3 style={{ margin: 0 }}>1. Real-time Observation</h3>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>Monitors active repositories and imports task/code history</span>
                            </div>
                          </div>
                          <button 
                            className="sync-telemetry-btn"
                            onClick={handleTriggerSync}
                            disabled={isSyncing}
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              color: 'var(--text-sub)', 
                              cursor: 'pointer', 
                              display: 'flex', 
                              alignItems: 'center', 
                              padding: '4px' 
                            }}
                            title="Synchronize repository telemetry"
                          >
                            <span 
                              className="material-symbols-outlined" 
                              style={{ 
                                fontSize: '1.2rem', 
                                animation: isSyncing ? 'spin 1s linear infinite' : 'none' 
                              }}
                            >
                              sync
                            </span>
                          </button>
                        </div>
                        
                        <div className="metrics-summary-grid-compact" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div className="metric-item-compact" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '10px', borderRadius: '10px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)' }}>PRs Ingested</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--mono-font)' }}>{activeProjectData.telemetry.prs}</div>
                          </div>
                          <div className="metric-item-compact" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '10px', borderRadius: '10px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)' }}>Tasks / Issues</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--mono-font)' }}>{activeProjectData.telemetry.issues}</div>
                          </div>
                          <div className="metric-item-compact" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '10px', borderRadius: '10px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)' }}>Active Branches</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--mono-font)' }}>{activeProjectData.telemetry.prs + 1}</div>
                          </div>
                          <div className="metric-item-compact" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '10px', borderRadius: '10px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)' }}>Workspace Connectors</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--success)' }} title="Model Context Protocol (MCP) + AI visual analysis ingestion engines.">
                              GitHub + {pipelineState?.sprint_state?.tracker_name || 'Linear'}
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: '10px' }}>
                          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            Secured Activity Log
                            <span 
                              className="material-symbols-outlined" 
                              style={{ fontSize: '0.9rem', color: 'var(--text-sub)', cursor: 'help' }}
                              title="An unalterable record of all repository events. Used by prediction algorithms to guarantee that input data hasn't been altered."
                            >
                              help
                            </span>
                          </h4>
                          <div className="merkle-chain-log">
                            {(pipelineState?.events || activeProjectData.events).slice(0, 8).map((evt, idx) => (
                              <div key={idx} className="merkle-node-card">
                                <div className="merkle-node-header">
                                  <span className="lock-secured">
                                    <span className="material-symbols-outlined lock-secured-icon">lock</span>
                                    SECURED
                                  </span>
                                  <span className="merkle-node-meta" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                                    #SEALED-00{8 - idx}
                                  </span>
                                </div>
                                <div className="merkle-node-body">
                                  {(evt as any).text || (evt as any).summary}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ marginTop: '15px' }}>
                          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-sub)' }}>
                            Telemetry Event Feed
                          </h4>
                          <div className="telemetry-event-feed" style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {(ingestionEvents[selectedProject] || []).map((evt) => (
                              <div key={evt.id} className="telemetry-event-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: evt.type === 'commit' ? '#4450b7' : evt.type === 'webhook' ? '#8455ef' : '#2ea043' }}>
                                  {evt.type === 'commit' ? 'code' : evt.type === 'webhook' ? 'webhook' : 'sync'}
                                </span>
                                <div style={{ flex: 1 }}>
                                  <p style={{ margin: 0, color: 'var(--text-main)' }}>{evt.text}</p>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>{evt.time}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Column 2: Latent Core Simulation (Predict) */}
                      <div className="opa-column predict-col">
                        <div className="column-header">
                          <span className="material-symbols-outlined column-icon">insights</span>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ margin: 0 }}>2. AI Risk Simulation</h3>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>Predicts delivery delays and resource bottlenecks</span>
                          </div>
                        </div>

                        {/* Iron Triangle Gauges */}
                        <div className="iron-triangle-container">
                          <div className="triangle-gauge-card">
                            <span className="gauge-title" style={{ cursor: 'help' }} title="Workload Density: The total number of active Pull Requests and Issues currently open. High density delays tasks.">Workload Density</span>
                            <span className="gauge-value">{activeProjectData.telemetry.prs + activeProjectData.telemetry.issues}</span>
                            <span className={`gauge-status ${(activeProjectData.telemetry.prs + activeProjectData.telemetry.issues) < 12 ? 'good' : 'warn'}`}>
                              {(activeProjectData.telemetry.prs + activeProjectData.telemetry.issues) < 12 ? 'Normal' : 'High Load'}
                            </span>
                          </div>
                          
                          <div className="triangle-gauge-card">
                            <span className="gauge-title" style={{ cursor: 'help' }} title="Timeline Risk: Estimated total rework hours needed to resolve all code interdependency conflicts and merge issues.">Timeline Risk</span>
                            <span className="gauge-value">
                              {pipelineState?.debt_report
                                ? `${pipelineState.debt_report.total_estimated_rework_hours.toFixed(0)}h`
                                : activeProjectData.id === 'proj-live' ? '0h'
                                : activeProjectData.id === 'proj-alpha' ? '12h'
                                : activeProjectData.id === 'proj-beta' ? '28h'
                                : '8h'}
                            </span>
                            <span className={`gauge-status ${activeProjectData.telemetry.crr >= 1.0 ? 'good' : 'danger'}`}>
                              {activeProjectData.telemetry.crr >= 1.0 ? 'Low Risk' : 'High Delay'}
                            </span>
                          </div>

                          <div className="triangle-gauge-card">
                            <span className="gauge-title" style={{ cursor: 'help' }} title="Budget Health: Tracks AI tokens consumed to run the simulation against allocated resources.">Budget Health</span>
                            <span className="gauge-value">{tokenBurn}M</span>
                            <span className={`gauge-status ${parseFloat(tokenBurn) < 15.0 ? 'good' : 'warn'}`}>
                              {parseFloat(tokenBurn) < 15.0 ? 'Optimal' : 'Runaway'}
                            </span>
                          </div>
                        </div>

                        <div style={{ marginTop: '10px' }}>
                          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-sub)' }}>
                            Predicted Integration Risks
                          </h4>
                          
                          {(() => {
                            const conflicts = pipelineState?.debt_report?.conflicts || activeProjectData.risks.map((r, i) => ({
                              conflict_type: r.severity === 'critical' ? 'dependency_break' : 'semantic_conflict',
                              severity: r.severity,
                              description: r.desc,
                              involved_prs: [i + 204],
                              involved_issues: [`ENG-${i + 112}`],
                              affected_files: ['App.tsx'],
                              estimated_rework_hours: r.severity === 'critical' ? 12 : 4,
                              causal_evidence: {
                                probability: r.probability,
                                confidence: 85,
                                counterfactual: `If conflict isn't resolved, it will cascade into subsequent integration sprints.`,
                                causal_chain: [r.title, r.desc, "Triggers code regression", "Re-validation needed"],
                                impact_distribution: { critical: r.severity === 'critical' ? 0.8 : 0.2, high: 0.5, medium: 0.2 }
                              }
                            }));

                            if (conflicts.length === 0) {
                              return <div className="empty-state">No integration risks predicted.</div>;
                            }

                            return (
                              <div className="causal-conflict-list">
                                {conflicts.map((conflict, idx) => {
                                  const isExpanded = expandedConflictId === idx;
                                  const prob = conflict.causal_evidence?.probability || (conflict.severity === 'critical' ? 85 : 40);
                                  const severityClass = conflict.severity === 'critical' ? 'critical' : conflict.severity === 'high' ? 'warning' : 'normal';
                                  
                                  return (
                                    <div key={idx} className="conflict-card-collapsible">
                                      <div className="conflict-card-header" onClick={() => setExpandedConflictId(isExpanded ? null : idx)}>
                                        <div className="conflict-header-left">
                                          <div className="conflict-badge-row">
                                            <span className={`probability-indicator-pill ${severityClass}`}>
                                              {prob < 1.0 ? `${Math.round(prob * 100)}%` : `${prob}%`} Prob
                                            </span>
                                            <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-sub)' }}>
                                              {conflict.conflict_type === 'dependency_break' ? 'Code Conflict (databases overlap)' : conflict.conflict_type === 'semantic_conflict' ? 'Logic Conflict (client session mismatch)' : conflict.conflict_type.replace('_', ' ')}
                                            </span>
                                          </div>
                                          <span className="conflict-title-main">
                                            {conflict.description.substring(0, 50)}...
                                          </span>
                                        </div>
                                        <span className="material-symbols-outlined">
                                          {isExpanded ? 'expand_less' : 'expand_more'}
                                        </span>
                                      </div>
                                      
                                      {isExpanded && (
                                        <div className="causal-evidence-drawer">
                                          <div className="counterfactual-box">
                                            <strong>Counterfactual Logic:</strong><br />
                                            {conflict.causal_evidence?.counterfactual || "If left unresolved, this conflict propagates to production systems causing integration regression."}
                                          </div>
                                          
                                          {conflict.causal_evidence?.causal_chain && (
                                            <div className="causal-chain-section">
                                              <h5>Causal Propagation Chain</h5>
                                              <div className="causal-chain-steps">
                                                {conflict.causal_evidence.causal_chain.map((step, sIdx) => (
                                                  <div key={sIdx} className="causal-step-item">
                                                    {step}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                          
                                          {conflict.causal_evidence?.impact_distribution && (
                                            <div className="severity-distribution-section">
                                              <h5>Predicted Risk Impact Distribution</h5>
                                              {Object.entries(conflict.causal_evidence.impact_distribution).map(([sev, weight], wIdx) => {
                                                const wNum = Number(weight);
                                                return (
                                                  <div key={wIdx} className="distribution-bar-row">
                                                    <span className="distribution-lbl">{sev}</span>
                                                    <div className="distribution-track">
                                                      <div className={`distribution-fill ${sev}`} style={{ width: `${wNum * 100}%` }}></div>
                                                    </div>
                                                    <span>{Math.round(wNum * 100)}%</span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}

                                          <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)', borderTop: '1px solid var(--border)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Confidence Index: {conflict.causal_evidence?.confidence ? (conflict.causal_evidence.confidence < 1.0 ? `${Math.round(conflict.causal_evidence.confidence * 100)}%` : `${conflict.causal_evidence.confidence}%`) : '80%'}</span>
                                            <span>Est. Rework: {conflict.estimated_rework_hours}h</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Column 3: Control Actions (Act) */}
                      <div className="opa-column act-col">
                        <div className="column-header">
                          <span className="material-symbols-outlined column-icon">settings_applications</span>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ margin: 0 }}>3. Decision Control Gate</h3>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>Approve or decline recommendations based on simulated risk analysis</span>
                          </div>
                        </div>

                        {/* Scenario Strategist Audit Gate */}
                        <div className="glass-card" style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-sub)' }}>
                            Management Release Gate
                          </h4>
                          
                          {(pipelineState?.human_approved !== undefined && pipelineState.human_approved !== null) || humanApprovedState !== null ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-dim)', padding: '12px', borderRadius: '10px', marginBottom: '12px' }}>
                              <span className="material-symbols-outlined" style={{ color: (pipelineState?.human_approved ?? humanApprovedState) ? 'var(--success)' : 'var(--error)' }}>
                                {(pipelineState?.human_approved ?? humanApprovedState) ? 'check_circle' : 'cancel'}
                              </span>
                              <div>
                                <strong style={{ fontSize: '0.85rem' }}>
                                  {(pipelineState?.human_approved ?? humanApprovedState) ? 'APPROVED' : 'REJECTED'}
                                </strong>
                                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-sub)' }}>
                                  Notes: {pipelineState?.human_notes || humanNotesText || 'No review notes submitted.'}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div style={{ background: 'rgba(230, 95, 0, 0.05)', border: '1px solid rgba(230, 95, 0, 0.15)', padding: '12px', borderRadius: '10px', marginBottom: '12px', display: 'flex', gap: '8px' }}>
                              <span className="material-symbols-outlined" style={{ color: '#e65f00', fontSize: '1.2rem' }}>warning</span>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-sub)', lineHeight: 1.4 }}>
                                System awaiting review of predicted risks. Select an action below.
                              </span>
                            </div>
                          )}

                          <textarea
                            placeholder="Audit logs / review feedback notes..."
                            style={{ width: '100%', minHeight: '60px', borderRadius: '10px', border: '1px solid var(--border)', padding: '10px', fontSize: '0.8rem', boxSizing: 'border-box', marginBottom: '10px', resize: 'vertical', fontFamily: 'inherit' }}
                            value={humanNotesText}
                            onChange={(e) => setHumanNotesText(e.target.value)}
                            disabled={decisionSubmitting}
                          />

                          <div className="audit-action-btn-row">
                            <button 
                              className="approve-btn" 
                              style={{ background: 'var(--success)', color: 'white', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                              onClick={() => handleSubmitDecision(true)}
                              disabled={decisionSubmitting}
                            >
                              Approve Recommendations
                            </button>
                            <button 
                              className="veto-btn" 
                              style={{ background: 'var(--error)', color: 'white', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                              onClick={() => handleSubmitDecision(false)}
                              disabled={decisionSubmitting}
                            >
                              Reject Recommendations
                            </button>
                          </div>
                        </div>

                        {/* Corrective Action Plan */}
                        {(() => {
                          const totalIssues = activeProjectData.telemetry.issues;
                          const openPrs = activeProjectData.telemetry.prs;
                          
                          let blockedCount = activeProjectData.id === 'proj-live'
                            ? pipelineState?.unified_graph?.nodes?.filter(n => n.type === 'issue' && n.attributes?.status === 'Blocked').length || 0
                            : activeProjectData.id === 'proj-gamma' ? 2
                            : activeProjectData.id === 'proj-beta' ? 1
                            : 1;

                          const scopeScore = totalIssues + openPrs * 1.5;

                          return (
                            <div style={{ marginTop: '10px' }}>
                              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-sub)' }}>
                                Suggested Actions to Fix Risks
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {blockedCount > 0 && (
                                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'rgba(186, 26, 26, 0.04)', border: '1px solid rgba(186, 26, 26, 0.08)', padding: '10px', borderRadius: '10px' }}>
                                    <span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: '1.1rem' }}>group_add</span>
                                    <div>
                                      <strong style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Clear Blockers</strong>
                                      <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: 'var(--text-sub)', lineHeight: 1.35 }}>
                                        Reallocate engineering resources to resolve {blockedCount} blocked critical path tasks. Recover schedule margin.
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {scopeScore > 12 && (
                                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'rgba(230, 95, 0, 0.04)', border: '1px solid rgba(230, 95, 0, 0.08)', padding: '10px', borderRadius: '10px' }}>
                                    <span className="material-symbols-outlined" style={{ color: '#e65f00', fontSize: '1.1rem' }}>compress</span>
                                    <div>
                                      <strong style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Defer Scope Density</strong>
                                      <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: 'var(--text-sub)', lineHeight: 1.35 }}>
                                        Defer 1-2 non-essential branches to resolve the integration debt before final staging.
                                      </p>
                                    </div>
                                  </div>
                                )}

                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'rgba(46, 160, 67, 0.04)', border: '1px solid rgba(46, 160, 67, 0.08)', padding: '10px', borderRadius: '10px' }}>
                                  <span className="material-symbols-outlined" style={{ color: 'var(--success)', fontSize: '1.1rem' }}>lock</span>
                                  <div>
                                    <strong style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>AI Resource Usage Health</strong>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: 'var(--text-sub)', lineHeight: 1.35 }}>
                                      Daily token burn ({tokenBurn}M) is safely below the 20M cap. Current model parameterization is sustainable.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Cognitive Budget Sliders */}
                        <div style={{ marginTop: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px' }}>
                          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-sub)' }}>
                            AI Simulation Resource Limits
                          </h4>
                          
                          <div style={{ marginBottom: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700 }} title="AI Analysis Depth Limit: Controls how thorough the AI checks are. Higher limits allow deeper analysis but cost more system credits.">
                              <span>AI Analysis Depth Limit</span>
                              <span>{qaLimit.toFixed(1)}M</span>
                            </div>
                            <input 
                              type="range" 
                              min="1.0" 
                              max="10.0" 
                              step="0.5" 
                              value={qaLimit} 
                              onChange={(e) => setQaLimit(parseFloat(e.target.value))}
                              style={{ width: '100%', accentColor: 'var(--primary)', height: '4px' }}
                            />
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700 }} title="AI Stress-Testing Limit: Controls the complexity of simulated scenarios generated to stress-test your codebase.">
                              <span>AI Stress-Testing Limit</span>
                              <span>{opponentLimit.toFixed(1)}M</span>
                            </div>
                            <input 
                              type="range" 
                              min="0.1" 
                              max="2.0" 
                              step="0.1" 
                              value={opponentLimit} 
                              onChange={(e) => setOpponentLimit(parseFloat(e.target.value))}
                              style={{ width: '100%', accentColor: 'var(--secondary)', height: '4px' }}
                            />
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
                        <h2>Scenario Sandbox & Simulator</h2>
                        <p className="tab-subtitle">Simulate project changes (like adding developers, reducing QA capacity, or modifying scope) to see their predicted impact on your project schedule and costs.</p>
                      </div>
                      <button 
                        className="action-trigger-btn"
                        onClick={handleTriggerScenario}
                        disabled={activeSimId !== null}
                      >
                        <span className="material-symbols-outlined">play_circle</span>
                        {activeSimId ? 'Running Sandbox...' : 'Trigger New Risk Simulation'}
                      </button>
                    </div>

                    {activeSimId && (
                      <div className="glass-card active-simulation-alert">
                        <div className="sim-loading-row">
                          <div className="sync-spinner"></div>
                          <div>
                            <strong>Active Simulation Running: {activeSimId}</strong>
                            <p>AI Simulator invoking analysis agents to predict integration risks...</p>
                          </div>
                        </div>
                        <div className="sim-progress-bar-container">
                          <div className="sim-progress-bar-fill"></div>
                        </div>
                      </div>
                    )}

                    <div className="glass-card">
                      <h3>Simulation History Log</h3>
                      <table className="scenario-table">
                        <thead>
                          <tr>
                            <th>Run ID</th>
                            <th>Scenario Title</th>
                            <th>Status</th>
                            <th>AI Analysis Limit</th>
                            <th>Stress-Test Limit</th>
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
                                No simulations run for this project yet. Click the button above to run a simulation.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. STRATEGIC SYNTHESIS TAB VIEW */}
                {currentTab === 'strategic' && (
                  <div className="tab-container flex-col animate-fade-in">
                    <div className="tab-header-row">
                      <div>
                        <h2>Strategic Balance Sheet: Business, Team & Tech Pillars</h2>
                        <p className="tab-subtitle">Monitors the balance between project costs, team workload health, and technical quality to prevent runaway issues.</p>
                      </div>
                    </div>
                    
                    {/* The Agility Paradox Widget */}
                    <div className="agility-paradox-container">
                      <div className="chart-header-paradox">
                        <div>
                          <h3 style={{ margin: 0 }}>The Team Capacity Gap</h3>
                          <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-sub)' }}>
                            How fast tasks are created by AI or backlog vs. how fast humans can merge and verify them.
                          </p>
                        </div>
                        <div className="chart-legend-paradox">
                          <span className="paradox-legend-item">
                            <span className="paradox-dot exponential"></span>
                            Task Creation Velocity
                          </span>
                          <span className="paradox-legend-item">
                            <span className="paradox-dot linear"></span>
                            Team Verification Capacity
                          </span>
                          <span className="paradox-legend-item">
                            <span className="paradox-dot debt"></span>
                            Task Backlog Overload (Integration Debt)
                          </span>
                        </div>
                      </div>
                      
                      <svg viewBox="0 0 600 220" className="agility-paradox-chart-svg">
                        {/* Shaded Area of Integration Debt */}
                        <path d="M 50 180 Q 250 160 550 50 L 550 130 Q 250 170 50 180 Z" fill="rgba(186, 26, 26, 0.06)" stroke="rgba(186, 26, 26, 0.15)" strokeWidth="1" strokeDasharray="3,3" />
                        
                        {/* Exponential AI Production Speed */}
                        <path d="M 50 180 Q 250 160 550 50" fill="none" stroke="var(--error)" strokeWidth="3" />
                        
                        {/* Linear Human Integration Capacity */}
                        <path d="M 50 180 Q 250 170 550 130" fill="none" stroke="var(--primary)" strokeWidth="2.5" />
                        
                        {/* Labels */}
                        <text x="560" y="55" fontSize="10" fill="var(--error)" fontWeight="700">Task Creation</text>
                        <text x="560" y="135" fontSize="10" fill="var(--primary)" fontWeight="700">Team Progress</text>
                        <text x="320" y="125" fontSize="11" fill="var(--error)" fontWeight="800" fontStyle="italic">BACKLOG OVERLOAD</text>
                        
                        {/* Axis */}
                        <line x1="50" y1="190" x2="550" y2="190" stroke="var(--border)" strokeWidth="1" />
                        <text x="50" y="205" fontSize="9" fill="var(--text-sub)">Day 1</text>
                        <text x="550" y="205" fontSize="9" fill="var(--text-sub)">Release Target</text>
                      </svg>
                    </div>
                    
                    {/* 3 Pillars Grid */}
                    <div className="strategic-synthesis-grid">
                      {/* Economics Pillar */}
                      <div className="pillar-card eco">
                        <div className="pillar-card-header">
                          <span className="material-symbols-outlined pillar-icon">payments</span>
                          <h4>1. Economics & Costs</h4>
                        </div>
                        <div className="pillar-content-list">
                          <div className="pillar-item-row">
                            <span className="pillar-item-lbl">Rework Savings Ratio (CRR)</span>
                            <span className="pillar-item-val">{activeProjectData.telemetry.crr.toFixed(2)}x</span>
                          </div>
                          <div className="pillar-item-row">
                            <span className="pillar-item-lbl">Daily AI Operation Cost</span>
                            <span className="pillar-item-val">${(qaLimit * 20.7 + opponentLimit * 12.0).toFixed(2)}</span>
                          </div>
                          <div className="pillar-item-row">
                            <span className="pillar-item-lbl">Estimated Saved Rework</span>
                            <span className="pillar-item-val">${(hoursSaved * 75).toFixed(2)}</span>
                          </div>
                          <div className="pillar-item-row">
                            <span className="pillar-item-lbl">Efficiency Loophole Alert</span>
                            <span className="pillar-item-val" style={{ color: activeProjectData.telemetry.crr < 1.0 ? 'var(--error)' : 'var(--success)' }}>
                              {activeProjectData.telemetry.crr < 1.0 ? 'WARNING' : 'SECURE'}
                            </span>
                          </div>
                          <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                            <CostChart projectCrr={activeProjectData.telemetry.crr} />
                          </div>
                        </div>
                      </div>
                      
                      {/* Human Pillar */}
                      <div className="pillar-card hum">
                        <div className="pillar-card-header">
                          <span className="material-symbols-outlined pillar-icon">groups</span>
                          <h4>2. Team Trust & Workload</h4>
                        </div>
                        <div className="pillar-content-list">
                          <div className="pillar-item-row">
                            <span className="pillar-item-lbl">Consensus Threshold</span>
                            <span className="pillar-item-val">{consensusThreshold}%</span>
                          </div>
                          <div className="pillar-item-row">
                            <span className="pillar-item-lbl">Active Team Members</span>
                            <span className="pillar-item-val">5 Humans</span>
                          </div>
                          <div className="pillar-item-row">
                            <span className="pillar-item-lbl">Team Feedback Rating</span>
                            <span className="pillar-item-val" style={{ color: 'var(--success)' }}>98.2%</span>
                          </div>
                          <div className="pillar-item-row">
                            <span className="pillar-item-lbl">Workload Protection Shield</span>
                            <span className="pillar-item-val">ACTIVE</span>
                          </div>
                        </div>
                      </div>
 
                      {/* Technology Pillar */}
                      <div className="pillar-card tech">
                        <div className="pillar-card-header">
                          <span className="material-symbols-outlined pillar-icon">memory</span>
                          <h4>3. Technical Health</h4>
                        </div>
                        <div className="pillar-content-list">
                          <div className="pillar-item-row">
                            <span className="pillar-item-lbl">AI Simulator Engine</span>
                            <span className="pillar-item-val">LeWorldModel (LeWM)</span>
                          </div>
                          <div className="pillar-item-row">
                            <span className="pillar-item-lbl">Activity Data Connector</span>
                            <span className="pillar-item-val">V-JEPA 2.1 API</span>
                          </div>
                          <div className="pillar-item-row">
                            <span className="pillar-item-lbl">AI Safety Guardrail</span>
                            <span className="pillar-item-val">Nvidia NemoClaw</span>
                          </div>
                          <div className="pillar-item-row">
                            <span className="pillar-item-lbl">Simulation Drift (Error)</span>
                            <span className="pillar-item-val">
                              {pipelineState?.calibration?.history && pipelineState.calibration.history.length > 0
                                ? pipelineState.calibration.history[pipelineState.calibration.history.length - 1].error.toFixed(4)
                                : '0.0415'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. CALIBRATION ENGINE TAB VIEW */}
                {currentTab === 'calibration' && (
                  <div className="tab-container flex-col animate-fade-in">
                    <div className="tab-header-row">
                      <div>
                        <h2>Simulation Alignment & Calibration</h2>
                        <p className="tab-subtitle">Aligns simulated AI predictions with actual repository history (commits, PRs, issues) to eliminate prediction drift and maintain accuracy.</p>
                      </div>
                    </div>
                    
                    <div className="calibration-hud-container">
                      {/* Left: Summary */}
                      <div className="cal-summary-card">
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-sub)', textTransform: 'uppercase' }}>Simulation Scaling Factor</h4>
                          <div className="cal-big-value">
                            {pipelineState?.calibration?.factor !== undefined
                              ? `${pipelineState.calibration.factor.toFixed(4)}`
                              : '1.0250'}
                          </div>
                          <p 
                            style={{ fontSize: '0.75rem', color: 'var(--text-sub)', margin: 0, lineHeight: 1.4, cursor: 'help' }}
                            title="Tuned automatically using the difference vector magnitude (Euclidean distance) between predicted project states and actual observed repository states."
                          >
                            A dynamic tuning multiplier that fine-tunes AI prediction models. If simulated forecasts start drifting from actual developer progress, this factor auto-adjusts to align the simulation with reality.
                          </p>
                        </div>
                        <div style={{ marginTop: '15px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)' }}>Alignment Status:</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--success)', marginLeft: '6px' }}>OPTIMAL</span>
                        </div>
                      </div>
                      
                      {/* Right: Chart */}
                      <div className="cal-chart-card">
                        <div className="cal-chart-header">
                          <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                            Simulation Drift History (Alignment Error)
                            <span 
                              className="material-symbols-outlined help-icon" 
                              style={{ fontSize: '1.0rem', color: 'var(--text-sub)', cursor: 'help' }}
                              title="Overall error distance measures the straight-line difference between the simulated multidimensional state and the actual state. Lower is better."
                            >
                              help
                            </span>
                          </h3>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>Target Drift: &lt; 0.0500</span>
                        </div>
                        
                        <div className="cal-bar-chart">
                          {(() => {
                            const history = pipelineState?.calibration?.history || [
                              { timestamp: new Date(Date.now() - 3600000 * 3).toISOString(), error: 0.045, calibration_factor: 1.0 },
                              { timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), error: 0.042, calibration_factor: 1.01 },
                              { timestamp: new Date(Date.now() - 3600000).toISOString(), error: 0.038, calibration_factor: 1.02 },
                              { timestamp: new Date().toISOString(), error: 0.041, calibration_factor: 1.025 }
                            ];
                            
                            // Map to CSS height representation
                            const maxVal = Math.max(...history.map(h => h.error), 0.1);
                            
                            return history.map((item, idx) => {
                              const heightPct = (item.error / maxVal) * 100;
                              return (
                                <div key={idx} className="cal-bar-container">
                                  <div className="cal-bar-fill" style={{ height: `${heightPct}%`, background: item.error < 0.05 ? 'var(--success)' : 'var(--error)' }}>
                                    <div className="cal-bar-tooltip">
                                      Drift (Error): {item.error.toFixed(4)}<br />Scaling Factor: {item.calibration_factor.toFixed(4)}
                                    </div>
                                  </div>
                                  <span className="cal-axis-lbl" title={`Checked ${history.length - 1 - idx} hours ago`}>
                                    {idx === history.length - 1 ? 'Latest Check' : `${history.length - 1 - idx}h ago`}
                                  </span>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                    
                    {/* Calibration Events Log */}
                    <div className="glass-card" style={{ marginTop: '20px' }}>
                      <h3>Alignment & Calibration Logs</h3>
                      <div className="merkle-chain-log">
                        {pipelineState?.calibration?.history && pipelineState.calibration.history.length > 0 ? (
                          pipelineState.calibration.history.map((record, idx) => (
                            <div key={idx} className="merkle-node-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)', fontFamily: 'var(--mono-font)' }}>
                                  {new Date(record.timestamp).toLocaleTimeString()}
                                </span>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', fontWeight: 600 }}>
                                  Alignment check sealed: Simulation drift {record.error.toFixed(4)}.
                                </p>
                              </div>
                              <span className="lock-secured" style={{ color: 'var(--primary)', background: 'var(--primary-glow)' }}>
                                Factor: {record.calibration_factor.toFixed(4)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="empty-state-text" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-sub)' }}>
                            No calibration logs yet. Run a simulation pipeline to activate alignment checks.
                          </div>
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
                {/* 5. KANBAN BOARD VIEW */}
                {currentTab === 'kanban' && (
                  <div className="tab-container flex-col animate-fade-in" style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', flex: 1, minHeight: 'calc(100vh - 180px)' }}>
                    <KanbanBoard projectData={activeProjectData} pipelineState={pipelineState} />
                  </div>
                )}

                {/* 6. SPRINT DASHBOARD VIEW */}
                {currentTab === 'sprint' && (
                  <div className="tab-container flex-col animate-fade-in" style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', flex: 1, minHeight: 'calc(100vh - 180px)' }}>
                    <SprintDashboard projectData={activeProjectData} pipelineState={pipelineState} />
                  </div>
                )}

                {/* 7. STAKEHOLDER MAP VIEW */}
                {currentTab === 'stakeholders' && (
                  <div className="tab-container flex-col animate-fade-in" style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', flex: 1, minHeight: 'calc(100vh - 180px)' }}>
                    <StakeholderMap projectData={activeProjectData} pipelineState={pipelineState} />
                  </div>
                )}

                {/* 8. FLOW METRICS VIEW */}
                {currentTab === 'flow' && (
                  <div className="tab-container flex-col animate-fade-in" style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', flex: 1, minHeight: 'calc(100vh - 180px)' }}>
                    <FlowMetrics projectData={activeProjectData} pipelineState={pipelineState} />
                  </div>
                )}

                {/* 9. PROJECT LIFECYCLE VIEW */}
                {currentTab === 'lifecycle' && (
                  <div className="tab-container flex-col animate-fade-in" style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', flex: 1, minHeight: 'calc(100vh - 180px)' }}>
                    <ProjectLifecycle projectData={activeProjectData} pipelineState={pipelineState} />
                  </div>
                )}

              </div>
            ) : (
              // DTO Simulation overlay: Miniature floating HUDs over 3D coordinates space
              <div className="dto-sim-hud-overlay">
                
                {/* Left side: Workspace Overview + Node Details Container */}
                {uiVisible && (
                  <div className="animate-hud-left" style={{ gridArea: 'overview', display: 'flex', flexDirection: 'column', gap: '16px', pointerEvents: 'none', width: '320px' }}>
                    
                    {/* Workspace Overview HUD */}
                    <div className="glass-card hud-card workspace-hud" style={{ pointerEvents: 'auto', margin: 0 }}>
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

                  {/* Node Details HUD */}
                  {selectedGardenNode && (
                    <div className="glass-card hud-card details-hud" style={{ 
                      pointerEvents: 'auto',
                      width: '100%',
                      boxSizing: 'border-box',
                      margin: 0
                    }}>
                      <div className="hud-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="material-symbols-outlined" style={{ color: selectedGardenNode.type === 'pr' ? '#d4a520' : '#c44030', fontSize: '1.2rem' }}>
                            {selectedGardenNode.type === 'pr' ? 'layers' : 'bug_report'}
                          </span>
                          <h3>{selectedGardenNode.type === 'pr' ? 'PR Details' : 'Issue Details'}</h3>
                        </div>
                        <button 
                          onClick={() => setSelectedGardenNode(null)}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: 'var(--text-sub)', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            padding: '4px' 
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>close</span>
                        </button>
                      </div>
                      
                      <div className="details-content" style={{ marginTop: '12px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>{selectedGardenNode.name}</p>
                        
                        {/* Epic Label (if available) */}
                        {selectedGardenNode.attributes.epic && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(68,80,183,0.15)', color: '#a2a9e2', padding: '2px 6px', borderRadius: '4px', width: 'fit-content', fontWeight: 600, fontSize: '0.75rem' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }}>folder_open</span>
                            {selectedGardenNode.attributes.epic}
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                          <span style={{ color: 'var(--text-sub)' }}>Type:</span>
                          <span style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', color: selectedGardenNode.type === 'pr' ? '#d4a520' : '#c44030' }}>
                            {selectedGardenNode.type === 'pr' ? 'Pull Request' : 'Issue'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                          <span style={{ color: 'var(--text-sub)' }}>Status:</span>
                          <span style={{ 
                            fontWeight: 600, 
                            color: selectedGardenNode.attributes.status?.toLowerCase() === 'approved' || selectedGardenNode.attributes.status?.toLowerCase() === 'done' ? '#3aaa5e' : selectedGardenNode.attributes.status?.toLowerCase() === 'draft' || selectedGardenNode.attributes.status?.toLowerCase() === 'backlog' ? '#8a9090' : '#d4a520' 
                          }}>{selectedGardenNode.attributes.status}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                          <span style={{ color: 'var(--text-sub)' }}>Assignee:</span>
                          <span style={{ fontWeight: 600 }}>{selectedGardenNode.attributes.author}</span>
                        </div>

                        {selectedGardenNode.attributes.storyPoints !== undefined && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                            <span style={{ color: 'var(--text-sub)' }}>Story Points:</span>
                            <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{selectedGardenNode.attributes.storyPoints} pts</span>
                          </div>
                        )}

                        {selectedGardenNode.attributes.commentCount !== undefined && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                            <span style={{ color: 'var(--text-sub)' }}>Comments:</span>
                            <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>chat</span>
                              {selectedGardenNode.attributes.commentCount}
                            </span>
                          </div>
                        )}

                        {selectedGardenNode.type === 'pr' ? (
                          <>
                            {selectedGardenNode.attributes.reviews !== undefined && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                                <span style={{ color: 'var(--text-sub)' }}>Reviews:</span>
                                <span style={{ fontWeight: 600 }}>{selectedGardenNode.attributes.reviews} approved</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                              <span style={{ color: 'var(--text-sub)' }}>Priority:</span>
                              <span style={{ 
                                fontWeight: 600, 
                                color: selectedGardenNode.attributes.priority === 'High' ? '#c44030' : selectedGardenNode.attributes.priority === 'Medium' ? '#d47820' : 'var(--text-sub)' 
                              }}>{selectedGardenNode.attributes.priority}</span>
                            </div>

                            {selectedGardenNode.attributes.component && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                                <span style={{ color: 'var(--text-sub)' }}>Component:</span>
                                <span style={{ fontWeight: 600 }}>{selectedGardenNode.attributes.component}</span>
                              </div>
                            )}

                            {selectedGardenNode.attributes.dueDaysRemaining !== undefined && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                                <span style={{ color: 'var(--text-sub)' }}>Due Date:</span>
                                <span style={{ 
                                  fontWeight: 600, 
                                  color: selectedGardenNode.attributes.dueDaysRemaining < 0 ? '#c44030' : selectedGardenNode.attributes.dueDaysRemaining <= 2 ? '#d47820' : 'var(--text-main)' 
                                }}>
                                  {selectedGardenNode.attributes.dueDaysRemaining < 0 ? 'OVERDUE' : `${selectedGardenNode.attributes.dueDaysRemaining} days remaining`}
                                </span>
                              </div>
                            )}

                            {selectedGardenNode.attributes.flagged && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#c44030', fontWeight: 700, padding: '4px 0' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>warning</span>
                                BLOCKED / FLAGGED
                              </div>
                            )}

                            {selectedGardenNode.attributes.subTasks && selectedGardenNode.attributes.subTasks.length > 0 && (
                              <div style={{ marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                                <strong style={{ color: 'var(--text-sub)', display: 'block', marginBottom: '6px' }}>Sub-tasks Checklist:</strong>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '4px' }}>
                                  {selectedGardenNode.attributes.subTasks.map((st: any, idx: number) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: st.status === 'Done' ? '#3aaa5e' : '#d4a520', cursor: 'default' }}>
                                        {st.status === 'Done' ? 'check_box' : 'check_box_outline_blank'}
                                      </span>
                                      <span style={{ 
                                        textDecoration: st.status === 'Done' ? 'line-through' : 'none', 
                                        color: st.status === 'Done' ? 'var(--text-sub)' : 'var(--text-main)',
                                        fontSize: '0.8rem'
                                      }}>{st.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                )}

                {/* Top Right: Causal Efficiency HUD */}
                {uiVisible && (
                  <div className="glass-card hud-card efficiency-hud animate-hud-right">
                    <div className="hud-header">
                    <span className="material-symbols-outlined">speed</span>
                    <h3>Causal Efficiency</h3>
                  </div>
                  <div className="metric-value">{activeProjectData.telemetry.crr.toFixed(2)}x</div>
                  <div className="metric-sub">
                    Sim Status: <strong className={activeProjectData.telemetry.crr < 1.0 ? 'status-green' : 'status-red'}>
                      {activeProjectData.telemetry.crr < 1.0 ? 'Optimal' : 'Debt Warning'}
                    </strong>
                  </div>
                </div>
                )}

                {/* Bottom Center: Strategy Game Filter Dock HUD */}
                {uiVisible && (
                  <div className="garden-filter-dock animate-hud-bottom" style={{ pointerEvents: 'auto' }}>
                    <div className="filter-dock-title">
                      <span className="material-symbols-outlined icon-small">filter_alt</span>
                      <span>Garden Filters</span>
                    </div>
                    <div className="filter-slots-container">
                      {/* Slot 1: Epics */}
                      <button 
                        className={`filter-slot-btn ${filters.showEpics ? 'active' : 'inactive'}`}
                        onClick={() => { playHoverSound(); setFilters(prev => ({ ...prev, showEpics: !prev.showEpics })); }}
                      >
                        <span className="material-symbols-outlined">grid_on</span>
                        <div className="filter-led"></div>
                        <div className="filter-tooltip-card">
                          <div className="tooltip-shortcut">Hotkey [E]</div>
                          <div className="tooltip-title">Epic Beds</div>
                          <p className="tooltip-desc">Shows raised wooden plots dividing different project epics.</p>
                        </div>
                      </button>

                      {/* Slot 2: Assignees */}
                      <button 
                        className={`filter-slot-btn ${filters.showBees ? 'active' : 'inactive'}`}
                        onClick={() => { playHoverSound(); setFilters(prev => ({ ...prev, showBees: !prev.showBees })); }}
                      >
                        <span className="material-symbols-outlined">pest_control</span>
                        <div className="filter-led"></div>
                        <div className="filter-tooltip-card">
                          <div className="tooltip-shortcut">Hotkey [B]</div>
                          <div className="tooltip-title">Assignee Bees</div>
                          <p className="tooltip-desc">Shows orbiting bees representing team members working on tasks.</p>
                        </div>
                      </button>

                      {/* Slot 3: Sub-tasks */}
                      <button 
                        className={`filter-slot-btn ${filters.showSubtasks ? 'active' : 'inactive'}`}
                        onClick={() => { playHoverSound(); setFilters(prev => ({ ...prev, showSubtasks: !prev.showSubtasks })); }}
                      >
                        <span className="material-symbols-outlined">spa</span>
                        <div className="filter-led"></div>
                        <div className="filter-tooltip-card">
                          <div className="tooltip-shortcut">Hotkey [S]</div>
                          <div className="tooltip-title">Sub-tasks Mushrooms</div>
                          <p className="tooltip-desc">Shows mushrooms representing sub-tasks (resolved bloom into flowers).</p>
                        </div>
                      </button>

                      {/* Slot 4: Blocked Webs */}
                      <button 
                        className={`filter-slot-btn ${filters.showWebs ? 'active' : 'inactive'}`}
                        onClick={() => { playHoverSound(); setFilters(prev => ({ ...prev, showWebs: !prev.showWebs })); }}
                      >
                        <span className="material-symbols-outlined">emergency_home</span>
                        <div className="filter-led"></div>
                        <div className="filter-tooltip-card">
                          <div className="tooltip-shortcut">Hotkey [W]</div>
                          <div className="tooltip-title">Blocked Webs</div>
                          <p className="tooltip-desc">Envelops issues in spiderwebs to highlight blocked/flagged tasks.</p>
                        </div>
                      </button>

                      {/* Slot 5: Comment Dewdrops */}
                      <button 
                        className={`filter-slot-btn ${filters.showDewdrops ? 'active' : 'inactive'}`}
                        onClick={() => { playHoverSound(); setFilters(prev => ({ ...prev, showDewdrops: !prev.showDewdrops })); }}
                      >
                        <span className="material-symbols-outlined">water_drop</span>
                        <div className="filter-led"></div>
                        <div className="filter-tooltip-card">
                          <div className="tooltip-shortcut">Hotkey [D]</div>
                          <div className="tooltip-title">Dewdrops</div>
                          <p className="tooltip-desc">Shows shiny water droplets on leaves indicating fresh comment activity.</p>
                        </div>
                      </button>

                      {/* Slot 6: Dependency Vines */}
                      <button 
                        className={`filter-slot-btn ${filters.showVines ? 'active' : 'inactive'}`}
                        onClick={() => { playHoverSound(); setFilters(prev => ({ ...prev, showVines: !prev.showVines })); }}
                      >
                        <span className="material-symbols-outlined">schema</span>
                        <div className="filter-led"></div>
                        <div className="filter-tooltip-card">
                          <div className="tooltip-shortcut">Hotkey [V]</div>
                          <div className="tooltip-title">Dependency Vines</div>
                          <p className="tooltip-desc">Shows crawling leafy or thorny vines connecting related PRs and issues.</p>
                        </div>
                      </button>

                      {/* Slot 7: Sprint Weather */}
                      <button 
                        className={`filter-slot-btn ${filters.showWeather ? 'active' : 'inactive'}`}
                        onClick={() => { playHoverSound(); setFilters(prev => ({ ...prev, showWeather: !prev.showWeather })); }}
                      >
                        <span className="material-symbols-outlined">cloudy_snowing</span>
                        <div className="filter-led"></div>
                        <div className="filter-tooltip-card">
                          <div className="tooltip-shortcut">Hotkey [T]</div>
                          <div className="tooltip-title">Sprint Weather</div>
                          <p className="tooltip-desc">Displays rain (high velocity) or dry drought haze (low velocity).</p>
                        </div>
                      </button>

                      {/* Slot 8: Butterflies */}
                      <button 
                        className={`filter-slot-btn ${filters.showAgents ? 'active' : 'inactive'}`}
                        onClick={() => { playHoverSound(); setFilters(prev => ({ ...prev, showAgents: !prev.showAgents })); }}
                      >
                        <span className="material-symbols-outlined">flutter_dash</span>
                        <div className="filter-led"></div>
                        <div className="filter-tooltip-card">
                          <div className="tooltip-shortcut">Hotkey [A]</div>
                          <div className="tooltip-title">Swarm Butterflies</div>
                          <p className="tooltip-desc">Shows flying butterflies representing Worker, Critic, and Opponent simulation threads.</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Bottom Right: Cognitive Budget Controls HUD */}
                {uiVisible && (
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
                )}

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

          {/* ==========================================================================
             Simulation Loading Overlay
             ========================================================================== */}
          {isSimulating && (
            <div className="modal-overlay simulation-loading-overlay">
              <div className="glass-card modal-card animate-fade-in" style={{ maxWidth: '400px', textAlign: 'center', padding: '40px' }}>
                <span className="material-symbols-outlined spin-animation" style={{ fontSize: '4rem', color: 'var(--primary)' }}>sync</span>
                <h3 style={{ marginTop: '20px', color: 'var(--text-main)' }}>Running Agent Verification Engine</h3>
                <p style={{ color: 'var(--text-sub)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  Ingesting version control telemetry, executing counterfactual simulation, and running Worker-Critic validation enclaves...
                </p>
                <div className="progress-bar-wrap" style={{ marginTop: '20px' }}>
                  <div className="progress-bar-fill simulating-progress" />
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
