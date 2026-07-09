import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { TaskNode, HoveredData } from './DataTree';

// ─── Shared Types ────────────────────────────────────────────────────

interface AssetProps {
  position: [number, number, number];
  node?: TaskNode;
  onHover?: (data: HoveredData | null) => void;
  onClick?: () => void;
}

// ─── Shared hover handler factory ────────────────────────────────────

function useHoverHandlers(
  onHover: ((data: HoveredData | null) => void) | undefined,
  node: TaskNode | undefined,
  setHovered: (v: boolean) => void
) {
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

  return { handlePointerOver, handlePointerOut, handlePointerMove };
}

// ─── 1. Billboard Rose Bush (Pull Request) ───────────────────────────

interface BillboardBushProps extends AssetProps {
  status: string;
}

export function BillboardRoseBush({ position, status, node, onHover, onClick }: BillboardBushProps) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const handlers = useHoverHandlers(onHover, node, setHovered);

  // Select sprite based on status
  const spritePath = useMemo(() => {
    const s = status.toLowerCase();
    if (s === 'approved' || s === 'completed') return '/sprites/rose_bush_approved.png';
    if (s === 'under review' || s === 'pending') return '/sprites/rose_bush_review.png';
    return '/sprites/rose_bush_draft.png';
  }, [status]);

  const texture = useTexture(spritePath);

  // Soft breathing animation
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    const scale = 1.0 + Math.sin(t * 1.5) * 0.015;
    groupRef.current.scale.set(scale, scale, scale);
  });

  return (
    <group ref={groupRef} position={position}>
      <Billboard
        follow
        lockX={false}
        lockY={false}
        lockZ={false}
      >
        <mesh
          onClick={onClick}
          onPointerOver={handlers.handlePointerOver}
          onPointerOut={handlers.handlePointerOut}
          onPointerMove={handlers.handlePointerMove}
          castShadow
        >
          <planeGeometry args={[1.0, 1.2]} />
          <meshStandardMaterial
            map={texture}
            transparent
            alphaTest={0.4}
            side={THREE.DoubleSide}
            roughness={0.8}
            emissive={hovered ? '#ffffff' : '#000000'}
            emissiveIntensity={hovered ? 0.15 : 0}
          />
        </mesh>
      </Billboard>
      {/* Shadow disc on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[0.4, 16]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

// ─── 2. Billboard Leafy Weed (Issue) ─────────────────────────────────

interface BillboardWeedProps extends AssetProps {
  status: string;
}

export function BillboardWeed({ position, status, node, onHover, onClick }: BillboardWeedProps) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const handlers = useHoverHandlers(onHover, node, setHovered);

  const spritePath = useMemo(() => {
    const s = status.toLowerCase();
    if (s === 'backlog') return '/sprites/weed_backlog.png';
    return '/sprites/weed_active.png';
  }, [status]);

  const texture = useTexture(spritePath);

  // Gentle swaying
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.rotation.z = Math.sin(t * 1.8) * 0.04;
  });

  return (
    <group ref={groupRef} position={position}>
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <mesh
          onClick={onClick}
          onPointerOver={handlers.handlePointerOver}
          onPointerOut={handlers.handlePointerOut}
          onPointerMove={handlers.handlePointerMove}
          castShadow
        >
          <planeGeometry args={[0.8, 0.9]} />
          <meshStandardMaterial
            map={texture}
            transparent
            alphaTest={0.4}
            side={THREE.DoubleSide}
            roughness={0.8}
            emissive={hovered ? '#ffffff' : '#000000'}
            emissiveIntensity={hovered ? 0.15 : 0}
          />
        </mesh>
      </Billboard>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[0.3, 16]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.12} />
      </mesh>
    </group>
  );
}

// ─── 3. Billboard Garden Gnome (AI Agent) ────────────────────────────

interface BillboardGnomeProps {
  position: [number, number, number];
  color: string; // '#2575fc' (blue), '#9b59b6' (purple), '#ec008c' (pink)
  name: string;
  role: string;
  onHover?: (data: HoveredData | null) => void;
  onClick?: () => void;
}

export function BillboardGnome({ position, color, name, role, onHover, onClick }: BillboardGnomeProps) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);

  // Map color prop to sprite
  const spritePath = useMemo(() => {
    if (color.includes('9b59b6') || color.toLowerCase().includes('purple')) return '/sprites/gnome_purple.png';
    if (color.includes('ec008c') || color.toLowerCase().includes('pink')) return '/sprites/gnome_pink.png';
    return '/sprites/gnome_blue.png';
  }, [color]);

  const texture = useTexture(spritePath);

  const gnomeNode: TaskNode = useMemo(() => ({
    id: `gnome-${name.toLowerCase().replace(/\s+/g, '-')}`,
    title: name,
    progress: 1.0,
    complexity: 0.5,
    risk: 0.1,
    description: role,
    elementType: 'Garden Gnome'
  }), [name, role]);

  const handlers = useHoverHandlers(onHover, gnomeNode, setHovered);

  // Soft breathing bob
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.position.y = position[1] + Math.sin(t * 1.5) * 0.012;
  });

  return (
    <group ref={groupRef} position={position}>
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <mesh
          onClick={onClick}
          onPointerOver={handlers.handlePointerOver}
          onPointerOut={handlers.handlePointerOut}
          onPointerMove={handlers.handlePointerMove}
          castShadow
        >
          <planeGeometry args={[0.7, 0.9]} />
          <meshStandardMaterial
            map={texture}
            transparent
            alphaTest={0.4}
            side={THREE.DoubleSide}
            roughness={0.8}
            emissive={hovered ? '#ffffff' : '#000000'}
            emissiveIntensity={hovered ? 0.2 : 0}
          />
        </mesh>
      </Billboard>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[0.25, 16]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

// ─── 4. Billboard Tree Foliage (for DataTree leaf nodes) ─────────────

interface BillboardFoliageProps {
  radius: number;
  progress: number;
  isHovered: boolean;
  theme?: string;
}

export function BillboardTreeFoliage({ radius, progress, isHovered }: BillboardFoliageProps) {
  const texture = useTexture('/sprites/tree_foliage.png');
  const foliageSize = radius * 5.0 * (progress + 0.5);

  return (
    <Billboard follow lockX={false} lockY={false} lockZ={false}>
      <mesh castShadow>
        <planeGeometry args={[foliageSize, foliageSize]} />
        <meshStandardMaterial
          map={texture}
          transparent
          alphaTest={0.35}
          side={THREE.DoubleSide}
          roughness={0.7}
          emissive={isHovered ? '#ffffff' : '#000000'}
          emissiveIntensity={isHovered ? 0.25 : progress * 0.08}
        />
      </mesh>
    </Billboard>
  );
}

// ─── 5. Billboard Crop Components ────────────────────────────────────

export function BillboardCorn({ position }: { position: [number, number, number] }) {
  const texture = useTexture('/sprites/corn_crop.png');
  return (
    <group position={position}>
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <mesh castShadow>
          <planeGeometry args={[0.5, 0.7]} />
          <meshStandardMaterial
            map={texture}
            transparent
            alphaTest={0.4}
            side={THREE.DoubleSide}
            roughness={0.8}
          />
        </mesh>
      </Billboard>
    </group>
  );
}

export function BillboardCabbage({ position }: { position: [number, number, number] }) {
  const texture = useTexture('/sprites/cabbage_crop.png');
  return (
    <group position={position}>
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <mesh castShadow>
          <planeGeometry args={[0.5, 0.45]} />
          <meshStandardMaterial
            map={texture}
            transparent
            alphaTest={0.4}
            side={THREE.DoubleSide}
            roughness={0.8}
          />
        </mesh>
      </Billboard>
    </group>
  );
}

export function BillboardCarrot({ position }: { position: [number, number, number] }) {
  const texture = useTexture('/sprites/carrot_crop.png');
  return (
    <group position={position}>
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <mesh castShadow>
          <planeGeometry args={[0.4, 0.5]} />
          <meshStandardMaterial
            map={texture}
            transparent
            alphaTest={0.4}
            side={THREE.DoubleSide}
            roughness={0.8}
          />
        </mesh>
      </Billboard>
    </group>
  );
}
