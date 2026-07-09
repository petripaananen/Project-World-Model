import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BillboardTreeFoliage } from './BillboardAssets';

export interface TaskNode {
  id: string;
  title: string;
  progress: number; // 0.0 to 1.0
  complexity: number; // 1 to 4 (recursion depth limit)
  risk: number; // 0.0 to 1.0 (drives gnarled angles + sway amplitude)
  subtasks?: TaskNode[];
  description?: string;
  elementType?: string;
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
  theme?: string;
}

function Branch({ node, depth, maxDepth, length, radius, onHover, theme }: BranchProps) {
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
          <BillboardTreeFoliage
            radius={radius}
            progress={node.progress}
            isHovered={isHovered}
            theme={theme}
          />
        </group>
      ) : (
        // Sprout child branches
        <group position={[0, length, 0]}>
          {children.map((subtask, index) => {
            const angleSpread = 0.45 + (node.risk * 0.2);
            const mid = (branchCount - 1) / 2;
            const zRotation = (index - mid) * angleSpread;
            const branchLength = length * 0.78;
            const branchRadius = radius * 0.72;

            return (
              <group
                key={subtask.id}
                rotation={[0, 0, zRotation]}
              >
                <Branch
                  node={subtask}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                  length={branchLength}
                  radius={branchRadius}
                  onHover={onHover}
                  theme={theme}
                />
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
}

interface DataTreeProps {
  data: TaskNode;
  onHover: (data: HoveredData | null) => void;
  theme?: string;
}

export function DataTree({ data, onHover, theme }: DataTreeProps) {
  const maxDepth = Math.min(Math.max(data.complexity, 1), 4);
  return (
    <Branch
      node={data}
      depth={1}
      maxDepth={maxDepth}
      length={1.8}
      radius={0.24}
      onHover={onHover}
      theme={theme}
    />
  );
}
