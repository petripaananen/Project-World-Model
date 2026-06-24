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
  const isDebt = crr !== undefined && crr < 1.0;
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
}: {
  node: FusedNode;
  position: [number, number, number];
  onSelectNode?: (node: FusedNode | null) => void;
}) {
  const bushRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const color = prColor(node);
  const shortName = node.name.split(':')[0].trim();
  const status = node.attributes.status?.toLowerCase() || '';

  // Data-driven sizing: based on reviews count
  const reviewsCount = node.attributes.reviews ?? 0;
  const sizeMult = 0.85 + reviewsCount * 0.15;

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

      {hovered && (
        <Html position={[0, 1.4, 0]} center zIndexRange={[100, 0]}>
          <div className="garden-tooltip">
            <span className="garden-badge pr-badge">PR</span>
            <strong>{node.name}</strong>
            <p>Status: {node.attributes.status}</p>
            <p>Author: {node.attributes.author}</p>
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
}: {
  node: FusedNode;
  position: [number, number, number];
  onSelectNode?: (node: FusedNode | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const color = issueColor(node);

  // Data-driven sizing: based on priority
  const priority = node.attributes.priority?.toLowerCase() || 'medium';
  const sizeMult = priority === 'high' ? 1.3 : priority === 'low' ? 0.75 : 1.05;

  // Soil and debt shadow details based on risk probability
  const riskProb = node.attributes.riskProbability ?? 0;
  const soilColor = riskProb > 0.6 ? '#1c120c' : riskProb > 0.3 ? '#3a2b1f' : '#6b4c2a';

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    // Gentle wind sway
    const swayX = Math.sin(t * 1.4 + position[0] * 1.5) * 0.03;
    const swayZ = Math.cos(t * 1.2 + position[2] * 1.5) * 0.03;
    groupRef.current.rotation.x = swayX;
    groupRef.current.rotation.z = swayZ;
  });

  return (
    <group position={position}>
      {/* Dark debt patch */}
      {riskProb > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow>
          <ringGeometry args={[0, 0.45 + riskProb * 0.65, 16]} />
          <meshBasicMaterial color="#0c0702" transparent opacity={0.15 + riskProb * 0.35} />
        </mesh>
      )}

      {/* Soil mound */}
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <cylinderGeometry args={[0.22, 0.26, 0.08, 8]} />
        <meshStandardMaterial color={soilColor} roughness={0.9} metalness={0.05} />
      </mesh>

      <group ref={groupRef} scale={[sizeMult, sizeMult, sizeMult]} onClick={(e) => { e.stopPropagation(); onSelectNode?.(node); }}>
        {/* Stems */}
        {[-0.1, 0, 0.1].map((ox, i) => (
          <mesh key={i} position={[ox, 0.22 + i * 0.04, ox * 0.4]} rotation={[0.2 * (i - 1), 0, 0.15 * (i - 1)]} castShadow>
            <cylinderGeometry args={[0.025, 0.03, 0.44 + i * 0.06, 5]} />
            <meshStandardMaterial color={color} roughness={0.8} metalness={0.05} />
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
            <meshStandardMaterial color={hovered ? '#ffffff' : color} roughness={0.7} metalness={0.1} />
          </mesh>
        ))}
      </group>

      {hovered && (
        <Html position={[0, 0.9, 0]} center zIndexRange={[100, 0]}>
          <div className="garden-tooltip">
            <span className="garden-badge issue-badge">ISSUE</span>
            <strong>{node.name}</strong>
            <p>Status: {node.attributes.status}</p>
          </div>
        </Html>
      )}
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

// ─── Dependency Path (stepping stones) ────────────────────────────────────────
function DependencyPath({ start, end }: { start: [number, number, number]; end: [number, number, number] }) {
  const [hovered, setHovered] = useState(false);
  const [x1, , z1] = start;
  const [x2, , z2] = end;
  const dx = x2 - x1;
  const dz = z2 - z1;
  const dist = Math.sqrt(dx * dx + dz * dz);
  
  const numStones = Math.max(Math.floor(dist / 0.55), 2);
  const stones = useMemo(() => {
    return Array.from({ length: numStones - 1 }, (_, idx) => {
      const t = (idx + 1) / numStones;
      const noiseX = Math.sin(idx * 43.1) * 0.05;
      const noiseZ = Math.cos(idx * 79.3) * 0.05;
      return [x1 + dx * t + noiseX, 0.008, z1 + dz * t + noiseZ] as [number, number, number];
    });
  }, [x1, z1, x2, z2, dist, numStones]);

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
}: {
  crr?: number;
  graph?: { nodes: FusedNode[]; edges: any[] };
  opponentLimit?: number;
  eventCount?: number;
  onSelectNode?: (node: FusedNode | null) => void;
}) {
  const season = useMemo(() => {
    if (crr === undefined) return SEASONS.summer;
    if (crr >= 1.2) return SEASONS.summer;
    if (crr >= 1.0) return SEASONS.lateSummer;
    return SEASONS.autumn;
  }, [crr]);

  const nodes   = graph?.nodes || [];
  const prNodes     = nodes.filter((n) => n.type === 'pr').slice(0, 10);
  const issueNodes  = nodes.filter((n) => n.type === 'issue').slice(0, 14);

  // Layout positions
  const prPos    = useMemo(() => ring(Math.max(prNodes.length, 1),    3.2, Math.PI / 6),    [prNodes.length]);
  const issuePos = useMemo(() => ring(Math.max(issueNodes.length, 1), 2.2, -Math.PI / 5), [issueNodes.length]);

  const orbitSpeed = 0.35 * Math.max(opponentLimit, 0.5);

  // Decorative flower patches in the beds (quadrant corners)
  const bedPositions: [number, number][] = [
    [ 3.2,  3.2], [-3.2,  3.2],
    [-3.2, -3.2], [ 3.2, -3.2],
    [ 4.0,  0.0], [-4.0,  0.0],
    [ 0.0,  4.0], [ 0.0, -4.0],
  ];

  return (
    <>
      <color attach="background" args={[season.sky]} />
      <fog attach="fog" args={[season.sky, 18, season.fogFar]} />

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
      <FloatingPollen count={50} />

      {/* Ground, paths, hedge, trees */}
      <GardenGround grassColor={season.grass} />
      <HedgeFence />
      {([[-4.3, -4.3], [4.3, -4.3], [-4.3, 4.3], [4.3, 4.3]] as [number, number][]).map(
        ([x, z], i) => <OakTree key={i} position={[x, 0, z]} leavesColor={season.leaves} />
      )}

      {/* Dependency stepping stones paths */}
      {prNodes.map((prNode, prIdx) => {
        const issueIdx = (prIdx + 1) % Math.max(issueNodes.length, 1);
        if (issueNodes.length > 0 && prPos[prIdx] && issuePos[issueIdx]) {
          return (
            <DependencyPath 
              key={`path-${prNode.id}`}
              start={prPos[prIdx]}
              end={issuePos[issueIdx]}
            />
          );
        }
        return null;
      })}

      {/* Decorative flower patches */}
      {season !== SEASONS.autumn && bedPositions.map(([x, z], i) => (
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
      <Butterfly role="Worker"   color={C.agentWorker}   orbitRadius={1.2} orbitSpeed={orbitSpeed}       orbitOffset={0}    />
      <Butterfly role="Critic"   color={C.agentCritic}   orbitRadius={1.4} orbitSpeed={orbitSpeed * 0.8} orbitOffset={2.09} />
      <Butterfly role="Opponent" color={C.agentOpponent} orbitRadius={1.3} orbitSpeed={orbitSpeed * 1.2} orbitOffset={4.19} />

      {/* PR bushes */}
      {prNodes.map((node, i) => (
        <FlowerBush key={node.id} node={node} position={prPos[i]} onSelectNode={onSelectNode} />
      ))}

      {/* Issue weeds */}
      {issueNodes.map((node, i) => (
        <WeedNode key={node.id} node={node} position={issuePos[i]} onSelectNode={onSelectNode} />
      ))}

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
        <GardenScene crr={crr} graph={graph} opponentLimit={opponentLimit} eventCount={eventCount} onSelectNode={onSelectNode} />
      </Canvas>

      {/* HUD */}
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
    </div>
  );
}
