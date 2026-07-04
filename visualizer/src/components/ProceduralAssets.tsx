import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TaskNode, HoveredData } from './DataTree';

interface AssetProps {
  position: [number, number, number];
  node?: TaskNode; // Pass virtual node for hover info if needed
  onHover?: (data: HoveredData | null) => void;
  onClick?: () => void;
}

// ─── 1. Central Stone Well ──────────────────────────────────────────
interface WellProps extends AssetProps {
  crr: number;
  projectName?: string;
}

export function Well({ position, crr, projectName, onHover, onClick }: WellProps) {
  const [hovered, setHovered] = useState(false);
  
  // Water color shifts from lush cyan-blue (CRR >= 1.2) to warning orange-red (CRR < 0.8)
  const waterColor = useMemo(() => {
    const healthy = new THREE.Color('#3498db');
    const warning = new THREE.Color('#e74c3c');
    const factor = Math.min(Math.max((crr - 0.7) / 0.8, 0), 1);
    return warning.lerp(healthy, factor);
  }, [crr]);

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    setHovered(true);
    if (onHover) {
      onHover({
        node: {
          id: 'well-core',
          title: projectName ? `${projectName} Well Core` : `CRR Core Well (Health: ${crr.toFixed(2)}x)`,
          progress: Math.min(Math.max(crr / 2, 0), 1),
          complexity: 1,
          risk: crr < 1.0 ? 0.7 : 0.1,
        },
        x: e.clientX,
        y: e.clientY
      });
    }
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    document.body.style.cursor = 'default';
    setHovered(false);
    if (onHover) onHover(null);
  };

  const handlePointerMove = (e: any) => {
    e.stopPropagation();
    if (onHover) {
      onHover({
        node: {
          id: 'well-core',
          title: `CRR Core Well (Health: ${(crr).toFixed(2)}x)`,
          progress: Math.min(Math.max(crr / 2, 0), 1),
          complexity: 1,
          risk: crr < 1.0 ? 0.7 : 0.1,
        },
        x: e.clientX,
        y: e.clientY
      });
    }
  };

  return (
    <group position={position} onClick={onClick}>
      {/* Stone Cylindrical Base */}
      <mesh
        castShadow
        receiveShadow
        position={[0, 0.4, 0]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerMove={handlePointerMove}
      >
        <cylinderGeometry args={[0.9, 0.95, 0.8, 12]} />
        <meshStandardMaterial color={hovered ? '#95a5a6' : '#7f8c8d'} roughness={0.8} />
      </mesh>

      {/* Rim Stone Ring */}
      <mesh position={[0, 0.82, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.85, 0.1, 8, 24]} />
        <meshStandardMaterial color="#627072" roughness={0.9} />
      </mesh>

      {/* Water Plane */}
      <mesh position={[0, 0.65, 0]}>
        <cylinderGeometry args={[0.78, 0.78, 0.1, 12]} />
        <meshStandardMaterial
          color={waterColor}
          roughness={0.1}
          metalness={0.8}
          emissive={waterColor}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Wooden Beams */}
      <mesh position={[-0.7, 1.25, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 1.2, 8]} />
        <meshStandardMaterial color="#5c4033" roughness={0.9} />
      </mesh>
      <mesh position={[0.7, 1.25, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 1.2, 8]} />
        <meshStandardMaterial color="#5c4033" roughness={0.9} />
      </mesh>

      {/* Crossbar Log */}
      <mesh position={[0, 1.7, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 1.35, 8]} />
        <meshStandardMaterial color="#5c4033" roughness={0.9} />
      </mesh>

      {/* Well Roof */}
      <mesh position={[0, 2.05, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.2, 0.6, 4]} />
        <meshStandardMaterial color="#8e44ad" roughness={0.8} /> {/* Cozy violet shingled roof */}
      </mesh>
    </group>
  );
}



// ─── 2. Rose Bush (Pull Request) ────────────────────────────────────
interface BushProps extends AssetProps {
  status: string; // 'approved', 'under review', 'draft'
}

export function RoseBush({ position, status, node, onHover, onClick }: BushProps) {
  const [hovered, setHovered] = useState(false);
  const bushRef = useRef<THREE.Group>(null);

  // Gentle breathing/swaying animation
  useFrame((state) => {
    if (!bushRef.current) return;
    const t = state.clock.getElapsedTime();
    const scale = 1 + Math.sin(t * 1.5) * 0.02;
    bushRef.current.scale.set(scale, scale, scale);
  });

  const baseColor = useMemo(() => {
    const s = status.toLowerCase();
    if (s === 'approved' || s === 'completed') return new THREE.Color('#27ae60'); // Healthy green
    if (s === 'under review' || s === 'pending') return new THREE.Color('#f39c12'); // Amber gold
    return new THREE.Color('#7f8c8d'); // Draft grey
  }, [status]);

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    setHovered(true);
    if (onHover && node) onHover({ node, x: e.clientX, y: e.clientY });
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    document.body.style.cursor = 'default';
    setHovered(false);
    if (onHover) onHover(null);
  };

  const handlePointerMove = (e: any) => {
    e.stopPropagation();
    if (onHover && node) onHover({ node, x: e.clientX, y: e.clientY });
  };

  return (
    <group
      ref={bushRef}
      position={position}
      onClick={onClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerMove={handlePointerMove}
    >
      {/* Main Foliage sphere 1 */}
      <mesh castShadow position={[0, 0.35, 0]}>
        <sphereGeometry args={[0.42, 12, 12]} />
        <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.12) : baseColor} roughness={0.7} />
      </mesh>
      
      {/* Main Foliage sphere 2 */}
      <mesh castShadow position={[0.15, 0.45, -0.1]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.12) : baseColor} roughness={0.7} />
      </mesh>

      {/* Tiny Flowers */}
      {status.toLowerCase() === 'approved' && (
        <>
          <mesh position={[0.2, 0.6, 0.2]}>
            <sphereGeometry args={[0.08, 6, 6]} />
            <meshStandardMaterial color="#e74c3c" emissive="#e74c3c" emissiveIntensity={0.2} />
          </mesh>
          <mesh position={[-0.2, 0.5, 0.3]}>
            <sphereGeometry args={[0.07, 6, 6]} />
            <meshStandardMaterial color="#e74c3c" />
          </mesh>
        </>
      )}
      {status.toLowerCase() === 'under review' && (
        <mesh position={[0, 0.7, 0]}>
          <sphereGeometry args={[0.07, 6, 6]} />
          <meshStandardMaterial color="#f1c40f" />
        </mesh>
      )}

      {/* Small Brown Pot Base */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.18, 0.16, 8]} />
        <meshStandardMaterial color="#a0522d" roughness={0.9} />
      </mesh>
    </group>
  );
}

// ─── 3. Spiky Weed (Issue) ──────────────────────────────────────────
interface WeedProps extends AssetProps {
  status: string; // 'active', 'backlog'
}

export function SpikyWeed({ position, status, node, onHover, onClick }: WeedProps) {
  const [hovered, setHovered] = useState(false);
  const weedRef = useRef<THREE.Group>(null);

  // Soft swaying
  useFrame((state) => {
    if (!weedRef.current) return;
    const t = state.clock.getElapsedTime();
    weedRef.current.rotation.z = Math.sin(t * 2) * 0.04;
  });

  const baseColor = useMemo(() => {
    const s = status.toLowerCase();
    if (s === 'backlog') return new THREE.Color('#9e9b96'); // Dry/grey backlog weed
    return new THREE.Color('#ba1a1a'); // Active red critical weed
  }, [status]);

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    setHovered(true);
    if (onHover && node) onHover({ node, x: e.clientX, y: e.clientY });
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    document.body.style.cursor = 'default';
    setHovered(false);
    if (onHover) onHover(null);
  };

  const handlePointerMove = (e: any) => {
    e.stopPropagation();
    if (onHover && node) onHover({ node, x: e.clientX, y: e.clientY });
  };

  return (
    <group
      ref={weedRef}
      position={position}
      onClick={onClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerMove={handlePointerMove}
    >
      {/* Spikes / Leaves pointing out */}
      <group position={[0, 0.1, 0]}>
        {/* Leaf 1 */}
        <mesh castShadow rotation={[0, 0, 0.4]} position={[0.1, 0.2, 0]}>
          <coneGeometry args={[0.07, 0.5, 4]} />
          <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.12) : baseColor} roughness={0.8} />
        </mesh>
        {/* Leaf 2 */}
        <mesh castShadow rotation={[0, 0, -0.4]} position={[-0.1, 0.2, 0]}>
          <coneGeometry args={[0.07, 0.5, 4]} />
          <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.12) : baseColor} roughness={0.8} />
        </mesh>
        {/* Leaf 3 */}
        <mesh castShadow rotation={[0.4, 0, 0]} position={[0, 0.2, 0.1]}>
          <coneGeometry args={[0.07, 0.4, 4]} />
          <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.12) : baseColor} roughness={0.8} />
        </mesh>
        {/* Leaf 4 */}
        <mesh castShadow rotation={[-0.4, 0, 0]} position={[0, 0.2, -0.1]}>
          <coneGeometry args={[0.07, 0.4, 4]} />
          <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.12) : baseColor} roughness={0.8} />
        </mesh>
        {/* Central Spike */}
        <mesh castShadow position={[0, 0.3, 0]}>
          <coneGeometry args={[0.05, 0.6, 4]} />
          <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.15) : baseColor} roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

// ─── 4. Animated Butterfly (Agent) ──────────────────────────────────
interface ButterflyProps {
  color: string;
  orbitRadius: number;
  speed: number;
  heightOffset: number;
  phase?: number;
}

export function Butterfly({ color, orbitRadius, speed, heightOffset, phase = 0 }: ButterflyProps) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime() * speed + phase;
    
    // Circular orbit around well
    const x = Math.sin(t) * orbitRadius;
    const z = Math.cos(t) * orbitRadius;
    
    // Hovering wave height
    const y = heightOffset + Math.sin(t * 2.5) * 0.25;

    meshRef.current.position.set(x, y, z);
    meshRef.current.rotation.y = t + Math.PI / 2;
  });

  return (
    <group ref={meshRef}>
      {/* Glowing Agent Sphere */}
      <mesh>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Wings left */}
      <mesh position={[-0.1, 0, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.15, 0.02, 0.1]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>
      
      {/* Wings right */}
      <mesh position={[0.1, 0, 0]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.15, 0.02, 0.1]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

// ─── 5. Picket Fence Segment ────────────────────────────────────────
interface FenceProps {
  position: [number, number, number];
  rotation?: [number, number, number];
}

export function Fence({ position, rotation = [0, 0, 0] }: FenceProps) {
  return (
    <group position={position} rotation={rotation}>
      {/* Horizontal rails */}
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[1.5, 0.04, 0.04]} />
        <meshStandardMaterial color="#ebd5c4" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.52, 0]} castShadow>
        <boxGeometry args={[1.5, 0.04, 0.04]} />
        <meshStandardMaterial color="#ebd5c4" roughness={0.9} />
      </mesh>

      {/* Vertical slats */}
      {[-0.6, -0.3, 0, 0.3, 0.6].map((x, i) => (
        <mesh key={i} position={[x, 0.35, 0]} castShadow>
          <boxGeometry args={[0.08, 0.7, 0.03]} />
          <meshStandardMaterial color="#fdfbf7" roughness={0.9} />
        </mesh>
      ))}

      {/* Slat tips (pointed pickets) */}
      {[-0.6, -0.3, 0, 0.3, 0.6].map((x, i) => (
        <mesh key={`t-${i}`} position={[x, 0.72, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.056, 0.056, 0.03]} />
          <meshStandardMaterial color="#fdfbf7" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}
