import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface TaskNode {
  id: string;
  title: string;
  progress: number; // 0.0 to 1.0
  complexity: number; // 1 to 4 (recursion depth limit)
  risk: number; // 0.0 to 1.0 (drives gnarled angles + sway amplitude)
  subtasks?: TaskNode[];
  description?: string;
}

export interface HoveredData {
  node: TaskNode;
  x: number;
  y: number;
}

interface BranchProps {
  node: TaskNode;
  depth: number;
  maxDepth: number;
  length: number;
  radius: number;
  onHover: (data: HoveredData | null) => void;
}

function Branch({ node, depth, maxDepth, length, radius, onHover }: BranchProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Sway based on risk factor (higher risk sways more) and hover state (physical response)
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    const swayAmplitude = isHovered ? 0.04 * (node.risk + 0.1) : 0.015 * (node.risk + 0.1);
    groupRef.current.rotation.z = Math.sin(t + depth) * swayAmplitude;
  });

  if (depth > maxDepth) return null;

  // Base colors on progress: healthy green vs unstarted/delayed orange/amber
  const baseBranchColor = new THREE.Color('#4d3319').lerp(new THREE.Color('#2d1a0a'), depth / maxDepth);
  const branchColor = isHovered ? baseBranchColor.clone().addScalar(0.15) : baseBranchColor;

  const baseLeafColor = new THREE.Color('#d35400').lerp(new THREE.Color('#27ae60'), node.progress);
  const leafColor = isHovered ? baseLeafColor.clone().addScalar(0.2) : baseLeafColor;

  const children = node.subtasks || [];
  const branchCount = children.length;

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    setIsHovered(true);
    onHover({
      node,
      x: e.clientX,
      y: e.clientY
    });
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    document.body.style.cursor = 'default';
    setIsHovered(false);
    onHover(null);
  };

  const handlePointerMove = (e: any) => {
    e.stopPropagation();
    onHover({
      node,
      x: e.clientX,
      y: e.clientY
    });
  };

  return (
    <group ref={groupRef}>
      {/* Branch cylinder */}
      <mesh
        position={[0, length / 2, 0]}
        rotation={[Math.sin(length * 12) * 0.05, 0, Math.cos(radius * 24) * 0.05]} // Whimsical organic bend
        castShadow
        receiveShadow
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerMove={handlePointerMove}
      >
        <cylinderGeometry args={[radius * 0.7, radius, length, 8]} />
        <meshStandardMaterial color={branchColor} roughness={0.95} flatShading />
      </mesh>

      {/* Sprout leaves at leaf node or max depth */}
      {depth === maxDepth || children.length === 0 ? (
        <group
          position={[0, length, 0]}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onPointerMove={handlePointerMove}
        >
          {/* Main Faceted Leaf Cluster */}
          <mesh castShadow>
            <dodecahedronGeometry args={[radius * 2.6 * (node.progress + 0.5), 1]} />
            <meshStandardMaterial
              color={leafColor}
              roughness={0.9}
              flatShading
              emissive={leafColor}
              emissiveIntensity={isHovered ? 0.35 : node.progress * 0.12}
            />
          </mesh>
          {/* Top Leaf Cluster */}
          <mesh castShadow position={[0, radius * 1.3, 0]}>
            <dodecahedronGeometry args={[radius * 1.9 * (node.progress + 0.5), 1]} />
            <meshStandardMaterial
              color={leafColor}
              roughness={0.9}
              flatShading
              emissive={leafColor}
              emissiveIntensity={isHovered ? 0.35 : node.progress * 0.1}
            />
          </mesh>
          {/* Left Leaf Cluster */}
          <mesh castShadow position={[-radius * 1.4, 0, 0]}>
            <dodecahedronGeometry args={[radius * 1.7 * (node.progress + 0.5), 1]} />
            <meshStandardMaterial
              color={leafColor}
              roughness={0.9}
              flatShading
              emissive={leafColor}
              emissiveIntensity={isHovered ? 0.35 : node.progress * 0.1}
            />
          </mesh>
          {/* Back Leaf Cluster */}
          <mesh castShadow position={[0, -radius * 0.3, -radius * 1.2]}>
            <dodecahedronGeometry args={[radius * 1.6 * (node.progress + 0.5), 1]} />
            <meshStandardMaterial
              color={leafColor}
              roughness={0.9}
              flatShading
              emissive={leafColor}
              emissiveIntensity={isHovered ? 0.35 : node.progress * 0.1}
            />
          </mesh>

          {/* Stylized hanging fruits (Apples/Peaches) */}
          {[[0.2, 0.1, 0.2], [-0.2, -0.1, 0.2], [0.3, -0.2, -0.2], [-0.3, 0.2, -0.3]].map((fPos, fIdx) => {
            const isRedApple = !node.id.includes('issue'); // Apple tree on PRs, peach tree on Issues
            const fruitColor = isRedApple ? '#e74c3c' : '#e67e22';
            return (
              <mesh
                key={`fruit-${fIdx}`}
                position={[
                  fPos[0] * radius * 3.2 * (node.progress + 0.5),
                  fPos[1] * radius * 3.2 * (node.progress + 0.5) - 0.2,
                  fPos[2] * radius * 3.2 * (node.progress + 0.5),
                ]}
                castShadow
              >
                <sphereGeometry args={[radius * 0.45 * (node.progress + 0.5), 6, 6]} />
                <meshStandardMaterial color={fruitColor} roughness={0.3} />
              </mesh>
            );
          })}
        </group>
      ) : (
        // Sprout child branches
        <group position={[0, length, 0]}>
          {children.map((subtask, index) => {
            const angleSpread = 0.45 + (node.risk * 0.2);
            const mid = (branchCount - 1) / 2;
            const zRotation = (index - mid) * angleSpread;
            const yRotation = (index * Math.PI * 2) / branchCount;

            return (
              <group key={subtask.id} rotation={[0, yRotation, zRotation]}>
                <Branch
                  node={subtask}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                  length={length * 0.72}
                  radius={radius * 0.65}
                  onHover={onHover}
                />
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
}

export function DataTree({ data, onHover }: { data: TaskNode; onHover: (data: HoveredData | null) => void }) {
  const safeMaxDepth = Math.min(data.complexity, 4);

  return (
    <group>
      <Branch
        node={data}
        depth={0}
        maxDepth={safeMaxDepth}
        length={3}
        radius={0.25}
        onHover={onHover}
      />
    </group>
  );
}
