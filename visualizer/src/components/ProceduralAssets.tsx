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

// ─── 1. Central Stacked Stone Well ──────────────────────────────────
interface WellProps extends AssetProps {
  crr: number;
  projectName?: string;
}

export function Well({ position, crr, projectName, onHover, onClick }: WellProps) {
  const [hovered, setHovered] = useState(false);
  
  // Water color shifts from healthy blue (when CRR < 1.0, optimal) to warning red (when CRR >= 1.0, warning)
  const waterColor = useMemo(() => {
    const healthy = new THREE.Color('#3498db'); // Lush cyan-blue
    const warning = new THREE.Color('#e74c3c'); // Warning red
    // crr < 1.0 is healthy (Optimal)
    const f = Math.min(Math.max((crr - 0.7) / 0.5, 0), 1);
    return healthy.clone().lerp(warning, f);
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
          risk: crr > 1.0 ? 0.7 : 0.1,
          elementType: 'Stone Well'
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
          title: projectName ? `${projectName} Well Core` : `CRR Core Well (Health: ${crr.toFixed(2)}x)`,
          progress: Math.min(Math.max(crr / 2, 0), 1),
          complexity: 1,
          risk: crr > 1.0 ? 0.7 : 0.1,
          elementType: 'Stone Well'
        },
        x: e.clientX,
        y: e.clientY
      });
    }
  };

  return (
    <group position={position} onClick={onClick}>
      {/* 3D Stacked Stone Blocks Base */}
      <group position={[0, 0.14, 0]}>
        {[0, 1, 2].map((row) => {
          const yOffset = (row - 1) * 0.26;
          const blockCount = 8;
          const radius = 0.82;
          return (
            <group key={row} position={[0, yOffset, 0]} rotation={[0, (row * Math.PI) / 8, 0]}>
              {Array.from({ length: blockCount }).map((_, i) => {
                const angle = (i * Math.PI * 2) / blockCount;
                const x = Math.sin(angle) * radius;
                const z = Math.cos(angle) * radius;
                return (
                  <mesh
                    key={i}
                    position={[x, 0, z]}
                    rotation={[0, -angle, 0]}
                    castShadow
                    receiveShadow
                    onPointerOver={handlePointerOver}
                    onPointerOut={handlePointerOut}
                    onPointerMove={handlePointerMove}
                  >
                    <boxGeometry args={[0.5, 0.24, 0.22]} />
                    <meshStandardMaterial color={hovered ? '#a6b3b5' : '#7f8c8d'} roughness={0.85} flatShading />
                  </mesh>
                );
              })}
            </group>
          );
        })}
      </group>

      {/* Rim Stone Ring */}
      <mesh position={[0, 0.44, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.78, 0.08, 8, 24]} />
        <meshStandardMaterial color="#627072" roughness={0.9} />
      </mesh>

      {/* Water Plane */}
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.72, 0.72, 0.08, 12]} />
        <meshStandardMaterial
          color={waterColor}
          roughness={0.15}
          metalness={0.7}
          emissive={waterColor}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Wooden Beams */}
      <mesh position={[-0.65, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 1.2, 8]} />
        <meshStandardMaterial color="#5c4033" roughness={0.9} />
      </mesh>
      <mesh position={[0.65, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 1.2, 8]} />
        <meshStandardMaterial color="#5c4033" roughness={0.9} />
      </mesh>

      {/* Mossy Climbing Vines on Beams */}
      <group position={[-0.65, 0.85, 0]}>
        <mesh position={[0.06, -0.2, 0.02]} castShadow>
          <dodecahedronGeometry args={[0.06, 0]} />
          <meshStandardMaterial color="#27ae60" roughness={0.95} />
        </mesh>
        <mesh position={[-0.04, 0.1, 0.05]} castShadow>
          <dodecahedronGeometry args={[0.07, 0]} />
          <meshStandardMaterial color="#1e824c" roughness={0.95} />
        </mesh>
        <mesh position={[0.05, 0.35, -0.04]} castShadow>
          <dodecahedronGeometry args={[0.05, 0]} />
          <meshStandardMaterial color="#2ecc71" roughness={0.95} />
        </mesh>
      </group>
      <group position={[0.65, 0.85, 0]}>
        <mesh position={[-0.06, -0.15, -0.03]} castShadow>
          <dodecahedronGeometry args={[0.065, 0]} />
          <meshStandardMaterial color="#27ae60" roughness={0.95} />
        </mesh>
        <mesh position={[0.04, 0.15, 0.04]} castShadow>
          <dodecahedronGeometry args={[0.055, 0]} />
          <meshStandardMaterial color="#1e824c" roughness={0.95} />
        </mesh>
      </group>

      {/* Crossbar Log */}
      <mesh position={[0, 1.4, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 1.25, 8]} />
        <meshStandardMaterial color="#5c4033" roughness={0.9} />
      </mesh>

      {/* Crank Wheel */}
      <group position={[0.7, 1.4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.08, 8]} />
          <meshStandardMaterial color="#4a3b32" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0, 0.03]} castShadow>
          <torusGeometry args={[0.18, 0.02, 6, 16]} />
          <meshStandardMaterial color="#5c4033" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.14, 0.06]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.08, 6]} />
          <meshStandardMaterial color="#8e4a23" roughness={0.9} />
        </mesh>
      </group>

      {/* Rope */}
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.45, 6]} />
        <meshStandardMaterial color="#ebd2b0" roughness={0.9} />
      </mesh>

      {/* Hanging Copper Bucket */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.1, 0.18, 10]} />
        <meshStandardMaterial color="#b87333" metalness={0.65} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.94, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.12, 0.012, 6, 12, Math.PI]} />
        <meshStandardMaterial color="#4a3b32" roughness={0.8} />
      </mesh>

      {/* Well Roof with decorative wooden hip timbers & copper peak spire */}
      <mesh position={[0, 1.7, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.1, 0.55, 4]} />
        <meshStandardMaterial color="#8e4a23" roughness={0.85} flatShading />
      </mesh>
      {/* Decorative timbers running down the 4 hips of the roof */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i * Math.PI) / 2 + Math.PI / 4;
        return (
          <mesh
            key={i}
            position={[0.45 * Math.sin(angle), 1.62, 0.45 * Math.cos(angle)]}
            rotation={[0.4, angle, 0]}
            castShadow
          >
            <boxGeometry args={[0.08, 0.75, 0.08]} />
            <meshStandardMaterial color="#4a3b32" roughness={0.9} />
          </mesh>
        );
      })}
      {/* Metal Peak Finial Spire */}
      <mesh position={[0, 2.05, 0]} castShadow>
        <coneGeometry args={[0.03, 0.22, 6]} />
        <meshStandardMaterial color="#4a4d4f" metalness={0.8} roughness={0.2} />
      </mesh>    </group>
  );
}

// ─── 2. Fluffy Faceted Rose Bush (Pull Request) ──────────────────────
interface BushProps extends AssetProps {
  status: string; // 'approved', 'under review', 'draft'
}

// Helper component to render a detailed stylized flower (Hay Day style)
function RoseBloom({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      {/* Central yellow disc */}
      <mesh castShadow>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#f1c40f" roughness={0.5} />
      </mesh>
      {/* 5 surrounding petals */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i * 2 * Math.PI) / 5;
        const x = 0.07 * Math.cos(angle);
        const z = 0.07 * Math.sin(angle);
        return (
          <mesh key={i} position={[x, 0.01, z]} rotation={[0.1, angle, 0]} scale={[1.6, 0.4, 1.6]} castShadow>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        );
      })}
    </group>
  );
}

export function RoseBush({ position, status, node, onHover, onClick }: BushProps) {
  const [hovered, setHovered] = useState(false);
  const bushRef = useRef<THREE.Group>(null);

  // Soft breathing scaling
  useFrame((state) => {
    if (!bushRef.current) return;
    const t = state.clock.getElapsedTime();
    const scale = 1.0 + Math.sin(t * 1.5) * 0.015;
    bushRef.current.scale.set(scale, scale, scale);
  });

  const baseColor = useMemo(() => {
    const s = status.toLowerCase();
    if (s === 'approved' || s === 'completed') return new THREE.Color('#2ecc71'); // Vibrant green
    if (s === 'under review' || s === 'pending') return new THREE.Color('#f1c40f'); // Golden yellow
    return new THREE.Color('#95a5a6'); // Light grey
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
      {/* 5-Icosahedron Smooth Fluffy Foliage (Hay Day style) */}
      <mesh castShadow position={[0, 0.32, 0]}>
        <icosahedronGeometry args={[0.36, 2]} />
        <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.12) : baseColor} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0.12, 0.42, -0.08]}>
        <icosahedronGeometry args={[0.26, 2]} />
        <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.12) : baseColor} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[-0.12, 0.4, 0.08]}>
        <icosahedronGeometry args={[0.24, 2]} />
        <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.12) : baseColor} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0.08, 0.28, 0.12]}>
        <icosahedronGeometry args={[0.22, 2]} />
        <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.12) : baseColor} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[-0.1, 0.28, -0.1]}>
        <icosahedronGeometry args={[0.2, 2]} />
        <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.12) : baseColor} roughness={0.9} />
      </mesh>

      {/* Detailed Stylized Blooms */}
      {(status.toLowerCase() === 'approved' || status.toLowerCase() === 'completed') && (
        <>
          <RoseBloom position={[0.15, 0.52, 0.15]} color="#e74c3c" />
          <RoseBloom position={[-0.18, 0.45, 0.2]} color="#e74c3c" />
          <RoseBloom position={[0.0, 0.56, -0.12]} color="#e74c3c" />
        </>
      )}
      {(status.toLowerCase() === 'under review' || status.toLowerCase() === 'pending') && (
        <RoseBloom position={[0.02, 0.6, 0.02]} color="#f39c12" />
      )}

      {/* Small Brown Pot Base */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.16, 0.15, 8]} />
        <meshStandardMaterial color="#8e4a23" roughness={0.9} />
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
    weedRef.current.rotation.z = Math.sin(t * 1.8) * 0.04;
  });

  const baseColor = useMemo(() => {
    const s = status.toLowerCase();
    if (s === 'backlog') return new THREE.Color('#9c9892'); // Dry grey weed
    return new THREE.Color('#e74c3c'); // Active red critical weed
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
      <group position={[0, 0.05, 0]}>
        {/* Organic Leafy Weed Blades (Hay Day Style) */}
        {/* Flat, elongated, smooth spheres rotated outwards in a rosette */}
        {/* Leaf 1 */}
        <mesh castShadow rotation={[0.3, 0, 0.45]} position={[0.1, 0.2, 0.02]} scale={[0.08, 0.4, 0.24]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.12) : baseColor} roughness={0.85} />
        </mesh>
        {/* Leaf 2 */}
        <mesh castShadow rotation={[-0.3, 0, -0.45]} position={[-0.1, 0.2, -0.02]} scale={[0.08, 0.4, 0.24]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.12) : baseColor} roughness={0.85} />
        </mesh>
        {/* Leaf 3 */}
        <mesh castShadow rotation={[0.45, 0.2, 0.1]} position={[0.02, 0.18, 0.1]} scale={[0.07, 0.36, 0.2]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.12) : baseColor} roughness={0.85} />
        </mesh>
        {/* Leaf 4 */}
        <mesh castShadow rotation={[-0.45, -0.2, -0.1]} position={[-0.02, 0.18, -0.1]} scale={[0.07, 0.36, 0.2]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.12) : baseColor} roughness={0.85} />
        </mesh>
        {/* Leaf 5 (Center tall leaf) */}
        <mesh castShadow rotation={[0.05, 0, -0.05]} position={[0, 0.26, 0]} scale={[0.08, 0.48, 0.26]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.15) : baseColor} roughness={0.85} />
        </mesh>
        {/* Leaf 6 (Extra small side leaf) */}
        <mesh castShadow rotation={[0.1, 0.4, 0.7]} position={[0.12, 0.14, -0.04]} scale={[0.06, 0.26, 0.18]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.12) : baseColor} roughness={0.85} />
        </mesh>
        {/* Leaf 7 (Extra small side leaf) */}
        <mesh castShadow rotation={[-0.1, -0.4, -0.7]} position={[-0.12, 0.14, 0.04]} scale={[0.06, 0.26, 0.18]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.12) : baseColor} roughness={0.85} />
        </mesh>
      </group>
    </group>
  );
}

// ─── 4. Garden Gnome (Interactive Static Agent) ──────────────────────
interface GnomeProps {
  position: [number, number, number];
  color: string;
  name: string;
  role: string;
  onHover?: (data: HoveredData | null) => void;
  onClick?: () => void;
}

export function GardenGnome({ position, color, name, role, onHover, onClick }: GnomeProps) {
  const [hovered, setHovered] = useState(false);
  const gnomeRef = useRef<THREE.Group>(null);

  // Soft breathing scaling wiggles
  useFrame((state) => {
    if (!gnomeRef.current) return;
    const t = state.clock.getElapsedTime();
    gnomeRef.current.position.y = position[1] + Math.sin(t * 1.5) * 0.012;
  });

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    setHovered(true);
    if (onHover) {
      onHover({
        node: {
          id: `gnome-${name.toLowerCase().replace(/\s+/g, '-')}`,
          title: name,
          progress: 1.0,
          complexity: 0.5,
          risk: 0.1,
          description: role,
          elementType: 'Garden Gnome'
        } as any,
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
          id: `gnome-${name.toLowerCase().replace(/\s+/g, '-')}`,
          title: name,
          progress: 1.0,
          complexity: 0.5,
          risk: 0.1,
          description: role,
          elementType: 'Garden Gnome'
        } as any,
        x: e.clientX,
        y: e.clientY
      });
    }
  };

  return (
    <group
      ref={gnomeRef}
      position={position}
      onClick={onClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerMove={handlePointerMove}
    >
      {/* Gnome Body (Coat) */}
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 0.2, 8]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      
      {/* Fluffy Beard */}
      <mesh position={[0, 0.22, 0.045]} castShadow>
        <sphereGeometry args={[0.052, 8, 8]} scale={[1, 1.4, 0.75]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </mesh>

      {/* Peach Face */}
      <mesh position={[0, 0.27, 0.015]} castShadow>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#ffdbac" roughness={0.8} />
      </mesh>

      {/* Small Pinkish Nose */}
      <mesh position={[0, 0.26, 0.062]}>
        <sphereGeometry args={[0.014, 6, 6]} />
        <meshStandardMaterial color="#ffb07c" />
      </mesh>

      {/* Tall Red Pointed Gnome Hat */}
      <mesh position={[0, 0.4, -0.01]} rotation={[-0.1, 0, 0]} castShadow>
        <coneGeometry args={[0.065, 0.25, 8]} />
        <meshStandardMaterial color={hovered ? '#e74c3c' : '#c0392b'} roughness={0.8} />
      </mesh>

      {/* Black Boots */}
      <mesh position={[-0.035, 0.035, 0.01]} castShadow>
        <boxGeometry args={[0.035, 0.07, 0.06]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      <mesh position={[0.035, 0.035, 0.01]} castShadow>
        <boxGeometry args={[0.035, 0.07, 0.06]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
    </group>
  );
}

// ─── 5. Irregular Picket Fence Segment (Chunky Hand-crafted) ────────
interface FenceProps {
  position: [number, number, number];
  rotation?: [number, number, number];
}

export function Fence({ position, rotation = [0, 0, 0] }: FenceProps) {
  return (
    <group position={position} rotation={rotation}>
      {/* Heavy Corner Slat Posts (Fidelity upgrade) */}
      <mesh position={[-0.75, 0.38, 0]} castShadow>
        <boxGeometry args={[0.09, 0.76, 0.09]} />
        <meshStandardMaterial color="#b5a28c" roughness={0.95} />
      </mesh>
      <mesh position={[-0.75, 0.78, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.075, 0.08, 4]} />
        <meshStandardMaterial color="#b5a28c" roughness={0.95} />
      </mesh>
      <mesh position={[0.75, 0.38, 0]} castShadow>
        <boxGeometry args={[0.09, 0.76, 0.09]} />
        <meshStandardMaterial color="#b5a28c" roughness={0.95} />
      </mesh>
      <mesh position={[0.75, 0.78, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.075, 0.08, 4]} />
        <meshStandardMaterial color="#b5a28c" roughness={0.95} />
      </mesh>

      {/* Horizontal rails */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[1.5, 0.04, 0.04]} />
        <meshStandardMaterial color="#dfcbba" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.48, 0]} castShadow>
        <boxGeometry args={[1.5, 0.04, 0.04]} />
        <meshStandardMaterial color="#dfcbba" roughness={0.9} />
      </mesh>

      {/* Chunky Irregular Pickets */}
      {[-0.6, -0.3, 0, 0.3, 0.6].map((x, i) => {
        // Deterministic offset based on x coordinate to look hand-crafted
        const rotationZ = Math.sin(x * 10) * 0.035;
        const heightScale = 1.0 + Math.cos(x * 20) * 0.05;
        return (
          <group key={i} position={[x, 0.32 * heightScale, 0]} rotation={[0, 0, rotationZ]}>
            <mesh castShadow>
              <boxGeometry args={[0.07, 0.64 * heightScale, 0.025]} />
              <meshStandardMaterial color="#f7f5ef" roughness={0.9} />
            </mesh>
            {/* Pointed Slat tips */}
            <mesh position={[0, 0.34 * heightScale, 0]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.05, 0.05, 0.025]} />
              <meshStandardMaterial color="#f7f5ef" roughness={0.9} />
            </mesh>
          </group>
        );
      })}

      {/* Climbing morning glory vine details at base (Fidelity upgrade) */}
      {[-0.5, 0, 0.5].map((vx, vi) => (
        <group key={`vine-${vi}`} position={[vx, 0.08, 0.02]}>
          <mesh>
            <sphereGeometry args={[0.04, 4, 4]} />
            <meshStandardMaterial color="#27ae60" roughness={0.9} />
          </mesh>
          <mesh position={[0.03, 0.03, 0.02]} rotation={[Math.PI / 6, 0, 0]}>
            <coneGeometry args={[0.035, 0.07, 5]} />
            <meshStandardMaterial color="#9b59b6" roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── 6. 3D Grass Tuft Component ─────────────────────────────────────
export function GrassTuft({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh rotation={[0.18, 0.05, 0.1]} castShadow>
        <coneGeometry args={[0.02, 0.2, 3]} />
        <meshStandardMaterial color="#3d5c36" roughness={0.95} />
      </mesh>
      <mesh rotation={[-0.12, -0.15, -0.12]} position={[0.05, 0, 0.03]} castShadow>
        <coneGeometry args={[0.016, 0.16, 3]} />
        <meshStandardMaterial color="#496d41" roughness={0.95} />
      </mesh>
      <mesh rotation={[0.08, -0.08, 0.22]} position={[-0.04, 0, -0.04]} castShadow>
        <coneGeometry args={[0.014, 0.14, 3]} />
        <meshStandardMaterial color="#557d4c" roughness={0.95} />
      </mesh>
    </group>
  );
}

// ─── 7. Cozy Garden Lantern ─────────────────────────────────────────
export function Lantern({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Wooden Post */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.07, 0.9, 0.07]} />
        <meshStandardMaterial color="#5c4033" roughness={0.95} />
      </mesh>

      {/* Metal Arm */}
      <mesh position={[0.08, 0.85, 0]} castShadow>
        <boxGeometry args={[0.16, 0.03, 0.03]} />
        <meshStandardMaterial color="#2c3e50" roughness={0.8} />
      </mesh>

      {/* Lantern Cap */}
      <mesh position={[0.16, 0.8, 0]} castShadow>
        <coneGeometry args={[0.1, 0.08, 6]} />
        <meshStandardMaterial color="#2c3e50" roughness={0.8} />
      </mesh>

      {/* Glass Body */}
      <mesh position={[0.16, 0.72, 0]}>
        <cylinderGeometry args={[0.05, 0.04, 0.08, 6]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.65} roughness={0.1} />
      </mesh>

      {/* Bulb */}
      <mesh position={[0.16, 0.72, 0]}>
        <sphereGeometry args={[0.024, 6, 6]} />
        <meshBasicMaterial color="#f1c40f" />
      </mesh>

      {/* Glow Point Light */}
      <pointLight position={[0.16, 0.72, 0]} color="#f39c12" intensity={1.2} distance={6} decay={2} castShadow />
    </group>
  );
}

// ─── 8. Animated Cartoon Chicken (Pecking Grass) ────────────────────
export function Chicken({ position, speed = 1.0, phase = 0 }: { position: [number, number, number]; speed?: number; phase?: number }) {
  const chickenRef = useRef<THREE.Group>(null);
  const neckRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!neckRef.current || !chickenRef.current) return;
    const t = state.clock.getElapsedTime() * speed * 1.8 + phase;
    
    // Periodic pecking dip
    const rawSin = Math.sin(t);
    const peckAngle = rawSin > 0.45 ? (rawSin - 0.45) * 0.9 : 0;
    neckRef.current.rotation.x = peckAngle;

    // Small hopping / pecking steps
    const hopTime = state.clock.getElapsedTime() * 0.4 + phase;
    if (Math.sin(hopTime * 3) > 0.94) {
      chickenRef.current.position.y = position[1] + 0.06;
      chickenRef.current.rotation.y = (Math.sin(hopTime) * Math.PI) / 4 + phase;
    } else {
      chickenRef.current.position.y = position[1];
    }
  });

  return (
    <group ref={chickenRef} position={position}>
      {/* Round chunky body */}
      <mesh position={[0, 0.14, 0]} castShadow>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </mesh>

      {/* Neck / Head Group */}
      <group ref={neckRef} position={[0.08, 0.16, 0]}>
        {/* Head */}
        <mesh position={[0.07, 0.08, 0]} castShadow>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="#ffffff" roughness={0.9} />
        </mesh>
        {/* Beak */}
        <mesh position={[0.14, 0.07, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.022, 0.05, 4]} />
          <meshStandardMaterial color="#f39c12" roughness={0.25} />
        </mesh>
        {/* Black eyes */}
        <mesh position={[0.11, 0.1, 0.038]}>
          <sphereGeometry args={[0.01, 4, 4]} />
          <meshBasicMaterial color="#1a1a24" />
        </mesh>
        <mesh position={[0.11, 0.1, -0.038]}>
          <sphereGeometry args={[0.01, 4, 4]} />
          <meshBasicMaterial color="#1a1a24" />
        </mesh>
        {/* Comb (Crest) */}
        <mesh position={[0.05, 0.16, 0]}>
          <boxGeometry args={[0.045, 0.035, 0.018]} />
          <meshStandardMaterial color="#e74c3c" />
        </mesh>
      </group>

      {/* Tail feather tuft */}
      <mesh position={[-0.12, 0.18, 0]} rotation={[0, 0, 0.4]} castShadow>
        <boxGeometry args={[0.07, 0.07, 0.035]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </mesh>

      {/* Little yellow legs */}
      <mesh position={[-0.03, 0.04, 0.03]} castShadow>
        <cylinderGeometry args={[0.008, 0.008, 0.08, 4]} />
        <meshStandardMaterial color="#f1c40f" />
      </mesh>
      <mesh position={[0.03, 0.04, -0.03]} castShadow>
        <cylinderGeometry args={[0.008, 0.008, 0.08, 4]} />
        <meshStandardMaterial color="#f1c40f" />
      </mesh>
    </group>
  );
}

// ─── 9. Wooden Barrel Detail Clutter ────────────────────────────────
export function WoodenBarrel({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Wood slats cylinder - Smoother and bulgy */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.5, 18]} />
        <meshStandardMaterial color="#7a5230" roughness={0.95} flatShading />
      </mesh>

      {/* Wooden Top Lid */}
      <mesh position={[0, 0.49, 0]} castShadow>
        <cylinderGeometry args={[0.17, 0.17, 0.02, 18]} />
        <meshStandardMaterial color="#633e21" roughness={0.9} />
      </mesh>

      {/* Spigot Tap */}
      <mesh position={[0, 0.25, 0.22]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.08, 8]} />
        <meshStandardMaterial color="#4a4d4f" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* 3 Iron Hoop Rings */}
      <mesh position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.185, 0.012, 4, 24]} />
        <meshStandardMaterial color="#4a4d4f" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.225, 0.012, 4, 24]} />
        <meshStandardMaterial color="#4a4d4f" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.185, 0.012, 4, 24]} />
        <meshStandardMaterial color="#4a4d4f" metalness={0.85} roughness={0.2} />
      </mesh>
    </group>
  );
}

// ─── 10. Crop Backlog Crate ─────────────────────────────────────────
export function CropCrate({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Crate Box */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <boxGeometry args={[0.5, 0.2, 0.4]} />
        <meshStandardMaterial color="#a07246" roughness={0.95} />
      </mesh>

      {/* Slat panels */}
      <mesh position={[0, 0.1, 0.202]} castShadow>
        <boxGeometry args={[0.52, 0.17, 0.008]} />
        <meshStandardMaterial color="#8a5e37" />
      </mesh>
      <mesh position={[0, 0.1, -0.202]} castShadow>
        <boxGeometry args={[0.52, 0.17, 0.008]} />
        <meshStandardMaterial color="#8a5e37" />
      </mesh>

      {/* Diagonal X-bracing on front and back for high-fidelity look */}
      <mesh position={[0, 0.1, 0.205]} rotation={[0, 0, 0.35]} castShadow>
        <boxGeometry args={[0.55, 0.03, 0.006]} />
        <meshStandardMaterial color="#714a27" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.1, 0.205]} rotation={[0, 0, -0.35]} castShadow>
        <boxGeometry args={[0.55, 0.03, 0.006]} />
        <meshStandardMaterial color="#714a27" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.1, -0.205]} rotation={[0, 0, 0.35]} castShadow>
        <boxGeometry args={[0.55, 0.03, 0.006]} />
        <meshStandardMaterial color="#714a27" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.1, -0.205]} rotation={[0, 0, -0.35]} castShadow>
        <boxGeometry args={[0.55, 0.03, 0.006]} />
        <meshStandardMaterial color="#714a27" roughness={0.9} />
      </mesh>

      {/* Apples (PR Nodes) filling the crate with tiny green stem/leaf detail */}
      {[-0.15, 0, 0.15].map((x, idx) =>
        [-0.1, 0.1].map((z, jdx) => (
          <group key={`${idx}-${jdx}`} position={[x, 0.19, z]}>
            {/* Apple Fruit */}
            <mesh castShadow>
              <sphereGeometry args={[0.065, 12, 12]} />
              <meshStandardMaterial color="#d35400" roughness={0.25} />
            </mesh>
            {/* Small green leaf stem */}
            <mesh position={[0, 0.06, 0]} rotation={[0.4, 0, 0.2]} scale={[0.1, 0.8, 0.25]} castShadow>
              <sphereGeometry args={[0.02, 6, 6]} />
              <meshStandardMaterial color="#27ae60" roughness={0.6} />
            </mesh>
          </group>
        ))
      )}
    </group>
  );
}

// ─── 11. Colorful Wildflower ────────────────────────────────────────
export function Wildflower({ position, color = '#ffffff', scale = 1.0 }: { position: [number, number, number]; color?: string; scale?: number }) {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Center Pollen */}
      <mesh position={[0, 0.04, 0]}>
        <sphereGeometry args={[0.02, 6, 6]} />
        <meshStandardMaterial color="#f1c40f" roughness={0.3} />
      </mesh>

      {/* Petals */}
      {[[0.03, 0], [-0.03, 0], [0, 0.03], [0, -0.03]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.035, z]} rotation={[0, (i * Math.PI) / 4, 0]}>
          <sphereGeometry args={[0.02, 6, 6]} scale={[1.3, 0.5, 0.7]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// ─── 12. Chicken Coop (Farming aesthetic centerpiece) ───────────────
export function ChickenCoop({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Main Red Barnwood House */}
      <mesh position={[0, 0.38, 0]} castShadow>
        <boxGeometry args={[0.85, 0.65, 0.65]} />
        <meshStandardMaterial color="#b23b3b" roughness={0.85} />
      </mesh>

      {/* White Corner Trim */}
      <mesh position={[0, 0.71, 0]} castShadow>
        <boxGeometry args={[0.9, 0.03, 0.69]} />
        <meshStandardMaterial color="#f5f6fa" roughness={0.8} />
      </mesh>

      {/* A-Frame Roof (Cozy shingled look) */}
      <mesh position={[0, 0.82, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[0.62, 0.62, 0.7]} />
        <meshStandardMaterial color="#d35400" roughness={0.9} flatShading />
      </mesh>

      {/* Ramp leading down */}
      <mesh position={[-0.45, 0.15, 0.12]} rotation={[0, 0, 0.52]} castShadow>
        <boxGeometry args={[0.42, 0.024, 0.18]} />
        <meshStandardMaterial color="#7f8c8d" roughness={0.9} />
      </mesh>

      {/* Ramp steps */}
      {[-0.1, 0, 0.1].map((rx, idx) => (
        <mesh key={idx} position={[-0.45 + rx, 0.18 + rx * 0.5, 0.12]} castShadow>
          <boxGeometry args={[0.015, 0.015, 0.16]} />
          <meshStandardMaterial color="#2f3640" />
        </mesh>
      ))}

      {/* Stilts Legs */}
      {[-0.32, 0.32].map((x) =>
        [-0.22, 0.22].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.1, z]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.2, 6]} />
            <meshStandardMaterial color="#2f3640" roughness={0.9} />
          </mesh>
        ))
      )}
    </group>
  );
}

// ─── TALL CORN CROP ──────────────────────────────────────────────────
export function TallCornCrop({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Green main stalk */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.024, 0.6, 6]} />
        <meshStandardMaterial color="#2d5e20" roughness={0.8} flatShading />
      </mesh>
      {/* Leaves */}
      <mesh position={[0.08, 0.25, 0]} rotation={[0, 0, -Math.PI / 4]} castShadow>
        <boxGeometry args={[0.12, 0.012, 0.03]} />
        <meshStandardMaterial color="#4a8f33" roughness={0.8} />
      </mesh>
      <mesh position={[-0.08, 0.38, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[0.12, 0.012, 0.03]} />
        <meshStandardMaterial color="#4a8f33" roughness={0.8} />
      </mesh>
      {/* Yellow corn cobs */}
      <mesh position={[0.04, 0.3, 0.02]} rotation={[0, 0.3, -0.2]} castShadow>
        <dodecahedronGeometry args={[0.05, 0]} />
        <meshStandardMaterial color="#f1c40f" roughness={0.6} />
      </mesh>
    </group>
  );
}

// ─── CABBAGE CROP ────────────────────────────────────────────────────
export function CabbageCrop({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Outer dark leaves */}
      <mesh position={[0, 0.06, 0]} castShadow>
        <dodecahedronGeometry args={[0.13, 0]} />
        <meshStandardMaterial color="#1f4c22" roughness={0.9} flatShading />
      </mesh>
      {/* Inner light leaf cluster */}
      <mesh position={[0, 0.09, 0]} castShadow>
        <dodecahedronGeometry args={[0.095, 1]} />
        <meshStandardMaterial color="#7ed685" roughness={0.85} flatShading />
      </mesh>
    </group>
  );
}

// ─── CARROT CROP ─────────────────────────────────────────────────────
export function CarrotCrop({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Orange root sticking out slightly */}
      <mesh position={[0, 0.06, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <coneGeometry args={[0.05, 0.16, 6]} />
        <meshStandardMaterial color="#e67e22" roughness={0.7} flatShading />
      </mesh>
      {/* Green leaves */}
      <mesh position={[0, 0.13, 0]} castShadow>
        <dodecahedronGeometry args={[0.04, 0]} />
        <meshStandardMaterial color="#27ae60" roughness={0.85} />
      </mesh>
    </group>
  );
}

// ─── VOLUMETRIC SUNBEAM GOD RAYS ─────────────────────────────────────
export function Sunbeams() {
  return (
    <group position={[12, 12, -6]} rotation={[0, 0, -Math.PI / 4]}>
      <mesh>
        <cylinderGeometry args={[0.2, 5, 20, 8, 1, true]} />
        <meshBasicMaterial color="#fff6d1" transparent opacity={0.12} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[-1.2, 0, 0.8]} rotation={[0.1, 0, 0.1]}>
        <cylinderGeometry args={[0.1, 4, 18, 8, 1, true]} />
        <meshBasicMaterial color="#fffdf0" transparent opacity={0.08} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

