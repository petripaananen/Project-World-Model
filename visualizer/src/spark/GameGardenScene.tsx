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

/**
 * GameGardenScene.tsx
 *
 * Classical Garden — Project World Model Visualization
 * A small, cozy Stardew-Valley-style garden where project data maps
 * to garden elements. Visible all at once — no navigation required.
 *
 * Visual map:
 *   Well         → World Core / CRR health (stone well, water color = health)
 *   Bushes       → PR nodes  (green=approved, gold=pending, grey=draft)
 *   Weeds        → Issue nodes (red=critical/active, amber=warning, grey=backlog)
 *   Butterflies  → Agents orbiting the well (cyan/violet/coral)
 *   Grass        → Ground (lush green=healthy, yellowing=debt warning)
 *   Stone path   → Dependency structure (cross-path)
 *   Hedge fence  → Project boundary
 *   Corner oaks  → Stable infrastructure pillars
 */

import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FusedNode {
  id: string;
  type: string;
  name: string;
  attributes: Record<string, any>;
}

export interface GameGardenSceneProps {
  active: boolean;
  crr?: number;
  projectName?: string;
  graph?: { nodes: FusedNode[]; edges: any[] };
  qaLimit?: number;
  opponentLimit?: number;
  eventCount?: number;
  onSelectNode?: (node: FusedNode | null) => void;
  sprintVelocity?: number;
  filters?: {
    showEpics: boolean;
    showBees: boolean;
    showSubtasks: boolean;
    showWebs: boolean;
    showDewdrops: boolean;
    showVines: boolean;
    showWeather: boolean;
    showAgents: boolean;
  };
  uiVisible?: boolean;
}

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  grassHealthy:  '#4a8c3f',
  grassDebt:     '#8b7d2a',
  stone:         '#b8a898',
  stoneDark:     '#8a7b6a',
  stonePath:     '#c8baa8',
  water:         '#5ba8d4',
  waterDry:      '#9b8c6a',
  hedgeGreen:    '#2d5a28',
  oakTrunk:      '#7a5c3a',
  oakLeaves:     '#2d6e28',
  prApproved:    '#3aaa5e',
  prPending:     '#d4a520',
  prDraft:       '#8a9090',
  issueCrit:     '#c44030',
  issueWarn:     '#d47820',
  issueBack:     '#6a7a7a',
  agentWorker:   '#28a8c8',
  agentCritic:   '#9855d4',
  agentOpponent: '#d45530',
  sky:           '#c8e8f5',
  skyDebt:       '#e8d8b0',
};

const SEASONS = {
  summer: {
    grass: '#4a8c3f',
    leaves: '#2d6e28',
    sky: '#c8e8f5',
    fogFar: 28,
  },
  lateSummer: {
    grass: '#7b8c3f',
    leaves: '#5c7d2c',
    sky: '#dcedf5',
    fogFar: 25,
  },
  autumn: {
    grass: '#8b7d2a',
    leaves: '#a86e2d',
    sky: '#e8d8b0',
    fogFar: 20,
  }
};

function prColor(node: FusedNode) {
  const s = node.attributes.status?.toLowerCase() || '';
  if (s === 'approved') return C.prApproved;
  if (s === 'draft')    return C.prDraft;
  return C.prPending;
}

function issueColor(node: FusedNode) {
  const s = node.attributes.status?.toLowerCase() || '';
  if (s === 'active')   return C.issueCrit;
  if (s === 'backlog')  return C.issueBack;
  return C.issueWarn;
}

// ─── Layout helpers ───────────────────────────────────────────────────────────
function ring(count: number, radius: number, startAngle = 0) {
  return Array.from({ length: count }, (_, i) => {
    const a = startAngle + (i / Math.max(count, 1)) * Math.PI * 2;
    return [Math.cos(a) * radius, 0, Math.sin(a) * radius] as [number, number, number];
  });
}

const EPIC_CENTERS: [number, number][] = [
  [-2.4, -2.4], // Bottom-Left
  [ 2.4, -2.4], // Bottom-Right
  [-2.4,  2.4], // Top-Left
  [ 2.4,  2.4]  // Top-Right
];

function EpicGardenBed({ x, z, name }: { x: number; z: number; name: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <group 
      position={[x, 0.01, z]}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      {/* Soil bed */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2.0, 2.0]} />
        <meshStandardMaterial color="#3a2512" roughness={0.9} />
      </mesh>
      {/* Wooden border - 4 sides */}
      <mesh position={[0, 0.06, 1.0]} castShadow>
        <boxGeometry args={[2.08, 0.12, 0.08]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.06, -1.0]} castShadow>
        <boxGeometry args={[2.08, 0.12, 0.08]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.85} />
      </mesh>
      <mesh position={[1.0, 0.06, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[2.08, 0.12, 0.08]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.85} />
      </mesh>
      <mesh position={[-1.0, 0.06, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[2.08, 0.12, 0.08]} />
        <meshStandardMaterial color="#5a3d28" roughness={0.85} />
      </mesh>
      {hovered && (
        <Html position={[0, 0.4, 0]} center zIndexRange={[100, 0]}>
          <div className="garden-tooltip" style={{ minWidth: '120px' }}>
            <span className="garden-badge terrain-badge" style={{ background: 'var(--primary)' }}>EPIC</span>
            <strong>{name}</strong>
            <p>Garden plot grouping related issues and PRs.</p>
          </div>
        </Html>
      )}
    </group>
  );
}

function AssigneeBee({ targetPos, name }: { targetPos: [number, number, number]; name: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.elapsedTime;
    const r = 0.4;
    const speed = 2.0;
    const orbitX = Math.cos(time * speed) * r;
    const orbitZ = Math.sin(time * speed) * r;
    const bobY = Math.sin(time * 5) * 0.06 + 0.35;
    
    groupRef.current.position.set(
      targetPos[0] + orbitX,
      targetPos[1] + bobY,
      targetPos[2] + orbitZ
    );
    groupRef.current.rotation.y = -time * speed - Math.PI / 2;
  });
  
  return (
    <group 
      ref={groupRef}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      {/* Bee Body */}
      <mesh castShadow scale={[1, 0.7, 0.7]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#fcd116" roughness={0.5} />
      </mesh>
      {/* Bee Stripes */}
      <mesh position={[0.015, 0, 0]} scale={[0.9, 0.65, 0.65]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-0.015, 0, 0]} scale={[0.9, 0.65, 0.65]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Bee Wings */}
      <mesh position={[0, 0.035, 0.022]} rotation={[0.2, 0, 0.2]}>
        <boxGeometry args={[0.015, 0.003, 0.06]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.65} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.035, -0.022]} rotation={[-0.2, 0, -0.2]}>
        <boxGeometry args={[0.015, 0.003, 0.06]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.65} roughness={0.1} />
      </mesh>
      {hovered && (
        <Html position={[0, 0.18, 0]} center zIndexRange={[100, 0]}>
          <div className="garden-tooltip" style={{ minWidth: '100px' }}>
            <span className="garden-badge terrain-badge" style={{ background: '#fcd116', color: '#1a1a1a' }}>ASSIGNEE</span>
            <strong>{name}</strong>
            <p>Assigned team member bee.</p>
          </div>
        </Html>
      )}
    </group>
  );
}

function RainParticles({ count = 80 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sp = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10.0;
      pos[i * 3 + 1] = Math.random() * 5.0 + 1.0;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10.0;
      sp[i * 3 + 1] = -2.5 - Math.random() * 2.0; // fall down fast
    }
    return [pos, sp];
  }, [count]);
  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      let y = posAttr.getY(i);
      y += speeds[i * 3 + 1] * delta;
      if (y < 0.05) {
        y = 5.0; // respawn at top
        posAttr.setX(i, (Math.random() - 0.5) * 10.0);
        posAttr.setZ(i, (Math.random() - 0.5) * 10.0);
      }
      posAttr.setY(i, y);
    }
    posAttr.needsUpdate = true;
  });
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#94d0f5" size={0.045} transparent opacity={0.65} sizeAttenuation />
    </points>
  );
}

// ─── Ground: grass + stone cross-paths ────────────────────────────────────────
function GardenGround({ grassColor }: { grassColor: string }) {
  const [hovered, setHovered] = useState(false);
  const handleOver = (e: any) => { e.stopPropagation(); setHovered(true); };
  const handleOut = (e: any) => { e.stopPropagation(); setHovered(false); };
  return (
    <group>
      {/* Grass base */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]} 
        receiveShadow
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      >
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color={grassColor} roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Stone path — horizontal */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0.005, 0]} 
        receiveShadow
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      >
        <planeGeometry args={[0.7, 10]} />
        <meshStandardMaterial color={C.stonePath} roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Stone path — vertical */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0.005, 0]} 
        receiveShadow
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      >
        <planeGeometry args={[10, 0.7]} />
        <meshStandardMaterial color={C.stonePath} roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Path stones (decorative rectangles) */}
      {[-3.5, -2.5, -1.5, 1.5, 2.5, 3.5].map((x, i) => (
        <mesh 
          key={`hpath-${i}`} 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[x, 0.007, 0]}
          onPointerOver={handleOver}
          onPointerOut={handleOut}
        >
          <planeGeometry args={[0.5, 0.55]} />
          <meshStandardMaterial color={C.stone} roughness={0.85} metalness={0.15} />
        </mesh>
      ))}
      {[-3.5, -2.5, -1.5, 1.5, 2.5, 3.5].map((z, i) => (
        <mesh 
          key={`vpath-${i}`} 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, 0.007, z]}
          onPointerOver={handleOver}
          onPointerOut={handleOut}
        >
          <planeGeometry args={[0.55, 0.5]} />
          <meshStandardMaterial color={C.stone} roughness={0.85} metalness={0.15} />
        </mesh>
      ))}

      {hovered && (
        <Html position={[0, 0.3, 0]} center zIndexRange={[100, 0]}>
          <div className="garden-tooltip">
            <span className="garden-badge terrain-badge">TERRAIN</span>
            <strong>Workspace Status Grass</strong>
            <p>Lush green represents healthy status. Yellowing/wilted grass signals integration debt.</p>
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Central stone well (World Core) ──────────────────────────────────────────
function GardenWell({ crr, eventCount = 0 }: { crr?: number; eventCount?: number }) {
  const waterRef = useRef<THREE.Mesh>(null);
  const waterMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const isDebt = crr !== undefined && crr >= 1.0;
  const waterColor = isDebt ? C.waterDry : C.water;

  // Track ripples from websocket/webhook events
  const lastEventCountRef = useRef(eventCount);
  const rippleTimeRef = useRef(-999);

  if (eventCount !== lastEventCountRef.current) {
    lastEventCountRef.current = eventCount;
    rippleTimeRef.current = 0; // reset
  }

  useFrame((state, delta) => {
    if (waterRef.current) {
      waterRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
    if (waterMatRef.current) {
      const wave = Math.sin(state.clock.elapsedTime * 2.0) * 0.08 + 0.82;
      waterMatRef.current.opacity = wave;
      
      const baseColor = new THREE.Color(waterColor);
      const shimmerColor = new THREE.Color('#94d0f5');
      const lerpFactor = (Math.cos(state.clock.elapsedTime * 3.5) + 1.0) * 0.15;
      waterMatRef.current.color.copy(baseColor).lerp(shimmerColor, lerpFactor);
    }
    if (rippleTimeRef.current >= 0) {
      rippleTimeRef.current += delta;
      if (rippleTimeRef.current > 1.2) {
        rippleTimeRef.current = -999;
      }
    }
  });

  // Calculate ripple dimensions
  const rippleVal = rippleTimeRef.current;
  const rippleRadius = rippleVal >= 0 ? rippleVal * 0.28 : 0;
  const rippleInner = Math.max(0.01, rippleRadius - 0.03);

  return (
    <group 
      position={[0, 0, 0]}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      {/* Stone base */}
      <mesh castShadow receiveShadow position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.55, 0.62, 0.6, 12]} />
        <meshStandardMaterial color={C.stone} roughness={0.85} metalness={0.15} />
      </mesh>

      {/* Inner dark shaft */}
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.38, 0.38, 0.18, 12]} />
        <meshStandardMaterial color="#2a2018" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Water surface */}
      <mesh ref={waterRef} position={[0, 0.58, 0]}>
        <circleGeometry args={[0.35, 12]} />
        <meshStandardMaterial 
          ref={waterMatRef} 
          color={waterColor} 
          roughness={0.1} 
          metalness={0.8} 
          transparent 
          opacity={0.85} 
        />
      </mesh>

      {/* Ripple ring */}
      {rippleVal >= 0 && (
        <mesh position={[0, 0.59, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[rippleInner, rippleRadius, 16]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={1.0 - (rippleVal / 1.2)} />
        </mesh>
      )}

      {/* Rim */}
      <mesh position={[0, 0.62, 0]} castShadow>
        <torusGeometry args={[0.56, 0.07, 6, 12]} />
        <meshStandardMaterial color={C.stoneDark} roughness={0.85} metalness={0.15} />
      </mesh>

      {/* Wooden crossbeam */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[1.1, 0.08, 0.08]} />
        <meshStandardMaterial color={C.oakTrunk} roughness={0.9} metalness={0.05} />
      </mesh>
      <mesh position={[0.55, 1.3, 0]} castShadow>
        <boxGeometry args={[0.08, 0.6, 0.08]} />
        <meshStandardMaterial color={C.oakTrunk} roughness={0.9} metalness={0.05} />
      </mesh>
      <mesh position={[-0.55, 1.3, 0]} castShadow>
        <boxGeometry args={[0.08, 0.6, 0.08]} />
        <meshStandardMaterial color={C.oakTrunk} roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Roof */}
      <mesh position={[0, 1.68, 0]} castShadow>
        <coneGeometry args={[0.75, 0.35, 4]} />
        <meshStandardMaterial color="#8b3a20" roughness={0.7} metalness={0.1} />
      </mesh>

      {/* CRR label */}
      {!hovered && (
        <Html position={[0, 2.1, 0]} center>
          <div className="garden-well-label">
            <span className="garden-well-title">CRR</span>
            <span
              className="garden-well-value"
              style={{ color: isDebt ? '#d47820' : '#3aaa5e' }}
            >
              {crr !== undefined ? crr.toFixed(2) + 'x' : '—'}
            </span>
          </div>
        </Html>
      )}

      {hovered && (
        <Html position={[0, 2.3, 0]} center zIndexRange={[100, 0]}>
          <div className="garden-tooltip">
            <span className="garden-badge well-badge">CORE</span>
            <strong>Causal Digital Twin Core</strong>
            <p>CRR: {crr !== undefined ? crr.toFixed(2) : '—'}x</p>
            <p>Health: {isDebt ? 'Critical Debt' : 'Optimal state'}</p>
            <p>Coordinates the agent swarm simulations.</p>
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Corner oak tree ──────────────────────────────────────────────────────────
function OakTree({ position, leavesColor }: { position: [number, number, number]; leavesColor: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <group 
      position={position}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      {/* Trunk */}
      <mesh castShadow position={[0, 0.65, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 1.3, 7]} />
        <meshStandardMaterial color={C.oakTrunk} roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Multi-lobe Canopy */}
      {/* Main Center */}
      <mesh castShadow position={[0, 1.9, 0]}>
        <sphereGeometry args={[0.65, 12, 10]} />
        <meshStandardMaterial color={leavesColor} roughness={0.9} metalness={0.1} />
      </mesh>
      {/* Lobe 1: Left Top */}
      <mesh castShadow position={[-0.3, 2.1, 0.1]}>
        <sphereGeometry args={[0.48, 8, 8]} />
        <meshStandardMaterial color={leavesColor} roughness={0.9} metalness={0.1} />
      </mesh>
      {/* Lobe 2: Right Back */}
      <mesh castShadow position={[0.35, 1.95, -0.2]}>
        <sphereGeometry args={[0.52, 8, 8]} />
        <meshStandardMaterial color={leavesColor} roughness={0.9} metalness={0.1} />
      </mesh>
      {/* Lobe 3: Front Lower */}
      <mesh castShadow position={[0.1, 1.75, 0.35]}>
        <sphereGeometry args={[0.45, 8, 8]} />
        <meshStandardMaterial color={leavesColor} roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Lower supporting foliage */}
      <mesh castShadow position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.55, 8, 6]} />
        <meshStandardMaterial color={C.hedgeGreen} roughness={0.9} metalness={0.1} />
      </mesh>

      {hovered && (
        <Html position={[0, 2.8, 0]} center zIndexRange={[100, 0]}>
          <div className="garden-tooltip">
            <span className="garden-badge tree-badge">INFRA</span>
            <strong>Stable Infrastructure Pillar</strong>
            <p>Represents foundational packages and configuration files.</p>
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Hedge fence (border) ─────────────────────────────────────────────────────
function HedgeFence() {
  const [hovered, setHovered] = useState(false);
  const posts: [number, number, number][] = [];
  for (let i = -4; i <= 4; i += 0.9) {
    posts.push([i, 0, -5]);
    posts.push([i, 0,  5]);
    posts.push([-5, 0, i]);
    posts.push([ 5, 0, i]);
  }

  return (
    <group
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      {posts.map((p, i) => (
        <mesh key={i} position={[p[0], 0.35, p[2]]} castShadow>
          <capsuleGeometry args={[0.22, 0.35, 4, 8]} />
          <meshStandardMaterial color={C.hedgeGreen} roughness={0.85} metalness={0.1} />
        </mesh>
      ))}

      {hovered && (
        <Html position={[0, 1.2, 0]} center zIndexRange={[100, 0]}>
          <div className="garden-tooltip">
            <span className="garden-badge fence-badge">LIMIT</span>
            <strong>Project Scope Boundary</strong>
            <p>Defines the workspace packages context and boundary limits.</p>
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── PR node: flowering bush ──────────────────────────────────────────────────
function FlowerBush({
  node,
  position,
  onSelectNode,
  showBees = true,
  showDewdrops = true,
}: {
  node: FusedNode;
  position: [number, number, number];
  onSelectNode?: (node: FusedNode | null) => void;
  showBees?: boolean;
  showDewdrops?: boolean;
}) {
  const bushRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const color = prColor(node);
  const shortName = node.name.split(':')[0].trim();
  const status = node.attributes.status?.toLowerCase() || '';

  // Data-driven sizing: based on reviews count & story points
  const reviewsCount = node.attributes.reviews ?? 0;
  const storyPoints = node.attributes.storyPoints ?? 3;
  const thicknessScale = 0.8 + (storyPoints / 8) * 0.55;
  const sizeMult = (0.85 + reviewsCount * 0.15) * thicknessScale;
  const comments = node.attributes.commentCount || 0;

  useFrame((state) => {
    if (!bushRef.current) return;
    const t = state.clock.elapsedTime;
    // Gentle wind sway
    const swayX = Math.sin(t * 1.5 + position[0] * 1.5) * 0.04;
    const swayZ = Math.cos(t * 1.2 + position[2] * 1.5) * 0.04;
    bushRef.current.rotation.x = swayX;
    bushRef.current.rotation.z = swayZ;
  });

  return (
    <group position={position} scale={[sizeMult, sizeMult, sizeMult]}>
      {/* Soil mound */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <cylinderGeometry args={[0.28, 0.32, 0.12, 8]} />
        <meshStandardMaterial color="#6b4c2a" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Bush body */}
      <mesh
        ref={bushRef}
        position={[0, status === 'draft' ? 0.36 : 0.48, 0]}
        scale={status === 'draft' ? [1.2, 0.45, 1.2] : [1, 1, 1]}
        castShadow
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
        onClick={(e) => { e.stopPropagation(); onSelectNode?.(node); }}
      >
        {status === 'approved' ? (
          <sphereGeometry args={[0.35, 8, 6]} />
        ) : status === 'draft' ? (
          <sphereGeometry args={[0.35, 8, 6]} />
        ) : (
          <capsuleGeometry args={[0.18, 0.42, 4, 8]} />
        )}
        <meshStandardMaterial color={hovered ? '#ffffff' : color} roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Flowers on top with emissive glow */}
      {[0, 1.2, 2.4, 3.6, 4.8].map((a, i) => {
        const flowerColor = color === C.prApproved ? '#ffe066' : color === C.prDraft ? '#c0c8c8' : '#f5f0c8';
        return (
          <mesh key={i} position={[Math.cos(a) * 0.22, status === 'draft' ? 0.45 : 0.75, Math.sin(a) * 0.22]}>
            <sphereGeometry args={[0.08, 5, 4]} />
            <meshStandardMaterial 
              color={flowerColor} 
              roughness={0.6} 
              metalness={0.1} 
              emissive={flowerColor} 
              emissiveIntensity={0.6} 
            />
          </mesh>
        );
      })}

      {/* Assignee Bee */}
      {node.attributes.author && showBees && (
        <AssigneeBee name={node.attributes.author} targetPos={[0, status === 'draft' ? 0.36 : 0.48, 0]} />
      )}

      {/* Comment Dewdrops */}
      {showDewdrops && comments > 0 && Array.from({ length: Math.min(comments, 5) }).map((_, dewIdx) => {
        const angle = (dewIdx / 5) * Math.PI * 2;
        const dewRadius = 0.24;
        const dewX = Math.cos(angle) * dewRadius;
        const dewZ = Math.sin(angle) * dewRadius;
        const dewY = (status === 'draft' ? 0.36 : 0.48) + Math.sin(dewIdx) * 0.08;
        return (
          <mesh key={dewIdx} position={[dewX, dewY, dewZ]} castShadow>
            <sphereGeometry args={[0.032, 6, 6]} />
            <meshStandardMaterial color="#ffffff" roughness={0.02} metalness={0.95} transparent opacity={0.85} />
          </mesh>
        );
      })}

      {hovered && (
        <Html position={[0, 1.4, 0]} center zIndexRange={[100, 0]}>
          <div className="garden-tooltip">
            <span className="garden-badge pr-badge">PR</span>
            <strong>{node.name}</strong>
            <p>Status: {node.attributes.status}</p>
            {node.attributes.epic && <p>Epic: {node.attributes.epic}</p>}
            {node.attributes.storyPoints && <p>Estimate: {node.attributes.storyPoints} pts</p>}
            {node.attributes.author && <p>Author: {node.attributes.author}</p>}
          </div>
        </Html>
      )}

      <Html position={[0, -0.1, 0]} center>
        <div className="garden-tag" style={{ color }}>
          {shortName}
        </div>
      </Html>
    </group>
  );
}

// ─── Issue node: wilted weed ──────────────────────────────────────────────────
function WeedNode({
  node,
  position,
  onSelectNode,
  showBees = true,
  showDewdrops = true,
  showSubtasks = true,
  showWebs = true,
}: {
  node: FusedNode;
  position: [number, number, number];
  onSelectNode?: (node: FusedNode | null) => void;
  showBees?: boolean;
  showDewdrops?: boolean;
  showSubtasks?: boolean;
  showWebs?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Status and details
  const status = node.attributes.status?.toLowerCase() || '';
  const isBacklog = status === 'backlog';
  const isDone = status === 'done' || status === 'approved';
  const isBlocked = !!node.attributes.flagged;
  const comments = node.attributes.commentCount || 0;
  const storyPoints = node.attributes.storyPoints ?? 3;
  const priority = node.attributes.priority?.toLowerCase() || 'medium';
  const component = node.attributes.component || '';
  const dueDays = node.attributes.dueDaysRemaining;
  const subTasks = node.attributes.subTasks || [];

  // Colors
  let baseColor = issueColor(node);
  if (isDone) baseColor = '#e8d8b0'; // daisy core color

  // Due date wilting adjustments
  let rotationX = 0;
  let rotationZ = 0;
  const finalColor = new THREE.Color(baseColor);
  if (dueDays !== undefined && !isDone) {
    if (dueDays < 0) {
      rotationX = 0.65;
      rotationZ = 0.25;
      finalColor.lerp(new THREE.Color('#7a5c3a'), 0.85); // brown dead leaf color
    } else if (dueDays <= 2) {
      rotationX = 0.35;
      finalColor.lerp(new THREE.Color('#8b7d2a'), 0.5); // yellowing/wilted color
    }
  }

  // Sizing
  const sizeMult = priority === 'high' ? 1.25 : priority === 'low' ? 0.75 : 1.0;
  const thicknessScale = 0.75 + (storyPoints / 8) * 0.75;
  const heightScale = sizeMult;

  // Emissive and hover colors
  const weedColorStr = hovered ? '#ffffff' : `#${finalColor.getHexString()}`;

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    // Gentle wind sway
    const swayX = Math.sin(t * 1.4 + position[0] * 1.5) * 0.03 + rotationX;
    const swayZ = Math.cos(t * 1.2 + position[2] * 1.5) * 0.03 + rotationZ;
    groupRef.current.rotation.x = swayX;
    groupRef.current.rotation.z = swayZ;
  });

  const soilColor = node.attributes.riskProbability > 0.6 ? '#1c120c' : node.attributes.riskProbability > 0.3 ? '#3a2b1f' : '#6b4c2a';

  return (
    <group position={position}>
      {/* Dark debt patch */}
      {node.attributes.riskProbability > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow>
          <ringGeometry args={[0, 0.45 + node.attributes.riskProbability * 0.65, 16]} />
          <meshBasicMaterial color="#0c0702" transparent opacity={0.15 + node.attributes.riskProbability * 0.35} />
        </mesh>
      )}

      {/* Soil mound */}
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <cylinderGeometry args={[0.22, 0.26, 0.08, 8]} />
        <meshStandardMaterial color={soilColor} roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Sub-task Mushrooms / Sprouts at the base */}
      {showSubtasks && subTasks.map((st: any, idx: number) => {
        const angle = (idx / Math.max(subTasks.length, 1)) * Math.PI * 2;
        const r = 0.32;
        const mushX = Math.cos(angle) * r;
        const mushZ = Math.sin(angle) * r;
        const completed = st.status === 'Done';
        return (
          <group key={idx} position={[mushX, 0.05, mushZ]}>
            {completed ? (
              // Completed sub-task -> Tiny White Flower
              <group>
                <mesh position={[0, 0.05, 0]}>
                  <cylinderGeometry args={[0.008, 0.008, 0.1, 4]} />
                  <meshStandardMaterial color="#4a8c3f" />
                </mesh>
                <mesh position={[0, 0.1, 0]}>
                  <sphereGeometry args={[0.024, 6, 6]} />
                  <meshStandardMaterial color="#ffe066" />
                </mesh>
                {/* Petals */}
                <mesh position={[0, 0.1, 0]} rotation={[Math.PI/2, 0, 0]}>
                  <torusGeometry args={[0.038, 0.008, 4, 8]} />
                  <meshStandardMaterial color="#ffffff" />
                </mesh>
              </group>
            ) : (
              // Incomplete sub-task -> Tiny Red/Orange Mushroom
              <group>
                <mesh position={[0, 0.04, 0]}>
                  <cylinderGeometry args={[0.012, 0.012, 0.08, 4]} />
                  <meshStandardMaterial color="#eeeeee" roughness={0.9} />
                </mesh>
                <mesh position={[0, 0.075, 0]}>
                  <sphereGeometry args={[0.03, 6, 6]} />
                  <meshStandardMaterial color="#c44030" roughness={0.5} />
                </mesh>
              </group>
            )}
          </group>
        );
      })}

      <group 
        ref={groupRef} 
        scale={[thicknessScale, heightScale, thicknessScale]} 
        onClick={(e) => { e.stopPropagation(); onSelectNode?.(node); }}
      >
        {isBacklog ? (
          // BACKLOG: Dormant Seed Pod on the ground
          <mesh position={[0, 0.06, 0]} castShadow>
            <sphereGeometry args={[0.16, 8, 8]} />
            <meshStandardMaterial color="#5c4033" roughness={0.9} metalness={0.1} />
          </mesh>
        ) : isDone ? (
          // DONE: Beautiful white daisy
          <group>
            {/* Stem */}
            <mesh position={[0, 0.28, 0]} castShadow>
              <cylinderGeometry args={[0.02, 0.025, 0.56, 6]} />
              <meshStandardMaterial color="#4a8c3f" roughness={0.8} />
            </mesh>
            {/* Center Yellow Sphere */}
            <mesh position={[0, 0.56, 0]} castShadow>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshStandardMaterial color="#ffe066" roughness={0.5} emissive="#ffe066" emissiveIntensity={0.2} />
            </mesh>
            {/* Petals */}
            <mesh position={[0, 0.56, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.13, 0.028, 4, 12]} />
              <meshStandardMaterial color="#ffffff" roughness={0.6} />
            </mesh>
          </group>
        ) : (
          // ACTIVE / IN-PROGRESS / WILTED WEEDS
          <group>
            {/* Render different geometries based on Component Labels */}
            {component === 'Frontend' ? (
              // Fern-like geometry (leafy, multiple thin stems splayed out)
              <group>
                {[-0.14, -0.05, 0.05, 0.14].map((_, i) => {
                  const angle = (i - 1.5) * 0.28;
                  return (
                    <group key={i} rotation={[0, 0, angle]}>
                      <mesh position={[0, 0.22, 0]} castShadow>
                        <cylinderGeometry args={[0.015, 0.022, 0.44, 4]} />
                        <meshStandardMaterial color={weedColorStr} roughness={0.85} />
                      </mesh>
                      <mesh position={[0, 0.42, 0]} castShadow>
                        <sphereGeometry args={[0.06, 6, 6]} />
                        <meshStandardMaterial color={weedColorStr} roughness={0.7} />
                      </mesh>
                    </group>
                  );
                })}
              </group>
            ) : component === 'Database' ? (
              // Cactus-like geometry (thick core cylinder + short side arms)
              <group>
                {/* Core stem */}
                <mesh position={[0, 0.24, 0]} castShadow>
                  <cylinderGeometry args={[0.06, 0.065, 0.48, 8]} />
                  <meshStandardMaterial color={weedColorStr} roughness={0.9} />
                </mesh>
                {/* Side branch 1 */}
                <mesh position={[0.08, 0.28, 0]} rotation={[0, 0, 0.5]} castShadow>
                  <cylinderGeometry args={[0.03, 0.03, 0.15, 6]} />
                  <meshStandardMaterial color={weedColorStr} roughness={0.9} />
                </mesh>
                {/* Side branch 2 */}
                <mesh position={[-0.08, 0.2, 0]} rotation={[0, 0, -0.5]} castShadow>
                  <cylinderGeometry args={[0.03, 0.03, 0.15, 6]} />
                  <meshStandardMaterial color={weedColorStr} roughness={0.9} />
                </mesh>
              </group>
            ) : (
              // Default component (Backend or none): Spiky dandelion weed (standard 3 stems + dodecahedrons)
              <group>
                {/* Stems */}
                {[-0.1, 0, 0.1].map((ox, i) => (
                  <mesh key={i} position={[ox, 0.22 + i * 0.04, ox * 0.4]} rotation={[0.2 * (i - 1), 0, 0.15 * (i - 1)]} castShadow>
                    <cylinderGeometry args={[0.025, 0.03, 0.44 + i * 0.06, 5]} />
                    <meshStandardMaterial color={weedColorStr} roughness={0.8} />
                  </mesh>
                ))}
                {/* Wilted flower heads */}
                {[-0.1, 0, 0.1].map((ox, i) => (
                  <mesh
                    key={`head-${i}`}
                    position={[ox * 1.2, 0.48 + i * 0.04, ox * 0.5]}
                    castShadow
                    onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
                    onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
                  >
                    <dodecahedronGeometry args={[0.09, 0]} />
                    <meshStandardMaterial color={weedColorStr} roughness={0.7} />
                  </mesh>
                ))}
              </group>
            )}

            {/* Dewdrops (Comments activity) on leaves */}
            {showDewdrops && comments > 0 && Array.from({ length: Math.min(comments, 5) }).map((_, dewIdx) => {
              const angle = (dewIdx / 5) * Math.PI * 2;
              const dewRadius = 0.18;
              const dewX = Math.cos(angle) * dewRadius;
              const dewZ = Math.sin(angle) * dewRadius;
              const dewY = 0.22 + Math.sin(dewIdx) * 0.08;
              return (
                <mesh key={dewIdx} position={[dewX, dewY, dewZ]} castShadow>
                  <sphereGeometry args={[0.03, 6, 6]} />
                  <meshStandardMaterial color="#ffffff" roughness={0.02} metalness={0.95} transparent opacity={0.85} />
                </mesh>
              );
            })}
          </group>
        )}
      </group>

      {/* Blocked / Flagged Spider Web wireframe overlay */}
      {showWebs && isBlocked && !isDone && !isBacklog && (
        <mesh position={[0, 0.35, 0]} castShadow>
          <sphereGeometry args={[0.42 * thicknessScale, 8, 8]} />
          <meshStandardMaterial color="#cccccc" wireframe transparent opacity={0.4} />
        </mesh>
      )}

      {/* Assignee Bee */}
      {node.attributes.author && !isBacklog && !isDone && showBees && (
        <AssigneeBee name={node.attributes.author} targetPos={[0, 0.35, 0]} />
      )}

      {/* Hover tooltip HUD */}
      {hovered && (
        <Html position={[0, 1.3, 0]} center zIndexRange={[100, 0]}>
          <div className="garden-tooltip">
            <span className="garden-badge issue-badge">ISSUE</span>
            <strong>{node.name}</strong>
            <p>Status: {node.attributes.status}</p>
            {node.attributes.epic && <p>Epic: {node.attributes.epic}</p>}
            {node.attributes.storyPoints && <p>Estimate: {node.attributes.storyPoints} pts</p>}
            {node.attributes.author && <p>Assignee: {node.attributes.author}</p>}
          </div>
        </Html>
      )}

      <Html position={[0, -0.1, 0]} center>
        <div className="garden-tag" style={{ color: baseColor === '#e8d8b0' ? '#3aaa5e' : baseColor }}>
          {node.name.split(':')[0].trim()}
        </div>
      </Html>
    </group>
  );
}

// ─── Agent butterfly ──────────────────────────────────────────────────────────
function Butterfly({
  role,
  color,
  orbitRadius,
  orbitSpeed,
  orbitOffset,
}: {
  role: string;
  color: string;
  orbitRadius: number;
  orbitSpeed: number;
  orbitOffset: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const leftWingRef = useRef<THREE.Mesh>(null);
  const rightWingRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const wingShape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(0.24, 0.15);
    s.lineTo(0.18, -0.09);
    s.closePath();
    return s;
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime * orbitSpeed + orbitOffset;
    groupRef.current.position.x = Math.cos(t) * orbitRadius;
    groupRef.current.position.z = Math.sin(t) * orbitRadius;
    groupRef.current.position.y = 1.1 + Math.sin(state.clock.elapsedTime * 3 + orbitOffset) * 0.12;
    // Face direction of travel
    groupRef.current.rotation.y = -t + Math.PI / 2;
    
    // Flap wings symmetrically
    const flap = (Math.sin(state.clock.elapsedTime * 15) + 1) * 0.4;
    if (leftWingRef.current) {
      leftWingRef.current.rotation.y = -flap;
    }
    if (rightWingRef.current) {
      rightWingRef.current.rotation.y = flap;
    }

    // Subtle body pulsing to simulate breathing
    const pulse = 1.0 + Math.sin(state.clock.elapsedTime * 8 + orbitOffset) * 0.12;
    if (bodyRef.current) {
      bodyRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Body with emissive glow */}
      <mesh
        ref={bodyRef}
        castShadow
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
      >
        <capsuleGeometry args={[0.06, 0.16, 4, 6]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.5} 
          metalness={0.2} 
          emissive={color} 
          emissiveIntensity={0.8} 
        />
      </mesh>

      {/* Left wing */}
      <mesh ref={leftWingRef} position={[0.05, 0.04, 0]} rotation={[0, 0, 0.1]}>
        <shapeGeometry args={[wingShape]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>

      {/* Right wing */}
      <mesh ref={rightWingRef} position={[-0.05, 0.04, 0]} rotation={[0, 0, -0.1]} scale={[-1, 1, 1]}>
        <shapeGeometry args={[wingShape]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>

      {hovered && (
        <Html position={[0, 0.5, 0]} center zIndexRange={[100, 0]}>
          <div className="garden-tooltip">
            <strong>{role} Agent</strong>
            <p>Pollinating the garden…</p>
          </div>
        </Html>
      )}

      <Html position={[0, 0.55, 0]} center>
        <div className="garden-tag agent-tag" style={{ color }}>
          {role}
        </div>
      </Html>
    </group>
  );
}

// ─── Decorative flower patch (fills empty garden beds) ────────────────────────
function FlowerPatch({ x, z }: { x: number; z: number }) {
  const [hovered, setHovered] = useState(false);
  const flowers = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        dx: (Math.sin(i * 237.1) * 0.4),
        dz: (Math.cos(i * 137.5) * 0.4),
        color: ['#f4c842', '#e87070', '#a8d8a0', '#d4a8e8'][i % 4],
      })),
    []
  );
  return (
    <group 
      position={[x, 0, z]}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      {flowers.map((f, i) => (
        <group key={i} position={[f.dx, 0, f.dz]}>
          <mesh position={[0, 0.14, 0]}>
            <cylinderGeometry args={[0.02, 0.025, 0.28, 5]} />
            <meshStandardMaterial color="#4a8c3f" roughness={0.9} metalness={0.05} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.065, 5, 4]} />
            <meshStandardMaterial color={f.color} roughness={0.6} metalness={0.1} />
          </mesh>
        </group>
      ))}

      {hovered && (
        <Html position={[0, 0.7, 0]} center zIndexRange={[100, 0]}>
          <div className="garden-tooltip">
            <span className="garden-badge patch-badge">ZONE</span>
            <strong>Active Commit Zone</strong>
            <p>Indicates healthy commits and progress areas within the project.</p>
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Dependency Path (stepping stones or crawling vines) ──────────────────────
function DependencyPath({
  start,
  end,
  isBlocked,
}: {
  start: [number, number, number];
  end: [number, number, number];
  isBlocked?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [x1, , z1] = start;
  const [x2, , z2] = end;
  const dx = x2 - x1;
  const dz = z2 - z1;
  const dist = Math.sqrt(dx * dx + dz * dz);
  
  const curve = useMemo(() => {
    const pStart = new THREE.Vector3(...start);
    const pEnd = new THREE.Vector3(...end);
    pStart.y = 0.15;
    pEnd.y = 0.15;
    const pMid = new THREE.Vector3().addVectors(pStart, pEnd).multiplyScalar(0.5);
    pMid.y += Math.min(dist * 0.25, 0.5); // arch height based on distance
    return new THREE.QuadraticBezierCurve3(pStart, pMid, pEnd);
  }, [start, end, dist]);

  const numStones = Math.max(Math.floor(dist / 0.55), 2);
  const stones = useMemo(() => {
    return Array.from({ length: numStones - 1 }, (_, idx) => {
      const t = (idx + 1) / numStones;
      const noiseX = Math.sin(idx * 43.1) * 0.05;
      const noiseZ = Math.cos(idx * 79.3) * 0.05;
      return [x1 + dx * t + noiseX, 0.008, z1 + dz * t + noiseZ] as [number, number, number];
    });
  }, [x1, z1, x2, z2, dist, numStones]);

  if (isBlocked !== undefined) {
    const vineColor = isBlocked ? '#6a2a4b' : '#3d7a42';
    return (
      <group
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
      >
        <mesh castShadow receiveShadow>
          <tubeGeometry args={[curve, 16, 0.024, 6, false]} />
          <meshStandardMaterial color={vineColor} roughness={0.8} />
        </mesh>
        
        {isBlocked && Array.from({ length: 5 }).map((_, idx) => {
          const t = 0.2 + idx * 0.15;
          const pos = curve.getPointAt(t);
          return (
            <mesh key={idx} position={[pos.x, pos.y, pos.z]} rotation={[Math.sin(idx)*Math.PI, 0, Math.cos(idx)*Math.PI]}>
              <coneGeometry args={[0.024, 0.08, 4]} />
              <meshStandardMaterial color="#c44030" roughness={0.7} />
            </mesh>
          );
        })}
        
        {!isBlocked && Array.from({ length: 5 }).map((_, idx) => {
          const t = 0.2 + idx * 0.15;
          const pos = curve.getPointAt(t);
          return (
            <mesh key={idx} position={[pos.x, pos.y, pos.z]} scale={[0.05, 0.02, 0.08]}>
              <sphereGeometry args={[1, 6, 6]} />
              <meshStandardMaterial color="#4a8c3f" roughness={0.9} />
            </mesh>
          );
        })}

        {hovered && (
          <Html position={[curve.getPointAt(0.5).x, curve.getPointAt(0.5).y + 0.4, curve.getPointAt(0.5).z]} center zIndexRange={[100, 0]}>
            <div className="garden-tooltip">
              <span className="garden-badge path-badge" style={{ background: isBlocked ? '#6a2a4b' : '#3d7a42' }}>
                {isBlocked ? 'BLOCKED' : 'PREREQ'}
              </span>
              <strong>{isBlocked ? 'Blocked Dependency Vine' : 'Clear Dependency Vine'}</strong>
              <p>{isBlocked ? 'Indicates a blocking relationship (thorny vine).' : 'Indicates a clear prereq pipeline connection.'}</p>
            </div>
          </Html>
        )}
      </group>
    );
  }

  return (
    <group
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      {stones.map((pos, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, Math.sin(i * 12) * 0.2]} position={pos}>
          <circleGeometry args={[0.07 + (Math.sin(i) * 0.015), 6]} />
          <meshStandardMaterial color={C.stone} roughness={0.8} metalness={0.2} />
        </mesh>
      ))}

      {hovered && (
        <Html position={[0, 0.4, 0]} center zIndexRange={[100, 0]}>
          <div className="garden-tooltip">
            <span className="garden-badge path-badge">DEP</span>
            <strong>Causal Dependency Pathway</strong>
            <p>Links code revisions (PRs) directly to the issues they address.</p>
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Floating pollen / dust particles ─────────────────────────────────────────
function FloatingPollen({ count = 40 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sp = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Spawn particles randomly in a box around the garden (-4.5 to 4.5 on X/Z, 0.5 to 4 on Y)
      pos[i * 3] = (Math.random() - 0.5) * 9.0;
      pos[i * 3 + 1] = 0.5 + Math.random() * 3.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 9.0;

      // Small slow drift speeds
      sp[i * 3] = (Math.random() - 0.5) * 0.15;      // dx
      sp[i * 3 + 1] = 0.05 + Math.random() * 0.15;  // dy (drift up)
      sp[i * 3 + 2] = (Math.random() - 0.5) * 0.15;    // dz
    }
    return [pos, sp];
  }, [count]);

  useFrame((_state, delta) => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    
    for (let i = 0; i < count; i++) {
      let x = posAttr.getX(i);
      let y = posAttr.getY(i);
      let z = posAttr.getZ(i);

      // Apply speed drift
      x += speeds[i * 3] * delta;
      y += speeds[i * 3 + 1] * delta;
      z += speeds[i * 3 + 2] * delta;

      // Wrap-around boundary check
      if (x > 5 || x < -5) speeds[i * 3] *= -1;
      if (z > 5 || z < -5) speeds[i * 3 + 2] *= -1;
      if (y > 4.5) {
        y = 0.5; // respawn at bottom
        x = (Math.random() - 0.5) * 9.0;
        z = (Math.random() - 0.5) * 9.0;
      }

      posAttr.setXYZ(i, x, y, z);
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffe8a0"
        size={0.065}
        transparent
        opacity={0.65}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─── Full 3D scene ────────────────────────────────────────────────────────────
function GardenScene({
  crr,
  graph,
  opponentLimit = 1,
  eventCount = 0,
  onSelectNode,
  sprintVelocity,
  filters = {
    showEpics: true,
    showBees: true,
    showSubtasks: true,
    showWebs: true,
    showDewdrops: true,
    showVines: true,
    showWeather: true,
    showAgents: true,
  },
}: {
  crr?: number;
  graph?: { nodes: FusedNode[]; edges: any[] };
  opponentLimit?: number;
  eventCount?: number;
  onSelectNode?: (node: FusedNode | null) => void;
  sprintVelocity?: number;
  filters?: {
    showEpics: boolean;
    showBees: boolean;
    showSubtasks: boolean;
    showWebs: boolean;
    showDewdrops: boolean;
    showVines: boolean;
    showWeather: boolean;
    showAgents: boolean;
  };
}) {
  const season = useMemo(() => {
    if (crr === undefined) return SEASONS.summer;
    if (crr < 0.5) return SEASONS.summer;
    if (crr < 1.0) return SEASONS.lateSummer;
    return SEASONS.autumn;
  }, [crr]);

  const nodes   = graph?.nodes || [];
  const prNodes     = nodes.filter((n) => n.type === 'pr').slice(0, 10);
  const issueNodes  = nodes.filter((n) => n.type === 'issue').slice(0, 14);

  // Group unique Epics (up to 4)
  const uniqueEpics = useMemo(() => {
    const epics = nodes.map(n => n.attributes.epic).filter(Boolean);
    return Array.from(new Set(epics)).slice(0, 4);
  }, [nodes]);

  // Position nodes inside Epic Beds or around the well
  const nodePositions = useMemo(() => {
    const positions: Record<string, [number, number, number]> = {};
    const epicGroups: Record<string, FusedNode[]> = {};
    const noEpicNodes: FusedNode[] = [];
    
    nodes.forEach(node => {
      const epic = node.attributes.epic;
      if (epic && uniqueEpics.includes(epic)) {
        if (!epicGroups[epic]) epicGroups[epic] = [];
        epicGroups[epic].push(node);
      } else {
        noEpicNodes.push(node);
      }
    });

    uniqueEpics.forEach((epic, epicIdx) => {
      const center = EPIC_CENTERS[epicIdx];
      const groupNodes = epicGroups[epic] || [];
      const count = groupNodes.length;
      groupNodes.forEach((node, nodeIdx) => {
        const angle = (nodeIdx / Math.max(count, 1)) * Math.PI * 2;
        const r = count > 1 ? 0.65 : 0;
        positions[node.id] = [
          center[0] + Math.cos(angle) * r,
          0,
          center[1] + Math.sin(angle) * r
        ];
      });
    });

    const count = noEpicNodes.length;
    noEpicNodes.forEach((node, nodeIdx) => {
      const angle = (nodeIdx / Math.max(count, 1)) * Math.PI * 2;
      const r = 2.0;
      positions[node.id] = [
        Math.cos(angle) * r,
        0,
        Math.sin(angle) * r
      ];
    });

    return positions;
  }, [nodes, uniqueEpics]);

  const prPos    = useMemo(() => ring(Math.max(prNodes.length, 1),    3.2, Math.PI / 6),    [prNodes.length]);
  const issuePos = useMemo(() => ring(Math.max(issueNodes.length, 1), 2.2, -Math.PI / 5), [issueNodes.length]);

  const orbitSpeed = 0.35 * Math.max(opponentLimit, 0.5);

  const bedPositions: [number, number][] = [
    [ 3.2,  3.2], [-3.2,  3.2],
    [-3.2, -3.2], [ 3.2, -3.2],
    [ 4.0,  0.0], [-4.0,  0.0],
    [ 0.0,  4.0], [ 0.0, -4.0],
  ];

  // Adjust weather visual depending on velocity
  const isDrought = sprintVelocity !== undefined && sprintVelocity < 50;
  const isRaining = sprintVelocity !== undefined && sprintVelocity >= 70;

  const skyColor = isDrought ? SEASONS.autumn.sky : season.sky;
  const fogFarDist = isDrought ? 15 : season.fogFar;

  return (
    <>
      <color attach="background" args={[skyColor]} />
      <fog attach="fog" args={[skyColor, 18, fogFarDist]} />

      {/* Warm golden-hour lighting & Hemisphere Light */}
      <ambientLight intensity={0.6} color="#fff5e0" />
      <hemisphereLight color="#ffffff" groundColor="#4a8c3f" intensity={0.4} />
      <directionalLight
        position={[8, 14, 6]}
        intensity={1.3}
        color="#fffadc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <directionalLight position={[-6, 5, -4]} intensity={0.2} color="#c8e8ff" />

      {/* Floating pollen particles */}
      {!isRaining && <FloatingPollen count={50} />}

      {/* Rain weather system */}
      {isRaining && <RainParticles count={100} />}

      {/* Ground, paths, hedge, trees */}
      <GardenGround grassColor={isDrought ? SEASONS.autumn.grass : season.grass} />
      <HedgeFence />
      {([[-4.3, -4.3], [4.3, -4.3], [-4.3, 4.3], [4.3, 4.3]] as [number, number][]).map(
        ([x, z], i) => <OakTree key={i} position={[x, 0, z]} leavesColor={isDrought ? SEASONS.autumn.leaves : season.leaves} />
      )}

      {/* Epic Garden Beds */}
      {filters.showEpics && uniqueEpics.map((epicName, idx) => {
        const center = EPIC_CENTERS[idx];
        if (center) {
          return (
            <EpicGardenBed 
              key={`bed-${idx}`}
              x={center[0]}
              z={center[1]}
              name={epicName}
            />
          );
        }
        return null;
      })}

      {/* Stepping stones paths linking PRs and issues */}
      {filters.showVines && prNodes.map((prNode, prIdx) => {
        const issueIdx = (prIdx + 1) % Math.max(issueNodes.length, 1);
        const start = nodePositions[prNode.id];
        const targetNode = issueNodes[issueIdx];
        const end = targetNode ? nodePositions[targetNode.id] : undefined;
        if (start && end) {
          return (
            <DependencyPath 
              key={`path-${prNode.id}`}
              start={start}
              end={end}
            />
          );
        }
        return null;
      })}

      {/* Issue-to-issue dependency crawling vines */}
      {filters.showVines && graph?.edges?.map((edge, idx) => {
        const start = nodePositions[edge.source];
        const end = nodePositions[edge.target];
        if (start && end) {
          return (
            <DependencyPath 
              key={`edge-path-${idx}`}
              start={start}
              end={end}
              isBlocked={edge.type === 'blocks'}
            />
          );
        }
        return null;
      })}

      {/* Decorative flower patches */}
      {season !== SEASONS.autumn && !isDrought && bedPositions.map(([x, z], i) => (
        <FlowerPatch key={i} x={x} z={z} />
      ))}

      {/* Contact shadows on ground */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.35}
        scale={12}
        blur={2}
        far={3}
        color="#2a1a00"
      />

      {/* Well (World Core) */}
      <GardenWell crr={crr} eventCount={eventCount} />

      {/* Butterflies (Agents) */}
      {filters.showAgents && (
        <>
          <Butterfly role="Worker"   color={C.agentWorker}   orbitRadius={1.2} orbitSpeed={orbitSpeed}       orbitOffset={0}    />
          <Butterfly role="Critic"   color={C.agentCritic}   orbitRadius={1.4} orbitSpeed={orbitSpeed * 0.8} orbitOffset={2.09} />
          <Butterfly role="Opponent" color={C.agentOpponent} orbitRadius={1.3} orbitSpeed={orbitSpeed * 1.2} orbitOffset={4.19} />
        </>
      )}

      {/* PR bushes */}
      {prNodes.map((node, i) => {
        const pos = nodePositions[node.id] || prPos[i] || [0,0,0];
        return (
          <FlowerBush key={node.id} node={node} position={pos} onSelectNode={onSelectNode} showBees={filters.showBees} showDewdrops={filters.showDewdrops} />
        );
      })}

      {/* Issue weeds */}
      {issueNodes.map((node, i) => {
        const pos = nodePositions[node.id] || issuePos[i] || [0,0,0];
        return (
          <WeedNode
            key={node.id}
            node={node}
            position={pos}
            onSelectNode={onSelectNode}
            showBees={filters.showBees}
            showDewdrops={filters.showDewdrops}
            showSubtasks={filters.showSubtasks}
            showWebs={filters.showWebs}
          />
        );
      })}

      {/* Camera: fixed overhead-ish garden view, no auto-rotate */}
      <OrbitControls
        makeDefault
        minDistance={10}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2.5}
        minPolarAngle={Math.PI / 6}
        enablePan={false}
      />
    </>
  );
}

// ─── Exported component ───────────────────────────────────────────────────────
export function GameGardenScene({
  active,
  crr,
  projectName: _projectName,
  graph,
  qaLimit: _qaLimit,
  opponentLimit,
  eventCount = 0,
  onSelectNode,
  sprintVelocity,
  filters,
  uiVisible = true,
}: GameGardenSceneProps) {
  if (!active) return null;

  const [legendExpanded, setLegendExpanded] = useState(true);

  return (
    <div className="game-garden-root">
      <Canvas
        shadows
        camera={{ position: [0, 16, 13], fov: 38 }}
        gl={{ antialias: true }}
      >
        <GardenScene crr={crr} graph={graph} opponentLimit={opponentLimit} eventCount={eventCount} onSelectNode={onSelectNode} sprintVelocity={sprintVelocity} filters={filters} />
      </Canvas>

      {/* HUD */}
      {uiVisible && (
        <div className="garden-hud">

        {/* Collapsible Garden Map Legend */}
        <div className={`garden-legend-card ${legendExpanded ? 'expanded' : 'collapsed'}`}>
          <div className="legend-header" onClick={() => setLegendExpanded(!legendExpanded)}>
            <span className="material-symbols-outlined legend-icon">map</span>
            <span className="legend-title">Garden Map Legend</span>
            <span className="material-symbols-outlined toggle-arrow">
              {legendExpanded ? 'expand_more' : 'expand_less'}
            </span>
          </div>

          {legendExpanded && (
            <div className="legend-scroll-content">
              <div className="legend-section">
                <h4>World Core</h4>
                <div className="legend-detail">
                  <span className="legend-symbol">🪨 Well</span>
                  <p>Project Health (CRR). Cool blue water indicates optimal calibration. Muddy/dry well indicates high technical debt.</p>
                </div>
                <div className="legend-detail">
                  <span className="legend-symbol">💧 Shimmer</span>
                  <p>Real-time telemetry event activity. Animates on code updates and pipeline webhooks.</p>
                </div>
              </div>

              <div className="legend-section">
                <h4>Pull Requests (PRs)</h4>
                <div className="legend-detail">
                  <span className="legend-symbol" style={{ color: C.prApproved }}>🌱 Approved</span>
                  <p>Approved PR nodes rendered as round flowering bushes.</p>
                </div>
                <div className="legend-detail">
                  <span className="legend-symbol" style={{ color: C.prPending }}>🌼 Pending</span>
                  <p>Under review PR nodes rendered as tall capsule bushes.</p>
                </div>
                <div className="legend-detail">
                  <span className="legend-symbol" style={{ color: C.prDraft }}>⚪ Draft</span>
                  <p>Draft PR nodes rendered as flat squashed bushes.</p>
                </div>
                <div className="legend-detail">
                  <span className="legend-symbol">📏 Size</span>
                  <p>PR bush volume is scaled by review/comments counts.</p>
                </div>
              </div>

              <div className="legend-section">
                <h4>Issues</h4>
                <div className="legend-detail">
                  <span className="legend-symbol" style={{ color: C.issueCrit }}>🍂 Critical</span>
                  <p>Active or critical issues rendered as red wilted weeds.</p>
                </div>
                <div className="legend-detail">
                  <span className="legend-symbol" style={{ color: C.issueWarn }}>🍁 Warning</span>
                  <p>In-progress or warning issues rendered as orange wilted weeds.</p>
                </div>
                <div className="legend-detail">
                  <span className="legend-symbol" style={{ color: C.issueBack }}>⚪ Backlog</span>
                  <p>Backlog issues rendered as grey wilted weeds.</p>
                </div>
                <div className="legend-detail">
                  <span className="legend-symbol">📏 Height</span>
                  <p>Weed height matches priority (High is tallest).</p>
                </div>
              </div>

              <div className="legend-section">
                <h4>JIRA Garden Elements</h4>
                <div className="legend-detail">
                  <span className="legend-symbol">🟫 Epic Beds</span>
                  <p>Epics are raised wooden garden beds grouping related issues and PRs inside their boundaries.</p>
                </div>
                <div className="legend-detail">
                  <span className="legend-symbol">🐝 Assignees</span>
                  <p>Hovering striped bees orbit around plants representing assigned team members.</p>
                </div>
                <div className="legend-detail">
                  <span className="legend-symbol">🍄 Sub-tasks</span>
                  <p>Orange mushrooms grow at the base of issues; completed sub-tasks bloom into tiny white flowers 🌸.</p>
                </div>
                <div className="legend-detail">
                  <span className="legend-symbol">📐 Story Points</span>
                  <p>Stem thickness and leaf volume are scaled based on the issue/PR story points estimate.</p>
                </div>
                <div className="legend-detail">
                  <span className="legend-symbol">🕸️ Blockers</span>
                  <p>Silver spider web wireframes envelop weeds that are blocked or flagged.</p>
                </div>
                <div className="legend-detail">
                  <span className="legend-symbol">💧 Dewdrops</span>
                  <p>Shiny, reflective glass water drops on leaves indicate active comment threads.</p>
                </div>
                <div className="legend-detail">
                  <span className="legend-symbol">🌿 Components</span>
                  <p>Geometries vary by component: Ferns for Frontend, Cactus for Database, standard Weeds for Backend.</p>
                </div>
                <div className="legend-detail">
                  <span className="legend-symbol">🍂 Due Dates</span>
                  <p>Weeds droop downwards and transition to a decayed dry brown color as deadlines approach or pass.</p>
                </div>
                <div className="legend-detail">
                  <span className="legend-symbol">🌧️ Sprint Weather</span>
                  <p>Raining particles indicate high sprint velocity; dry hazy drought indicates stalled velocity.</p>
                </div>
                <div className="legend-detail">
                  <span className="legend-symbol">🦎 Dependency Vines</span>
                  <p>Crawling vines connect issues: Thorny purple vines represent blocks, green leafy vines are clear.</p>
                </div>
              </div>

              <div className="legend-section">
                <h4>Verification Agents</h4>
                <div className="legend-detail">
                  <span className="legend-symbol" style={{ color: C.agentWorker }}>🦋 Worker</span>
                  <p>Worker agent orbits, proposing code revisions.</p>
                </div>
                <div className="legend-detail">
                  <span className="legend-symbol" style={{ color: C.agentCritic }}>🦋 Critic</span>
                  <p>Critic agent orbits, verifying system safety.</p>
                </div>
                <div className="legend-detail">
                  <span className="legend-symbol" style={{ color: C.agentOpponent }}>🦋 Opponent</span>
                  <p>Opponent agent orbits, searching for conflicts.</p>
                </div>
              </div>

              <div className="legend-section">
                <h4>Terrain & Environment</h4>
                <div className="legend-detail">
                  <span className="legend-symbol">🏡 Seasons</span>
                  <p>Grass, sky, and oak tree leaves change based on CRR: Summer (optimal), Late Summer (warning), Autumn (critical debt).</p>
                </div>
                <div className="legend-detail">
                  <span className="legend-symbol">🌳 Oak Trees</span>
                  <p>Stable infrastructure pillars representing foundational packages.</p>
                </div>
                <div className="legend-detail">
                  <span className="legend-symbol">🌿 Hedge</span>
                  <p>Project scope/workspace boundary fence.</p>
                </div>
                <div className="legend-detail">
                  <span className="legend-symbol">⚫ Risk Decal</span>
                  <p>Dark patches under weeds indicate localized high-probability integration risks.</p>
                </div>
                <div className="legend-detail">
                  <span className="legend-symbol">🪨 Paths</span>
                  <p>Stepping stone paths connect related PRs and Issues, showing causal dependency pathways.</p>
                </div>
                <div className="legend-detail">
                  <span className="legend-symbol">✨ Flowers</span>
                  <p>Active commit zones representing healthy progress.</p>
                </div>
                <div className="legend-detail">
                  <span className="legend-symbol">✨ Pollen</span>
                  <p>Active background simulation processes and verification threads.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="garden-hint">Scroll to zoom · Drag to look around · Hover elements for details</div>
      </div>
      )}
    </div>
  );
}
