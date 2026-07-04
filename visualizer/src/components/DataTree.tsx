import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
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

interface GLTFTreeProps {
  node: TaskNode;
  theme?: string;
  onHover: (data: HoveredData | null) => void;
}

// ─── STYLIZED GLTF TREE (Quaternius Nature Kit) ──────────────────────
export function GLTFTree({ node, theme, onHover }: GLTFTreeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Map project themes to Quaternius tree assets
  const modelPath = useMemo(() => {
    if (theme === 'alpha') {
      return '/models/Stylized Nature MegaKit[Standard]/glTF/CommonTree_1.gltf';
    }
    if (theme === 'beta') {
      return '/models/Stylized Nature MegaKit[Standard]/glTF/CommonTree_2.gltf';
    }
    if (theme === 'gamma') {
      return '/models/Stylized Nature MegaKit[Standard]/glTF/Pine_1.gltf';
    }
    return '/models/Stylized Nature MegaKit[Standard]/glTF/TwistedTree_1.gltf';
  }, [theme]);

  const { scene } = useGLTF(modelPath);
  const clonedScene = useMemo(() => {
    const clone = scene.clone();

    // Traverse and customize leaves/materials for styling
    clone.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        // Custom tint pink cherry blossoms for Project Beta
        if (theme === 'beta' && child.name.toLowerCase().includes('leaves')) {
          child.material = child.material.clone();
          child.material.color.set('#fbc2eb');
        }
      }
    });

    return clone;
  }, [scene, theme]);

  // Wind sway logic
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    // High risk projects sway and tilt more gnarledly
    const sway = Math.sin(t * 1.5) * (node.risk * 0.02 + 0.008);
    groupRef.current.rotation.z = sway;
    groupRef.current.rotation.x = sway * 0.4;
  });

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    setIsHovered(true);
    onHover({ node, x: e.clientX, y: e.clientY });
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    document.body.style.cursor = 'default';
    setIsHovered(false);
    onHover(null);
  };

  const handlePointerMove = (e: any) => {
    e.stopPropagation();
    onHover({ node, x: e.clientX, y: e.clientY });
  };

  // Grow scale with epic task progress completion
  const treeScale = node.progress * 1.4 + 0.7;

  return (
    <group
      ref={groupRef}
      scale={[treeScale, treeScale, treeScale]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerMove={handlePointerMove}
    >
      <primitive object={clonedScene} />

      {/* Subtle selection hover outline/glow */}
      {isHovered && (
        <mesh position={[0, 1.8, 0]}>
          <cylinderGeometry args={[1.5, 1.5, 3.8, 8, 1, true]} />
          <meshBasicMaterial color="#39ff14" transparent opacity={0.12} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}



// ─── TREE EXPORT (Main Render entry point) ──────────────────────────
interface DataTreeProps {
  data: TaskNode;
  onHover: (data: HoveredData | null) => void;
  theme?: string;
}

export function DataTree({ data, onHover, theme }: DataTreeProps) {
  // Use Quaternius low-poly game models for trees
  return <GLTFTree node={data} theme={theme} onHover={onHover} />;
}

// Preload assets
useGLTF.preload('/models/Stylized Nature MegaKit[Standard]/glTF/CommonTree_1.gltf');
useGLTF.preload('/models/Stylized Nature MegaKit[Standard]/glTF/CommonTree_2.gltf');
useGLTF.preload('/models/Stylized Nature MegaKit[Standard]/glTF/Pine_1.gltf');
useGLTF.preload('/models/Stylized Nature MegaKit[Standard]/glTF/TwistedTree_1.gltf');
