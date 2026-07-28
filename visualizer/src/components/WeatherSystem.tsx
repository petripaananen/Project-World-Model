import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface WeatherProps {
  isRainy: boolean;
}

function createRainData(count: number): [Float32Array, Float32Array] {
  const pos = new Float32Array(count * 2 * 3); // 2 vertices * 3 coordinates
  const vel = new Float32Array(count);
  
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 22;
    const y = Math.random() * 8 + 2;
    const z = (Math.random() - 0.5) * 22;
    const length = 0.4 + Math.random() * 0.3; // Rain streak length

    // Vertex 0 (top of streak)
    pos[i * 6] = x;
    pos[i * 6 + 1] = y;
    pos[i * 6 + 2] = z;

    // Vertex 1 (bottom of streak, slightly tilted for wind effect)
    pos[i * 6 + 3] = x - 0.05; // slight tilt
    pos[i * 6 + 4] = y - length;
    pos[i * 6 + 5] = z;

    vel[i] = Math.random() * 0.12 + 0.15; // falling velocity
  }
  return [pos, vel];
}

export function WeatherSystem({ isRainy }: WeatherProps) {
  const rainCount = 200;
  const rainRef = useRef<THREE.LineSegments>(null);

  // Initialize random positions for rain lines once on mount
  const [[positions, velocities]] = useState(() => createRainData(rainCount));

  useFrame(() => {
    if (!rainRef.current || !isRainy) return;
    const geo = rainRef.current.geometry;
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;

    for (let i = 0; i < rainCount; i++) {
      const y0 = posAttr.getY(i * 2);
      const y1 = posAttr.getY(i * 2 + 1);
      
      const newY0 = y0 - velocities[i];
      const newY1 = y1 - velocities[i];
      
      if (newY0 < 0) {
        // Reset streak to the top
        const resetY = Math.random() * 8 + 4;
        const length = y0 - y1;
        posAttr.setY(i * 2, resetY);
        posAttr.setY(i * 2 + 1, resetY - length);
      } else {
        posAttr.setY(i * 2, newY0);
        posAttr.setY(i * 2 + 1, newY1);
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <group>
      {/* Fluffy drifting clouds */}
      <Cloud position={[-6, 6.5, -4]} speed={0.05} scale={[1.3, 0.75, 1.3]} color={isRainy ? '#6c7a89' : '#fcfcfc'} />
      <Cloud position={[6, 7.5, 3]} speed={0.03} scale={[1.6, 0.85, 1.4]} color={isRainy ? '#6c7a89' : '#fcfcfc'} />
      <Cloud position={[0, 6.2, 5]} speed={0.04} scale={[1.1, 0.65, 1.1]} color={isRainy ? '#6c7a89' : '#fcfcfc'} />

      {/* Rain lines */}
      {isRainy && (
        <lineSegments ref={rainRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[positions, 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#8fb9c2"
            transparent
            opacity={0.45}
            linewidth={1}
          />
        </lineSegments>
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
    const offset = (t % 32) - 16;
    groupRef.current.position.x = position[0] + offset;
  });

  return (
    <group ref={groupRef} position={[position[0], position[1], position[2]]} scale={scale}>
      <mesh position={[0, 0, 0]} castShadow>
        <sphereGeometry args={[0.65, 8, 8]} />
        <meshStandardMaterial color={color} roughness={0.9} transparent opacity={0.8} flatShading />
      </mesh>
      <mesh position={[-0.45, -0.1, 0.15]} castShadow>
        <sphereGeometry args={[0.45, 8, 8]} />
        <meshStandardMaterial color={color} roughness={0.9} transparent opacity={0.8} flatShading />
      </mesh>
      <mesh position={[0.45, -0.15, -0.1]} castShadow>
        <sphereGeometry args={[0.45, 8, 8]} />
        <meshStandardMaterial color={color} roughness={0.9} transparent opacity={0.8} flatShading />
      </mesh>
      <mesh position={[0, 0.25, -0.1]} castShadow>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshStandardMaterial color={color} roughness={0.9} transparent opacity={0.8} flatShading />
      </mesh>
    </group>
  );
}
