import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, SSAO } from '@react-three/postprocessing';
import * as THREE from 'three';
import { DataTree } from './DataTree';
import type { TaskNode, HoveredData } from './DataTree';
import {
  Well,
  RoseBush,
  SpikyWeed,
  GardenGnome,
  Fence,
  GrassTuft,
  Lantern,
  Chicken,
  WoodenBarrel,
  CropCrate,
  Wildflower,
  ChickenCoop,
  TallCornCrop,
  CabbageCrop,
  CarrotCrop,
  Sunbeams,
} from './ProceduralAssets';
import { WeatherSystem } from './WeatherSystem';

interface DataTreeGardenProps {
  graph: any;
  crr?: number;
  projectName?: string;
  uiVisible?: boolean;
  [key: string]: any;
}

// ─── HIGH-DENSITY TOON-SHADED INSTANCED GRASS (2,000 BLADES) ─────────
function InstancedGrass({ toonRamp }: { toonRamp: THREE.Texture }) {
  const count = 2000; // Step 2: 2,000 blades of grass
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Compute static positions and sway frequencies for each grass blade
  const [positions, rotations] = useMemo(() => {
    const posList: [number, number, number][] = [];
    const rotList: number[] = [];
    for (let i = 0; i < count; i++) {
      // Scatter grass blades over a 36x36 lawn
      let x = (Math.random() - 0.5) * 36;
      let z = (Math.random() - 0.5) * 36;

      // Keep them outside the central soil bed (which is 13.5x11.5)
      if (Math.abs(x) < 7.2 && Math.abs(z) < 6.2) {
        if (Math.random() > 0.5) {
          x += x > 0 ? 7.2 : -7.2;
        } else {
          z += z > 0 ? 6.2 : -6.2;
        }
      }
      posList.push([x, 0.02, z]);
      rotList.push((Math.random() - 0.5) * 0.4); // Random base tilt
    }
    return [posList, rotList];
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      const [x, y, z] = positions[i];
      const baseRot = rotations[i];

      // Wind sway wave ripple
      const sway = Math.sin(time * 1.9 + x * 0.45 + z * 0.25) * 0.095;

      dummy.position.set(x, y, z);
      dummy.rotation.set(baseRot + sway, baseRot * 0.4, baseRot);
      
      // Dynamic height variance for lush organic presence (Step 2)
      const scaleY = 1.05 + Math.sin(i * 45) * 0.35;
      dummy.scale.set(0.9, scaleY, 0.9);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null as any, null as any, count]} castShadow receiveShadow>
      <coneGeometry args={[0.02, 0.38, 3]} /> {/* Thin cone blade pointing upward (Step 2) */}
      <meshToonMaterial color="#7cd936" gradientMap={toonRamp} /> {/* Step 2: Vibrant lime green #7cd936 */}
    </instancedMesh>
  );
}

// ─── MAIN DIGITAL TWIN GARDEN VIEWPORT ───────────────────────────────
export function DataTreeGarden({
  graph,
  crr,
  projectName,
  uiVisible = true,
}: DataTreeGardenProps) {
  const [hoveredInfo, setHoveredInfo] = useState<HoveredData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentCrr = crr ?? 1.25;

  // 1. Determine Project Theme Profile (Step 4)
  const theme = useMemo(() => {
    const name = (projectName || '').toLowerCase();
    if (name.includes('alpha')) return 'alpha';
    if (name.includes('beta')) return 'beta';
    if (name.includes('gamma')) return 'gamma';
    return 'default';
  }, [projectName]);

  // Weather is rainy if CRR is warning (< 1.0) OR if we are in stormy Project Gamma!
  const isRainy = currentCrr < 1.0 || theme === 'gamma';

  // Theme-aware Environment Profiles (Step 4)
  const skyBackground = useMemo(() => {
    if (theme === 'alpha') return 'linear-gradient(to top, #e74c3c, #feb47b)'; // Deep sunset
    if (theme === 'beta') return 'linear-gradient(to top, #fbc2eb, #a1c4fd)'; // Pink sunrise
    if (theme === 'gamma') return 'linear-gradient(to top, #5c6b73, #2f4f4f)'; // Overcast stormy grey
    return 'linear-gradient(to top, #fff3d1, #a1c4fd)'; // Soft spring daylight
  }, [theme]);

  const lightColor = useMemo(() => {
    if (theme === 'alpha') return '#ffd8b8'; // Sunset gold
    if (theme === 'beta') return '#ffe5e5'; // Rosy pink
    if (theme === 'gamma') return '#a0b0b8'; // Cold slate grey
    return '#fff3d1'; // Warm golden daylight
  }, [theme]);

  const fogColor = useMemo(() => {
    if (theme === 'alpha') return '#e06c55';
    if (theme === 'beta') return '#ebd8e6';
    if (theme === 'gamma') return '#4a5759';
    return '#fdfbf7';
  }, [theme]);

  const fogDensity = isRainy ? 0.024 : 0.012;

  // Base grass color shifts from lush deep green to dry straw based on CRR health
  const grassColor = useMemo(() => {
    const lush = new THREE.Color('#223a1a'); // Deep muted green
    const dry = new THREE.Color('#615233');
    const factor = Math.min(Math.max((currentCrr - 0.7) / 0.8, 0), 1);
    return dry.lerp(lush, factor).getStyle();
  }, [currentCrr]);

  // 2. Procedural Cel-Shading Toon Ramp Texture (Stepped gradients)
  const toonRampTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#555555'; ctx.fillRect(0, 0, 1, 1);
    ctx.fillStyle = '#888888'; ctx.fillRect(1, 0, 1, 1);
    ctx.fillStyle = '#bbbbbb'; ctx.fillRect(2, 0, 1, 1);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(3, 0, 1, 1);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    return texture;
  }, []);

  // 3. Procedural Hand-Painted Tiled Grass Texture
  const grassTiledTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#223a1a';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 250; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.fillStyle = Math.random() > 0.5 ? '#2c4a22' : '#1a2e14';
      ctx.fillRect(x, y, 2 + Math.random() * 2, 2 + Math.random() * 2);
    }

    ctx.fillStyle = '#2c4f24';
    for (let i = 0; i < 30; i++) {
      const cx = Math.random() * 256;
      const cy = Math.random() * 256;
      ctx.beginPath();
      ctx.arc(cx - 2, cy, 3, 0, Math.PI * 2);
      ctx.arc(cx + 2, cy, 3, 0, Math.PI * 2);
      ctx.arc(cx, cy - 3, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 10);
    return texture;
  }, []);

  // 4. Procedural Hand-Painted Soil Texture
  const soilTiledTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Wet soil base for stormy Gamma, dry base for others
    ctx.fillStyle = theme === 'gamma' ? '#18110a' : '#2c1d11';
    ctx.fillRect(0, 0, 128, 128);

    for (let i = 0; i < 150; i++) {
      const x = Math.random() * 128;
      const y = Math.random() * 128;
      ctx.fillStyle = '#1b120a';
      ctx.fillRect(x, y, 2, 2);
    }

    for (let i = 0; i < 10; i++) {
      const x = Math.random() * 128;
      const y = Math.random() * 128;
      ctx.fillStyle = '#6e7a8a';
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 5);
    return texture;
  }, [theme]);

  // Static tufts scatter
  const grassTufts = useMemo(() => {
    const tufts: [number, number, number][] = [];
    for (let i = 0; i < 90; i++) {
      let x = (Math.random() - 0.5) * 28;
      let z = (Math.random() - 0.5) * 28;
      if (Math.abs(x) < 7.0 && Math.abs(z) < 6.0) {
        x += x > 0 ? 7.0 : -7.0;
        z += z > 0 ? 6.0 : -6.0;
      }
      tufts.push([x, 0.01, z]);
    }
    return tufts;
  }, []);

  // Generate static coordinates for 40 wildflowers scattered in the grass
  const wildflowers = useMemo(() => {
    const flowers: { pos: [number, number, number]; color: string }[] = [];
    const colors = ['#ffffff', '#e74c3c', '#f1c40f', '#9b59b6'];
    for (let i = 0; i < 40; i++) {
      let x = (Math.random() - 0.5) * 26;
      let z = (Math.random() - 0.5) * 26;
      if (Math.abs(x) < 7.0 && Math.abs(z) < 6.0) {
        x += x > 0 ? 7.0 : -7.0;
        z += z > 0 ? 6.0 : -6.0;
      }
      flowers.push({
        pos: [x, 0.015, z],
        color: colors[i % colors.length],
      });
    }
    return flowers;
  }, []);

  // Extract PR and Issue nodes from flat graph
  const gardenElements = useMemo(() => {
    if (!graph || !graph.nodes) return { prs: [], issues: [], epicPRs: null, epicIssues: null };

    const prs: any[] = [];
    const issues: any[] = [];

    // Helper to map flat nodes to coordinates (within central raised soil bed)
    const getPlotPosition = (index: number, total: number, offsetSide: 'left' | 'right') => {
      const count = total || 1;
      const angle = (index / count) * Math.PI * 1.5;
      const radius = 2.0 + Math.sin(index * 2) * 0.8;
      
      const xSign = offsetSide === 'left' ? -1 : 1;
      const x = xSign * (radius * Math.cos(angle) + 2.5);
      const z = radius * Math.sin(angle) * 0.9;
      return [x, 0.01, z] as [number, number, number];
    };

    // Find Root/Epic tasks
    const epicPRNode = graph.nodes.find((n: any) => n.type === 'PR' && n.category === 'epic');
    const epicIssueNode = graph.nodes.find((n: any) => n.type === 'Issue' && n.category === 'epic');

    // Filter child nodes
    const prNodes = graph.nodes.filter((n: any) => n.type === 'PR' && n.category !== 'epic');
    const issueNodes = graph.nodes.filter((n: any) => n.type === 'Issue' && n.category !== 'epic');

    prNodes.forEach((node: any, idx: number) => {
      prs.push({
        position: getPlotPosition(idx, prNodes.length, 'left'),
        status: node.status,
        node: {
          id: node.id,
          title: node.label,
          progress: node.metrics.completion,
          complexity: node.metrics.complexity,
          risk: node.metrics.risk
        }
      });
    });

    issueNodes.forEach((node: any, idx: number) => {
      issues.push({
        position: getPlotPosition(idx, issueNodes.length, 'right'),
        status: node.status,
        node: {
          id: node.id,
          title: node.label,
          progress: node.metrics.completion,
          complexity: node.metrics.complexity,
          risk: node.metrics.risk
        }
      });
    });

    // Create default Virtual Epic if missing (ensures L-system Trees render)
    const epicPRs: TaskNode = epicPRNode ? {
      id: epicPRNode.id,
      title: epicPRNode.label,
      progress: epicPRNode.metrics.completion,
      complexity: epicPRNode.metrics.complexity,
      risk: epicPRNode.metrics.risk,
      subtasks: prs.map(p => p.node)
    } : {
      id: 'epic-pr-virtual',
      title: 'Pull Requests Root',
      progress: 0.85,
      complexity: 0.9,
      risk: 0.1,
      subtasks: prs.map(p => p.node)
    };

    const epicIssues: TaskNode = epicIssueNode ? {
      id: epicIssueNode.id,
      title: epicIssueNode.label,
      progress: epicIssueNode.metrics.completion,
      complexity: epicIssueNode.metrics.complexity,
      risk: epicIssueNode.metrics.risk,
      subtasks: issues.map(i => i.node)
    } : {
      id: 'epic-issue-virtual',
      title: 'Active Issues Root',
      progress: 0.35,
      complexity: 0.7,
      risk: 0.65,
      subtasks: issues.map(i => i.node)
    };

    return { prs, issues, epicPRs, epicIssues };
  }, [graph]);

  const handleCanvasClick = () => {
    if (hoveredInfo) setHoveredInfo(null);
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: skyBackground,
        overflow: 'hidden',
      }}
    >
      <Canvas
        camera={{ position: [0, 8, 12], fov: 45 }}
        shadows // Step 3: Enable shadows on Canvas
        gl={{
          antialias: true,
          alpha: false, // Step 3: Fast and rich rendering
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
        onClick={handleCanvasClick}
      >
        {/* Atmospheric Volumetric Fog */}
        <fogExp2 attach="fog" args={[fogColor, fogDensity]} />

        {/* Lighting setup based on instruction.md */}
        <hemisphereLight color="#a1c4fd" groundColor="#223a1a" intensity={0.95} />

        {/* Step 3: Explicit shadow bounds & map size */}
        <directionalLight
          position={[15, 20, 10]}
          intensity={2.8}
          castShadow // Step 3: Enable directional light shadow mapping
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={50}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
          shadow-bias={-0.0001}
          color={lightColor}
        />

        {/* Secondary soft point fill light */}
        <pointLight position={[-8, 6, -8]} intensity={0.5} color="#fffdf0" />

        {/* 1. Volumetric God Ray Sunbeams (Step 5) - Rendered for sunny weather only */}
        {theme !== 'gamma' && <Sunbeams />}

        {/* 2. Central Core Well representing CRR */}
        <Well position={[0, 0, 0]} crr={currentCrr} projectName={projectName} onHover={setHoveredInfo} />

        {/* 3. Procedural Epic DataTrees (left and right) with theme styling */}
        {gardenElements.epicPRs && (
          <group position={[-3.6, 0, -1.8]}>
            <DataTree data={gardenElements.epicPRs} onHover={setHoveredInfo} theme={theme} />
          </group>
        )}
        {gardenElements.epicIssues && (
          <group position={[3.6, 0, -1.8]}>
            <DataTree data={gardenElements.epicIssues} onHover={setHoveredInfo} theme={theme} />
          </group>
        )}

        {/* 4. Pull Request Bushes */}
        {gardenElements.prs.map((p, idx) => (
          <RoseBush
            key={`pr-${idx}`}
            position={p.position}
            status={p.status}
            node={p.node}
            onHover={setHoveredInfo}
          />
        ))}

        {/* 5. Issue Weeds */}
        {gardenElements.issues.map((i, idx) => (
          <SpikyWeed
            key={`issue-${idx}`}
            position={i.position}
            status={i.status}
            node={i.node}
            onHover={setHoveredInfo}
          />
        ))}

        {/* 6. Cozy Garden Gnomes (AI Agents) */}
        <GardenGnome
          color="#2575fc"
          position={[-1.4, 0.01, -1.8]}
          name="Worker Agent Gnome"
          role="Executes tasks, generates branches, refactors code, and runs system tests."
          onHover={setHoveredInfo}
        />
        <GardenGnome
          color="#9b59b6"
          position={[1.4, 0.01, -1.8]}
          name="Critic Agent Gnome"
          role="Reviews pull requests, checks styling, runs linters, and rates visual fidelity."
          onHover={setHoveredInfo}
        />
        <GardenGnome
          color="#ec008c"
          position={[0.0, 0.01, 1.8]}
          name="Opponent Agent Gnome"
          role="Simulates system failures, breaks parameters, and tests resilience of the garden."
          onHover={setHoveredInfo}
        />

        {/* 7. Picket Fences Borders (crooked hand-built look) */}
        <Fence position={[-4.5, 0, -6.5]} />
        <Fence position={[-3, 0, -6.5]} />
        <Fence position={[-1.5, 0, -6.5]} />
        <Fence position={[0, 0, -6.5]} />
        <Fence position={[1.5, 0, -6.5]} />
        <Fence position={[3, 0, -6.5]} />
        <Fence position={[4.5, 0, -6.5]} />
        <Fence position={[-4.5, 0, 6.5]} />
        <Fence position={[-3, 0, 6.5]} />
        <Fence position={[-1.5, 0, 6.5]} />
        <Fence position={[0, 0, 6.5]} />
        <Fence position={[1.5, 0, 6.5]} />
        <Fence position={[3, 0, 6.5]} />
        <Fence position={[4.5, 0, 6.5]} />

        {/* Fence Corner Glow Lanterns */}
        <Lantern position={[-4.5, 0, -6.4]} />
        <Lantern position={[4.5, 0, -6.4]} />
        <Lantern position={[-4.5, 0, 6.4]} />
        <Lantern position={[4.5, 0, 6.4]} />

        {/* 8. Flat Stepping Stones (Paths) */}
        <mesh position={[-1.0, 0.01, -0.65]} rotation={[-Math.PI / 2, 0, 0.4]}>
          <cylinderGeometry args={[0.22, 0.22, 0.02, 8]} />
          <meshStandardMaterial color="#948c82" roughness={0.9} />
        </mesh>
        <mesh position={[-2.0, 0.01, -1.3]} rotation={[-Math.PI / 2, 0, 0.4]}>
          <cylinderGeometry args={[0.24, 0.24, 0.02, 8]} />
          <meshStandardMaterial color="#948c82" roughness={0.9} />
        </mesh>
        <mesh position={[1.0, 0.01, -0.65]} rotation={[-Math.PI / 2, 0, -0.4]}>
          <cylinderGeometry args={[0.22, 0.22, 0.02, 8]} />
          <meshStandardMaterial color="#948c82" roughness={0.9} />
        </mesh>
        <mesh position={[2.0, 0.01, -1.3]} rotation={[-Math.PI / 2, 0, -0.4]}>
          <cylinderGeometry args={[0.24, 0.24, 0.02, 8]} />
          <meshStandardMaterial color="#948c82" roughness={0.9} />
        </mesh>

        {/* 9. Weather Effects System */}
        <WeatherSystem isRainy={isRainy} />

        {/* Hay Day Clutter & Accessories */}
        <WoodenBarrel position={[-1.1, 0, -1.0]} />
        <WoodenBarrel position={[1.1, 0, -1.0]} />
        <CropCrate position={[-1.2, 0, 0.8]} />
        <CropCrate position={[1.2, 0, 0.8]} />

        {/* Chicken Coop Cozy Centerpiece */}
        <ChickenCoop position={[4.0, 0, 3.0]} />

        {/* Animated Pecking Chickens */}
        <Chicken position={[-1.8, 0.01, 1.5]} speed={0.95} phase={0} />
        <Chicken position={[1.5, 0.01, 2.8]} speed={0.8} phase={2.5} />
        <Chicken position={[-2.4, 0.01, -3.2]} speed={1.1} phase={4.8} />

        {/* 10. Scattered Project Crops (Step 4 & 5) */}
        {theme === 'alpha' && (
          <>
            {/* Project Alpha: Tall Corn Rows and Pumpkin Crates */}
            <TallCornCrop position={[-3.2, 0.01, 3.2]} />
            <TallCornCrop position={[-2.2, 0.01, 3.2]} />
            <TallCornCrop position={[-1.2, 0.01, 3.2]} />
            <TallCornCrop position={[-3.2, 0.01, 4.4]} />
            <TallCornCrop position={[-2.2, 0.01, 4.4]} />
            <TallCornCrop position={[-1.2, 0.01, 4.4]} />
            <CropCrate position={[2.5, 0.01, 2.5]} />
            <CropCrate position={[1.0, 0.01, 3.5]} />
          </>
        )}

        {theme === 'beta' && (
          <>
            {/* Project Beta: Orange Carrot Rows */}
            <CarrotCrop position={[-3.5, 0.01, 2.8]} />
            <CarrotCrop position={[-2.5, 0.01, 2.8]} />
            <CarrotCrop position={[-1.5, 0.01, 2.8]} />
            <CarrotCrop position={[-3.5, 0.01, 3.8]} />
            <CarrotCrop position={[-2.5, 0.01, 3.8]} />
            <CarrotCrop position={[-1.5, 0.01, 3.8]} />
            <CarrotCrop position={[-3.5, 0.01, 4.8]} />
            <CarrotCrop position={[-2.5, 0.01, 4.8]} />
            <CarrotCrop position={[-1.5, 0.01, 4.8]} />
          </>
        )}

        {theme === 'gamma' && (
          <>
            {/* Project Gamma: Leafy Cabbages and Wild Spiky weeds (bug representation) */}
            <CabbageCrop position={[-3.5, 0.01, 3.2]} />
            <CabbageCrop position={[-2.0, 0.01, 3.2]} />
            <CabbageCrop position={[-0.5, 0.01, 3.2]} />
            <CabbageCrop position={[-3.5, 0.01, 4.4]} />
            <CabbageCrop position={[-2.0, 0.01, 4.4]} />
            <CabbageCrop position={[-0.5, 0.01, 4.4]} />
            <SpikyWeed position={[2.5, 0.01, 2.5]} status="active" />
            <SpikyWeed position={[1.0, 0.01, 3.5]} status="active" />
          </>
        )}

        {theme === 'default' && (
          <>
            {/* Default/Live: Mixed Crop Patch */}
            <CarrotCrop position={[-3.5, 0.01, 3.0]} />
            <CarrotCrop position={[-2.5, 0.01, 3.0]} />
            <CabbageCrop position={[-3.5, 0.01, 4.2]} />
            <CabbageCrop position={[-2.0, 0.01, 4.2]} />
            <TallCornCrop position={[1.8, 0.01, 3.0]} />
            <CropCrate position={[2.2, 0.01, 4.2]} />
          </>
        )}

        {/* Scattered Colorful Wildflowers */}
        {wildflowers.map((w, idx) => (
          <Wildflower key={`flower-${idx}`} position={w.pos} color={w.color} />
        ))}

        {/* Grass Blade Tufts scattered randomly */}
        {grassTufts.map((pos, idx) => (
          <GrassTuft key={`tuft-${idx}`} position={pos} />
        ))}

        {/* Instanced Grass scatter (2,000 blades) (Step 2) */}
        <InstancedGrass toonRamp={toonRampTexture} />

        {/* Central Raised Soil Bed (Dark, organic earth brown with soil texture) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
          <planeGeometry args={[13.5, 11.5]} />
          <meshStandardMaterial map={soilTiledTexture} roughness={1.0} />
        </mesh>

        {/* Surrounding Outer Grass Terrain Base Plane (Deep muted green with tiled grass texture) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[45, 45]} />
          <meshStandardMaterial map={grassTiledTexture} color={grassColor} roughness={1.0} />
        </mesh>

        {/* Soft Shadow Layer */}
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.35}
          scale={16}
          blur={1.6}
          far={4.5}
        />

        {/* Post-Processing Composer (bloom + Screen Space Ambient Occlusion shadows) */}
        <EffectComposer>
          <SSAO samples={11} radius={0.35} intensity={14} luminanceInfluence={0.5} />
          <Bloom luminanceThreshold={0.28} intensity={0.95} />
        </EffectComposer>

        {/* Camera Interactive Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={3}
          maxDistance={24}
        />
      </Canvas>

      {/* Floating Hover Details Card Overlay */}
      {hoveredInfo && uiVisible && (
        <div
          className="glass-card item-hover-card"
          style={{
            position: 'absolute',
            left: hoveredInfo.x + 15,
            top: hoveredInfo.y + 15,
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          <div className="hover-header">
            <h4>{hoveredInfo.node.title}</h4>
            {hoveredInfo.node.id !== 'well-core' &&
              !hoveredInfo.node.id.startsWith('gnome-') && (
                <span className="node-id-tag">{hoveredInfo.node.id}</span>
              )}
          </div>
          <div className="hover-body">
            {hoveredInfo.node.description ? (
              <p className="hover-desc">{hoveredInfo.node.description}</p>
            ) : (
              <div className="hover-metrics">
                <div className="metric-row">
                  <span>Progress:</span>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${hoveredInfo.node.progress * 100}%` }}
                    ></div>
                  </div>
                  <span className="metric-pct">
                    {Math.round(hoveredInfo.node.progress * 100)}%
                  </span>
                </div>
                <div className="metric-row">
                  <span>Complexity:</span>
                  <span className="metric-badge complexity-badge">
                    {hoveredInfo.node.complexity.toFixed(2)}
                  </span>
                </div>
                <div className="metric-row">
                  <span>Risk Factor:</span>
                  <span
                    className={`metric-badge risk-badge ${
                      hoveredInfo.node.risk > 0.5 ? 'risk-high' : 'risk-low'
                    }`}
                  >
                    {hoveredInfo.node.risk.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
