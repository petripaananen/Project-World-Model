import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface WeatherProps {
  isRainy: boolean;
}

export function WeatherSystem({ isRainy }: WeatherProps) {
  const rainCount = 400;
  const rainRef = useRef<THREE.Points>(null);

  // Initialize random positions for rain particles
  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(rainCount * 3);
    const vel = new Float32Array(rainCount);
    for (let i = 0; i < rainCount; i++) {
      // Symmetrical dispersion over the garden
      pos[i * 3] = (Math.random() - 0.5) * 20; // x
      pos[i * 3 + 1] = Math.random() * 8 + 2;   // y (height)
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20; // z
      vel[i] = Math.random() * 0.15 + 0.15; // falling velocity
    }
    return [pos, vel];
  }, [rainCount]);

  useFrame(() => {
    if (!rainRef.current || !isRainy) return;
    const geo = rainRef.current.geometry;
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;

    for (let i = 0; i < rainCount; i++) {
      let y = posAttr.getY(i);
      y -= velocities[i];
      if (y < 0) {
        y = Math.random() * 8 + 2; // Reset particle back to top
      }
      posAttr.setY(i, y);
    }
    posAttr.needsUpdate = true;
  });

  return (
    <group>
      {/* Dynamic Moving Clouds */}
      <Cloud position={[-6, 6, -3]} speed={0.06} scale={[1.2, 0.8, 1.2]} color={isRainy ? '#7f8c8d' : '#ffffff'} />
      <Cloud position={[5, 7, 4]} speed={0.04} scale={[1.5, 0.9, 1.3]} color={isRainy ? '#7f8c8d' : '#ffffff'} />
      <Cloud position={[-1, 6.5, 6]} speed={0.03} scale={[1.0, 0.7, 1.0]} color={isRainy ? '#7f8c8d' : '#ffffff'} />

      {/* Rain Particle Points */}
      {isRainy && (
        <points ref={rainRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[positions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            color="#a2c4c9"
            size={0.07}
            transparent
            opacity={0.65}
            sizeAttenuation
          />
        </points>
      )}
    </group>
  );
}

// Procedural Cloud Component
interface CloudProps {
  position: [number, number, number];
  speed: number;
  scale?: [number, number, number];
  color?: string;
}

function Cloud({ position, speed, scale = [1, 1, 1], color = '#ffffff' }: CloudProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime() * speed;
    // Slow drifting in X direction, wrap around boundaries
    const offset = (t % 30) - 15;
    groupRef.current.position.x = position[0] + offset;
  });

  return (
    <group ref={groupRef} position={[position[0], position[1], position[2]]} scale={scale}>
      {/* Overlapping spheres forming a fluffy cloud */}
      <mesh position={[0, 0, 0]} castShadow>
        <sphereGeometry args={[0.65, 8, 8]} />
        <meshStandardMaterial color={color} roughness={0.9} transparent opacity={0.85} flatShading />
      </mesh>
      <mesh position={[-0.45, -0.1, 0.15]} castShadow>
        <sphereGeometry args={[0.45, 8, 8]} />
        <meshStandardMaterial color={color} roughness={0.9} transparent opacity={0.85} flatShading />
      </mesh>
      <mesh position={[0.45, -0.15, -0.1]} castShadow>
        <sphereGeometry args={[0.45, 8, 8]} />
        <meshStandardMaterial color={color} roughness={0.9} transparent opacity={0.85} flatShading />
      </mesh>
      <mesh position={[0, 0.25, -0.1]} castShadow>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshStandardMaterial color={color} roughness={0.9} transparent opacity={0.85} flatShading />
      </mesh>
    </group>
  );
}
