import { useState, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { DataTree } from './DataTree';
import type { TaskNode, HoveredData } from './DataTree';
import { Well, RoseBush, SpikyWeed, Butterfly, Fence } from './ProceduralAssets';
import { WeatherSystem } from './WeatherSystem';

interface DTONode {
  id: string;
  type: string;
  name: string;
  attributes: {
    status?: string;
    riskProbability?: number;
    priority?: string;
    [key: string]: any;
  };
}

interface DataTreeGardenProps {
  active: boolean;
  crr: number | undefined;
  projectName: string | undefined;
  graph: { nodes: any[]; edges: any[] } | undefined;
  opponentLimit: number;
  eventCount: number;
  onSelectNode: (node: any) => void;
  sprintVelocity: number | undefined;
  uiVisible: boolean;
}

export function DataTreeGarden({
  active,
  crr,
  projectName,
  graph,
  onSelectNode,
  uiVisible,
}: DataTreeGardenProps) {
  const [hoveredInfo, setHoveredInfo] = useState<HoveredData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentCrr = crr ?? 1.25;
  const isRainy = currentCrr < 1.0; // Trigger rain during warnings or low CRR

  // Base grass color shifts from lush green to dry autumn straw based on CRR health
  const grassColor = useMemo(() => {
    const lush = new THREE.Color('#4c7243');
    const dry = new THREE.Color('#948560');
    const factor = Math.min(Math.max((currentCrr - 0.7) / 0.8, 0), 1);
    return dry.lerp(lush, factor).getStyle();
  }, [currentCrr]);

  // Extract PR and Issue nodes from flat graph
  const gardenElements = useMemo(() => {
    if (!graph || !graph.nodes) return { prs: [], issues: [], epicPRs: null, epicIssues: null };

    const prs: any[] = [];
    const issues: any[] = [];

    let totalPrProgress = 0;
    let totalPrRisk = 0;
    let totalIssueProgress = 0;
    let totalIssueRisk = 0;

    // Distribute PR bushes to the left, Issue weeds to the right
    graph.nodes.forEach((node: DTONode, index: number) => {
      const status = (node.attributes?.status || '').toLowerCase();
      const risk = node.attributes?.riskProbability ?? 0.3;

      let progress = 0;
      if (node.type === 'pr') {
        if (status === 'approved' || status === 'completed') progress = 1.0;
        else if (status === 'under review') progress = 0.5;
        else progress = 0.15; // draft

        totalPrProgress += progress;
        totalPrRisk += risk;

        // Position spread left-front
        const angle = (index * 0.7) + 1.2;
        const radius = 3.5 + (index % 3) * 0.75;
        prs.push({
          node: { id: node.id, title: node.name, progress, complexity: 1, risk },
          position: [Math.sin(angle) * -radius, 0, Math.cos(angle) * radius] as [number, number, number],
          status,
        });
      } else if (node.type === 'issue') {
        if (status === 'completed' || status === 'done' || status === 'closed') progress = 1.0;
        else if (status === 'active' || status === 'in progress') progress = 0.4;
        else progress = 0.0; // backlog

        totalIssueProgress += progress;
        totalIssueRisk += risk;

        // Position spread right-front
        const angle = (index * 0.7) + 1.2;
        const radius = 3.5 + (index % 3) * 0.75;
        issues.push({
          node: { id: node.id, title: node.name, progress, complexity: 1, risk },
          position: [Math.sin(angle) * radius, 0, Math.cos(angle) * radius] as [number, number, number],
          status,
        });
      }
    });

    const prCount = prs.length || 1;
    const issueCount = issues.length || 1;

    const avgPrProgress = totalPrProgress / prCount;
    const avgPrRisk = totalPrRisk / prCount;
    const avgIssueProgress = totalIssueProgress / issueCount;
    const avgIssueRisk = totalIssueRisk / issueCount;

    // Create Epics (represented by Data Trees)
    const epicPRs: TaskNode = {
      id: 'epic-prs',
      title: 'Pull Requests Category Tree',
      progress: avgPrProgress,
      complexity: 3,
      risk: avgPrRisk,
      subtasks: prs.map(p => p.node),
    };

    const epicIssues: TaskNode = {
      id: 'epic-issues',
      title: 'Backlog Issues Category Tree',
      progress: avgIssueProgress,
      complexity: 3,
      risk: avgIssueRisk,
      subtasks: issues.map(i => i.node),
    };

    return { prs, issues, epicPRs, epicIssues };
  }, [graph]);

  if (!active) return null;

  const handleCanvasClick = () => {
    if (hoveredInfo) {
      onSelectNode(hoveredInfo.node);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: isRainy ? '#b0b5b2' : '#f5f2ee', // Greyish sky tone if rainy
        overflow: 'hidden',
      }}
    >
      <Canvas
        camera={{ position: [0, 8, 12], fov: 45 }}
        shadows
        onClick={handleCanvasClick}
      >
        <ambientLight intensity={isRainy ? 0.4 : 0.65} />
        
        {/* Directional Sunlight / Moon light */}
        <directionalLight
          position={[6, 12, 4]}
          intensity={isRainy ? 0.7 : 1.6}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.0001}
          color={isRainy ? '#cbd6db' : '#fffdf0'}
        />

        <pointLight position={[-8, 6, -8]} intensity={0.3} color="#ebd0b5" />

        {/* 1. Central Core Well representing CRR */}
        <Well position={[0, 0, 0]} crr={currentCrr} projectName={projectName} onHover={setHoveredInfo} />

        {/* 2. Procedural Epic DataTrees (left and right) */}
        {gardenElements.epicPRs && (
          <group position={[-3, 0, -2]}>
            <DataTree data={gardenElements.epicPRs} onHover={setHoveredInfo} />
          </group>
        )}
        {gardenElements.epicIssues && (
          <group position={[3, 0, -2]}>
            <DataTree data={gardenElements.epicIssues} onHover={setHoveredInfo} />
          </group>
        )}

        {/* 3. Pull Request Bushes */}
        {gardenElements.prs.map((p, idx) => (
          <RoseBush
            key={`pr-${idx}`}
            position={p.position}
            status={p.status}
            node={p.node}
            onHover={setHoveredInfo}
          />
        ))}

        {/* 4. Issue Weeds */}
        {gardenElements.issues.map((i, idx) => (
          <SpikyWeed
            key={`issue-${idx}`}
            position={i.position}
            status={i.status}
            node={i.node}
            onHover={setHoveredInfo}
          />
        ))}

        {/* 5. Animated Agent Butterflies */}
        <Butterfly color="#2575fc" orbitRadius={2.4} speed={0.9} heightOffset={1.1} phase={0} />   {/* Worker */}
        <Butterfly color="#6f86d6" orbitRadius={2.8} speed={0.7} heightOffset={1.4} phase={2.2} /> {/* Critic */}
        <Butterfly color="#ec008c" orbitRadius={2.0} speed={1.1} heightOffset={0.9} phase={4.4} /> {/* Opponent */}

        {/* 6. Picket Fences Borders */}
        {/* Back Border */}
        <Fence position={[-4.5, 0, -6.5]} />
        <Fence position={[-3, 0, -6.5]} />
        <Fence position={[-1.5, 0, -6.5]} />
        <Fence position={[0, 0, -6.5]} />
        <Fence position={[1.5, 0, -6.5]} />
        <Fence position={[3, 0, -6.5]} />
        <Fence position={[4.5, 0, -6.5]} />
        {/* Front Border */}
        <Fence position={[-4.5, 0, 6.5]} />
        <Fence position={[-3, 0, 6.5]} />
        <Fence position={[-1.5, 0, 6.5]} />
        <Fence position={[0, 0, 6.5]} />
        <Fence position={[1.5, 0, 6.5]} />
        <Fence position={[3, 0, 6.5]} />
        <Fence position={[4.5, 0, 6.5]} />

        {/* 7. Flat Stepping Stones (Paths) */}
        {/* Path from Well to Left Tree */}
        <mesh position={[-1.0, 0.01, -0.65]} rotation={[-Math.PI / 2, 0, 0.4]}>
          <cylinderGeometry args={[0.22, 0.22, 0.02, 8]} />
          <meshStandardMaterial color="#948c82" roughness={0.9} />
        </mesh>
        <mesh position={[-2.0, 0.01, -1.3]} rotation={[-Math.PI / 2, 0, 0.4]}>
          <cylinderGeometry args={[0.24, 0.24, 0.02, 8]} />
          <meshStandardMaterial color="#948c82" roughness={0.9} />
        </mesh>
        {/* Path from Well to Right Tree */}
        <mesh position={[1.0, 0.01, -0.65]} rotation={[-Math.PI / 2, 0, -0.4]}>
          <cylinderGeometry args={[0.22, 0.22, 0.02, 8]} />
          <meshStandardMaterial color="#948c82" roughness={0.9} />
        </mesh>
        <mesh position={[2.0, 0.01, -1.3]} rotation={[-Math.PI / 2, 0, -0.4]}>
          <cylinderGeometry args={[0.24, 0.24, 0.02, 8]} />
          <meshStandardMaterial color="#948c82" roughness={0.9} />
        </mesh>

        {/* 8. Weather Effects System */}
        <WeatherSystem isRainy={isRainy} />

        {/* Grass Terrain Base Plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[40, 40]} />
          <meshStandardMaterial
            color={grassColor}
            roughness={0.95}
          />
        </mesh>

        {/* Soft Shadow Layer */}
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.3}
          scale={15}
          blur={1.6}
          far={4.0}
        />

        <OrbitControls
          makeDefault
          maxPolarAngle={Math.PI / 2 - 0.08}
          minDistance={3.5}
          maxDistance={22}
        />
      </Canvas>

      {/* Screen-space Raycast HUD Overlay Tooltip Card */}
      {uiVisible && hoveredInfo && (
        <div
          style={{
            position: 'absolute',
            left: hoveredInfo.x + 20,
            top: hoveredInfo.y + 15,
            pointerEvents: 'none',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid #e8e4df',
            borderRadius: '12px',
            padding: '14px',
            color: '#1b1b22',
            boxShadow: '0 8px 32px rgba(68, 80, 183, 0.08)',
            zIndex: 100,
            width: '240px',
            fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
            transition: 'opacity 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: hoveredInfo.node.id === 'well-core' 
                  ? '#8e44ad' 
                  : hoveredInfo.node.id.startsWith('epic-') 
                    ? 'var(--secondary)' 
                    : hoveredInfo.node.id.includes('-pr') 
                      ? 'var(--primary)' 
                      : 'var(--error)',
                background: hoveredInfo.node.id === 'well-core'
                  ? 'rgba(142, 68, 173, 0.08)'
                  : hoveredInfo.node.id.startsWith('epic-')
                    ? 'rgba(132, 85, 255, 0.08)'
                    : hoveredInfo.node.id.includes('-pr')
                      ? 'rgba(68, 80, 183, 0.08)'
                      : 'rgba(186, 26, 26, 0.08)',
                padding: '3px 6px',
                borderRadius: '6px',
              }}
            >
              {hoveredInfo.node.id === 'well-core' 
                ? 'World Health Core' 
                : hoveredInfo.node.id.startsWith('epic-') 
                  ? 'Epic Category' 
                  : hoveredInfo.node.id.includes('-pr') 
                    ? 'Pull Request' 
                    : 'Backlog Issue'}
            </span>
            <span style={{ fontSize: '10px', color: '#888', fontFamily: 'var(--mono-font)' }}>
              {hoveredInfo.node.id === 'well-core' ? '' : hoveredInfo.node.id}
            </span>
          </div>

          <div style={{ fontWeight: 800, fontSize: '13px', color: '#1b1b22', lineHeight: '1.4', marginBottom: '8px' }}>
            {hoveredInfo.node.title}
          </div>

          {/* Progress Bar HUD */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#454652', marginBottom: '6px' }}>
            <span style={{ width: '55px', fontWeight: 600 }}>
              {hoveredInfo.node.id === 'well-core' ? 'CRR Index:' : 'Progress:'}
            </span>
            <div style={{ flexGrow: 1, background: '#e8e4df', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${hoveredInfo.node.progress * 100}%`,
                  background: hoveredInfo.node.progress > 0.5 ? 'var(--success)' : 'var(--error)',
                  height: '100%',
                }}
              />
            </div>
            <span style={{ fontWeight: 700 }}>
              {hoveredInfo.node.id === 'well-core' 
                ? `${(hoveredInfo.node.progress * 2).toFixed(2)}x`
                : `${Math.round(hoveredInfo.node.progress * 100)}%`}
            </span>
          </div>

          {/* Risk Level HUD */}
          <div style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', color: '#454652' }}>
            <span style={{ fontWeight: 600 }}>Risk Factor:</span>
            <span
              style={{
                color: hoveredInfo.node.risk > 0.6 ? 'var(--error)' : hoveredInfo.node.risk > 0.35 ? '#d35400' : 'var(--success)',
                fontWeight: 800,
              }}
            >
              {(hoveredInfo.node.risk * 10).toFixed(1)} / 10
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
