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
  const waterRef = useRef<THREE.Mesh>(null);
  
  // Water color shifts from lush cyan-blue (CRR >= 1.2) to warning orange-red (CRR < 0.8)
  const waterColor = useMemo(() => {
    const healthy = new THREE.Color('#3498db');
    const warning = new THREE.Color('#e74c3c');
    const factor = Math.min(Math.max((crr - 0.7) / 0.8, 0), 1);
    return warning.lerp(healthy, factor);
  }, [crr]);

  // Sparkle water ripples
  useFrame((state) => {
    if (!waterRef.current) return;
    const t = state.clock.getElapsedTime();
    const scale = 1.0 + Math.sin(t * 2) * 0.015;
    waterRef.current.scale.set(scale, 1.0, scale);
    if (Array.isArray(waterRef.current.material)) {
      // noop
    } else if (waterRef.current.material) {
      const mat = waterRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.15 + Math.sin(t * 3.5) * 0.08;
    }
  });

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
      <mesh ref={waterRef} position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.72, 0.72, 0.08, 12]} />
        <meshStandardMaterial
          color={waterColor}
          roughness={0.1}
          metalness={0.8}
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
          <sphereGeometry args={[0.06, 6, 6]} />
          <meshStandardMaterial color="#27ae60" roughness={0.95} />
        </mesh>
        <mesh position={[-0.04, 0.1, 0.05]} castShadow>
          <sphereGeometry args={[0.07, 6, 6]} />
          <meshStandardMaterial color="#1e824c" roughness={0.95} />
        </mesh>
        <mesh position={[0.05, 0.35, -0.04]} castShadow>
          <sphereGeometry args={[0.05, 6, 6]} />
          <meshStandardMaterial color="#2ecc71" roughness={0.95} />
        </mesh>
      </group>
      <group position={[0.65, 0.85, 0]}>
        <mesh position={[-0.06, -0.15, -0.03]} castShadow>
          <sphereGeometry args={[0.065, 6, 6]} />
          <meshStandardMaterial color="#27ae60" roughness={0.95} />
        </mesh>
        <mesh position={[0.04, 0.15, 0.04]} castShadow>
          <sphereGeometry args={[0.055, 6, 6]} />
          <meshStandardMaterial color="#1e824c" roughness={0.95} />
        </mesh>
      </group>

      {/* Crossbar Log */}
      <mesh position={[0, 1.4, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 1.25, 8]} />
        <meshStandardMaterial color="#5c4033" roughness={0.9} />
      </mesh>

      {/* Crank Wheel (Hay Day style toy detailing) */}
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

      {/* Well Roof */}
      <mesh position={[0, 1.7, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.1, 0.55, 4]} />
        <meshStandardMaterial color="#8e44ad" roughness={0.85} flatShading />
      </mesh>
    </group>
  );
}

// ─── 2. Fluffy Rose Bush (Pull Request) ──────────────────────────────
interface BushProps extends AssetProps {
  status: string; // 'approved', 'under review', 'draft'
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
      {/* 5-Sphere Organic Fluffy Cloud Foliage */}
      <mesh castShadow position={[0, 0.32, 0]}>
        <sphereGeometry args={[0.36, 10, 10]} />
        <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.12) : baseColor} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0.12, 0.42, -0.08]}>
        <sphereGeometry args={[0.26, 8, 8]} />
        <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.12) : baseColor} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[-0.12, 0.4, 0.08]}>
        <sphereGeometry args={[0.24, 8, 8]} />
        <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.12) : baseColor} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0.08, 0.28, 0.12]}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.12) : baseColor} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[-0.1, 0.28, -0.1]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.12) : baseColor} roughness={0.85} />
      </mesh>

      {/* Tiny colorful blooms */}
      {(status.toLowerCase() === 'approved' || status.toLowerCase() === 'completed') && (
        <>
          <mesh position={[0.15, 0.52, 0.15]} castShadow>
            <sphereGeometry args={[0.06, 6, 6]} />
            <meshStandardMaterial color="#e74c3c" emissive="#e74c3c" emissiveIntensity={0.25} />
          </mesh>
          <mesh position={[-0.18, 0.45, 0.2]} castShadow>
            <sphereGeometry args={[0.05, 6, 6]} />
            <meshStandardMaterial color="#e74c3c" />
          </mesh>
          <mesh position={[0.0, 0.56, -0.12]} castShadow>
            <sphereGeometry args={[0.05, 6, 6]} />
            <meshStandardMaterial color="#e74c3c" />
          </mesh>
        </>
      )}
      {(status.toLowerCase() === 'under review' || status.toLowerCase() === 'pending') && (
        <mesh position={[0.02, 0.6, 0.02]} castShadow>
          <sphereGeometry args={[0.06, 6, 6]} />
          <meshStandardMaterial color="#f1c40f" />
        </mesh>
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
      <group position={[0, 0.05, 0]}>
        {/* Leaf Blades */}
        <mesh castShadow rotation={[0, 0, 0.45]} position={[0.1, 0.2, 0]}>
          <coneGeometry args={[0.06, 0.45, 4]} />
          <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.12) : baseColor} roughness={0.8} />
        </mesh>
        <mesh castShadow rotation={[0, 0, -0.45]} position={[-0.1, 0.2, 0]}>
          <coneGeometry args={[0.06, 0.45, 4]} />
          <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.12) : baseColor} roughness={0.8} />
        </mesh>
        <mesh castShadow rotation={[0.4, 0, 0]} position={[0, 0.18, 0.1]}>
          <coneGeometry args={[0.05, 0.38, 4]} />
          <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.12) : baseColor} roughness={0.8} />
        </mesh>
        <mesh castShadow rotation={[-0.4, 0, 0]} position={[0, 0.18, -0.1]}>
          <coneGeometry args={[0.05, 0.38, 4]} />
          <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.12) : baseColor} roughness={0.8} />
        </mesh>
        <mesh castShadow position={[0, 0.28, 0]}>
          <coneGeometry args={[0.045, 0.55, 4]} />
          <meshStandardMaterial color={hovered ? baseColor.clone().addScalar(0.15) : baseColor} roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

// ─── 4. Animated Fluttering Butterfly (Agent) ──────────────────────
interface ButterflyProps {
  color: string;
  orbitRadius: number;
  speed: number;
  heightOffset: number;
  phase?: number;
}

export function Butterfly({ color, orbitRadius, speed, heightOffset, phase = 0 }: ButterflyProps) {
  const meshRef = useRef<THREE.Group>(null);
  const leftWingRef = useRef<THREE.Group>(null);
  const rightWingRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime() * speed + phase;
    
    // Orbit around well
    const x = Math.sin(t) * orbitRadius;
    const z = Math.cos(t) * orbitRadius;
    const y = heightOffset + Math.sin(t * 2.5) * 0.22;

    meshRef.current.position.set(x, y, z);
    meshRef.current.rotation.y = t + Math.PI / 2;

    // Wing flapping flap-loop
    const flapSpeed = 20;
    const angle = Math.sin(state.clock.getElapsedTime() * flapSpeed) * 0.55;
    if (leftWingRef.current) leftWingRef.current.rotation.z = -angle - 0.2;
    if (rightWingRef.current) rightWingRef.current.rotation.z = angle + 0.2;
  });

  return (
    <group ref={meshRef}>
      {/* Body */}
      <mesh>
        <sphereGeometry args={[0.045, 6, 6]} />
        <meshBasicMaterial color="#1a1a24" />
      </mesh>

      {/* Left Wing (hinged) */}
      <group position={[-0.02, 0, 0]} ref={leftWingRef}>
        <mesh position={[-0.08, 0, 0]}>
          <boxGeometry args={[0.13, 0.008, 0.1]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} />
        </mesh>
      </group>

      {/* Right Wing (hinged) */}
      <group position={[0.02, 0, 0]} ref={rightWingRef}>
        <mesh position={[0.08, 0, 0]}>
          <boxGeometry args={[0.13, 0.008, 0.1]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} />
        </mesh>
      </group>
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
      {/* Wood slats cylinder */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.21, 0.5, 9]} />
        <meshStandardMaterial color="#7a5230" roughness={0.95} flatShading />
      </mesh>

      {/* Iron Hoop Rings */}
      <mesh position={[0, 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.19, 0.01, 4, 16]} />
        <meshStandardMaterial color="#4a4d4f" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.19, 0.01, 4, 16]} />
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

      {/* Apples (PR Nodes) filling the crate */}
      {[-0.15, 0, 0.15].map((x, idx) =>
        [-0.1, 0.1].map((z, jdx) => (
          <mesh key={`${idx}-${jdx}`} position={[x, 0.19, z]} castShadow>
            <sphereGeometry args={[0.065, 8, 8]} />
            <meshStandardMaterial color="#d35400" roughness={0.25} />
          </mesh>
        ))
      )}
    </group>
  );
}

// ─── 11. Colorful Wildflower ────────────────────────────────────────
export function Wildflower({ position, color = '#ffffff' }: { position: [number, number, number]; color?: string }) {
  return (
    <group position={position}>
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
