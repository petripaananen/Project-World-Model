import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
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
  WoodenBarrel,
  CropCrate,
  Wildflower,
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
  const [showLegend, setShowLegend] = useState(false);
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

  // Generate static coordinates for 80 wildflowers scattered in the grass
  const wildflowers = useMemo(() => {
    const flowers: { pos: [number, number, number]; color: string; scale: number }[] = [];
    const colors = [
      '#e74c3c', '#9b59b6', '#f1c40f', '#e67e22', 
      '#e84393', '#ffffff', '#fd79a8', '#00cec9',
      '#9c88ff', '#fbc531', '#4cd137', '#487eb0'
    ];
    for (let i = 0; i < 80; i++) {
      const angle = (i / 80) * Math.PI * 2 + Math.sin(i * 2.5) * 0.3;
      const radius = 6.8 + Math.cos(i * 1.7) * 4.0;
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      const scale = 3.5 + Math.sin(i) * 1.5; // ranges from 2.0 to 5.0
      flowers.push({
        pos: [x, 0.015, z],
        color: colors[i % colors.length],
        scale,
      });
    }
    return flowers;
  }, []);

  // Extract PR and Issue nodes from flat graph
  const gardenElements = useMemo(() => {
    if (!graph || !graph.nodes) return { prs: [], issues: [], epicPRs: null, epicIssues: null };

    const prs: any[] = [];
    const issues: any[] = [];

    // 1. Define Static Exclusion Zones (well, trees, gnomes, crates, barrels)
    const exclusions: { x: number; z: number; r: number }[] = [
      { x: 0, z: 0, r: 1.6 },      // Central Well
      { x: -1.4, z: -1.8, r: 0.9 }, // Gnome 1
      { x: 1.4, z: -1.8, r: 0.9 },  // Gnome 2
      { x: 0.0, z: 1.8, r: 0.9 },   // Gnome 3
      { x: -1.1, z: -1.0, r: 0.7 }, // Barrel 1
      { x: 1.1, z: -1.0, r: 0.7 },  // Barrel 2
      { x: -1.2, z: 0.8, r: 0.7 },  // Crate 1
      { x: 1.2, z: 0.8, r: 0.7 },   // Crate 2
      { x: -3.6, z: -1.8, r: 1.4 }, // Tree Left (Epic)
      { x: 3.6, z: -1.8, r: 1.4 },  // Tree Right (Epic)
    ];

    // Theme-specific crop exclusions
    const themeName = (projectName || '').toLowerCase();
    if (themeName.includes('alpha')) {
      exclusions.push(
        { x: -3.2, z: 3.2, r: 0.6 }, { x: -2.2, z: 3.2, r: 0.6 }, { x: -1.2, z: 3.2, r: 0.6 },
        { x: -3.2, z: 4.4, r: 0.6 }, { x: -2.2, z: 4.4, r: 0.6 }, { x: -1.2, z: 4.4, r: 0.6 },
        { x: 2.5, z: 2.5, r: 0.7 }, { x: 1.0, z: 3.5, r: 0.7 }
      );
    } else if (themeName.includes('beta')) {
      exclusions.push(
        { x: -3.5, z: 2.8, r: 0.5 }, { x: -2.5, z: 2.8, r: 0.5 }, { x: -1.5, z: 2.8, r: 0.5 },
        { x: -3.5, z: 3.8, r: 0.5 }, { x: -2.5, z: 3.8, r: 0.5 }, { x: -1.5, z: 3.8, r: 0.5 },
        { x: -3.5, z: 4.8, r: 0.5 }, { x: -2.5, z: 4.8, r: 0.5 }, { x: -1.5, z: 4.8, r: 0.5 }
      );
    } else if (themeName.includes('gamma')) {
      exclusions.push(
        { x: -3.5, z: 3.2, r: 0.5 }, { x: -2.0, z: 3.2, r: 0.5 }, { x: -0.5, z: 3.2, r: 0.5 },
        { x: -3.5, z: 4.4, r: 0.5 }, { x: -2.0, z: 4.4, r: 0.5 }, { x: -0.5, z: 4.4, r: 0.5 },
        { x: 2.5, z: 2.5, r: 0.65 }, { x: 1.0, z: 3.5, r: 0.65 }
      );
    } else {
      exclusions.push(
        { x: -3.5, z: 3.0, r: 0.5 }, { x: -2.5, z: 3.0, r: 0.5 },
        { x: -3.5, z: 4.2, r: 0.5 }, { x: -2.0, z: 4.2, r: 0.5 },
        { x: 1.8, z: 3.0, r: 0.5 }, { x: 2.2, z: 4.2, r: 0.7 }
      );
    }

    const placedItems: { x: number; z: number; r: number }[] = [];

    const getCollisionFreePosition = (
      proposedX: number,
      proposedZ: number,
      placed: { x: number; z: number; r: number }[],
      excs: { x: number; z: number; r: number }[]
    ): [number, number, number] => {
      let x = proposedX;
      let z = proposedZ;
      const radius = 0.65; // Collision radius of the bush/weed
      
      let angle = 0;
      const step = 0.25;
      const maxAttempts = 100;
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        let collides = false;
        
        // Exclusions check
        for (const esc of excs) {
          const dist = Math.hypot(x - esc.x, z - esc.z);
          if (dist < (radius + esc.r)) {
            collides = true;
            break;
          }
        }
        
        // Placed check
        if (!collides) {
          for (const item of placed) {
            const dist = Math.hypot(x - item.x, z - item.z);
            if (dist < (radius + item.r)) {
              collides = true;
              break;
            }
          }
        }
        
        // Boundary check (keep inside fence)
        if (!collides) {
          if (x < -6.0 || x > 6.0 || z < -5.0 || z > 5.0) {
            collides = true;
          }
        }
        
        if (!collides) {
          return [x, 0.01, z];
        }
        
        angle += 0.5;
        const r = step * Math.sqrt(attempt + 1);
        x = proposedX + r * Math.cos(angle);
        z = proposedZ + r * Math.sin(angle);
      }
      
      return [proposedX, 0.01, proposedZ];
    };

    // Helper to map flat nodes to coordinates (within central raised soil bed)
    const getPlotPosition = (index: number, total: number, offsetSide: 'left' | 'right') => {
      const count = total || 1;
      const angle = (index / count) * Math.PI * 1.5;
      const radius = 2.0 + Math.sin(index * 2) * 0.8;
      
      const xSign = offsetSide === 'left' ? -1 : 1;
      const xProposed = xSign * (radius * Math.cos(angle) + 2.5);
      const zProposed = radius * Math.sin(angle) * 0.9;
      
      const [finalX, finalY, finalZ] = getCollisionFreePosition(xProposed, zProposed, placedItems, exclusions);
      placedItems.push({ x: finalX, z: finalZ, r: 0.65 });
      return [finalX, finalY, finalZ] as [number, number, number];
    };

    // Find Root/Epic tasks
    const epicPRNode = graph.nodes.find((n: any) => n.type.toLowerCase() === 'pr' && n.category === 'epic');
    const epicIssueNode = graph.nodes.find((n: any) => n.type.toLowerCase() === 'issue' && n.category === 'epic');

    // Filter child nodes
    const prNodes = graph.nodes.filter((n: any) => n.type.toLowerCase() === 'pr' && n.category !== 'epic');
    const issueNodes = graph.nodes.filter((n: any) => n.type.toLowerCase() === 'issue' && n.category !== 'epic');

    prNodes.forEach((node: any, idx: number) => {
      prs.push({
        position: getPlotPosition(idx, prNodes.length, 'left'),
        status: node.attributes?.status || 'Draft',
        node: {
          id: node.id,
          title: node.name,
          progress: node.attributes?.completion ?? 0.5,
          complexity: node.attributes?.complexity ?? 2,
          risk: node.attributes?.riskProbability ?? 0.2,
          elementType: 'Rose Bush'
        }
      });
    });

    issueNodes.forEach((node: any, idx: number) => {
      issues.push({
        position: getPlotPosition(idx, issueNodes.length, 'right'),
        status: node.attributes?.status || 'Active',
        node: {
          id: node.id,
          title: node.name,
          progress: node.attributes?.completion ?? 0.3,
          complexity: node.attributes?.complexity ?? 2,
          risk: node.attributes?.riskProbability ?? 0.4,
          elementType: 'Leafy Weed'
        }
      });
    });

    // Create default Virtual Epic if missing (ensures L-system Trees render)
    const epicPRs: TaskNode = epicPRNode ? {
      id: epicPRNode.id,
      title: epicPRNode.attributes?.title || epicPRNode.name,
      progress: epicPRNode.attributes?.completion ?? 0.85,
      complexity: epicPRNode.attributes?.complexity ?? 3,
      risk: epicPRNode.attributes?.riskProbability ?? 0.1,
      elementType: 'Epic Tree',
      subtasks: prs.map(p => p.node)
    } : {
      id: 'epic-pr-virtual',
      title: 'Pull Requests Root',
      progress: 0.85,
      complexity: 0.9,
      risk: 0.1,
      elementType: 'Epic Tree',
      subtasks: prs.map(p => p.node)
    };

    const epicIssues: TaskNode = epicIssueNode ? {
      id: epicIssueNode.id,
      title: epicIssueNode.attributes?.title || epicIssueNode.name,
      progress: epicIssueNode.attributes?.completion ?? 0.35,
      complexity: epicIssueNode.attributes?.complexity ?? 3,
      risk: epicIssueNode.attributes?.riskProbability ?? 0.65,
      elementType: 'Epic Tree',
      subtasks: issues.map(i => i.node)
    } : {
      id: 'epic-issue-virtual',
      title: 'Active Issues Root',
      progress: 0.35,
      complexity: 0.7,
      risk: 0.65,
      elementType: 'Epic Tree',
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
        <mesh position={[-1.0, 0.015, -0.65]} rotation={[0.1, 0.5, 0.2]} scale={[0.26, 0.02, 0.22]} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#888075" roughness={0.9} />
        </mesh>
        <mesh position={[-2.0, 0.015, -1.3]} rotation={[0.05, -0.4, 0.1]} scale={[0.28, 0.02, 0.25]} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#888075" roughness={0.9} />
        </mesh>
        <mesh position={[1.0, 0.015, -0.65]} rotation={[0.1, -0.5, -0.2]} scale={[0.26, 0.02, 0.22]} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#888075" roughness={0.9} />
        </mesh>
        <mesh position={[2.0, 0.015, -1.3]} rotation={[0.05, 0.4, -0.1]} scale={[0.28, 0.02, 0.25]} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#888075" roughness={0.9} />
        </mesh>

        {/* 9. Weather Effects System */}
        <WeatherSystem isRainy={isRainy} />

        {/* Hay Day Clutter & Accessories */}
        <WoodenBarrel position={[-1.1, 0, -1.0]} />
        <WoodenBarrel position={[1.1, 0, -1.0]} />
        <CropCrate position={[-1.2, 0, 0.8]} />
        <CropCrate position={[1.2, 0, 0.8]} />



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
          <Wildflower key={`flower-${idx}`} position={w.pos} color={w.color} scale={w.scale} />
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

        {/* Post-Processing Composer (bloom glow) */}
        <EffectComposer>
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
            background: 'rgba(23, 28, 41, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '10px',
            padding: '12px 14px',
            color: '#fff',
            minWidth: '220px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            textAlign: 'left',
          }}
        >
          {/* Garden Element Type Tag */}
          <div
            style={{
              color: hoveredInfo.node.elementType === 'Leafy Weed' ? '#ff4d4d' :
                     hoveredInfo.node.elementType === 'Rose Bush' ? '#2ecc71' :
                     hoveredInfo.node.elementType === 'Epic Tree' ? '#3498db' :
                     hoveredInfo.node.elementType === 'Stone Well' ? '#f1c40f' : '#e67e22',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {hoveredInfo.node.elementType === 'Leafy Weed' ? '🌿 Leafy Weed (Issue)' :
             hoveredInfo.node.elementType === 'Rose Bush' ? '🌹 Rose Bush (PR)' :
             hoveredInfo.node.elementType === 'Epic Tree' ? '🌳 Epic Tree (Epic)' :
             hoveredInfo.node.elementType === 'Stone Well' ? '💧 Stone Well (Repository)' :
             hoveredInfo.node.elementType === 'Garden Gnome' ? '🧙 Garden Gnome (AI Agent)' : '💮 Garden Element'}
          </div>

          <div className="hover-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px', marginBottom: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '13px', color: '#fff', lineHeight: '1.3' }}>
              <strong>{hoveredInfo.node.title}</strong>
            </h4>
            {hoveredInfo.node.id !== 'well-core' &&
              !hoveredInfo.node.id.startsWith('gnome-') && (
                <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.12)', padding: '1px 5px', borderRadius: '3px', color: '#ccc', whiteSpace: 'nowrap' }}>
                  {hoveredInfo.node.id}
                </span>
              )}
          </div>
          <div className="hover-body">
            {hoveredInfo.node.description ? (
              <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.4', color: '#ddd' }}>{hoveredInfo.node.description}</p>
            ) : (
              <div className="hover-metrics" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <span style={{ color: '#aaa' }}>Progress:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'flex-end' }}>
                    <div style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.15)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${hoveredInfo.node.progress * 100}%`,
                          height: '100%',
                          background: hoveredInfo.node.progress > 0.8 ? '#2ecc71' : hoveredInfo.node.progress > 0.4 ? '#f1c40f' : '#e74c3c'
                        }}
                      ></div>
                    </div>
                    <span style={{ fontWeight: 600, minWidth: '30px', textAlign: 'right' }}>
                      {Math.round(hoveredInfo.node.progress * 100)}%
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <span style={{ color: '#aaa' }}>Complexity:</span>
                  <span style={{ fontWeight: 600, background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: '3px' }}>
                    {hoveredInfo.node.complexity.toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <span style={{ color: '#aaa' }}>Risk Factor:</span>
                  <span
                    style={{
                      fontWeight: 600,
                      color: hoveredInfo.node.risk > 0.5 ? '#ff4d4d' : '#2ecc71',
                      background: hoveredInfo.node.risk > 0.5 ? 'rgba(255,77,77,0.15)' : 'rgba(46,204,113,0.15)',
                      padding: '1px 5px',
                      borderRadius: '3px'
                    }}
                  >
                    {hoveredInfo.node.risk.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 📖 DTO Garden Legend Panel */}
      {showLegend && (
        <div
          className="glass-card legend-panel"
          style={{
            position: 'absolute',
            left: 20,
            top: 140, // Below workspace overview card
            width: 320,
            maxHeight: 'calc(100% - 240px)',
            overflowY: 'auto',
            zIndex: 1001,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: 16,
            background: 'rgba(23, 28, 41, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 12,
            backdropFilter: 'blur(10px)',
            color: '#fff',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>📖 DTO Garden Legend</h3>
            <button
              onClick={() => setShowLegend(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: 18,
                cursor: 'pointer',
                padding: '0 4px',
              }}
            >
              &times;
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13, lineHeight: '1.4' }}>
            <div>
              <strong style={{ color: '#e67e22', display: 'block', marginBottom: 2 }}>🌳 Epic Trees (Epics)</strong>
              <span>Represents Project Epics. Height and leaf growth reflect progress. Gnarled trunk rotation reflects risk/complexity. Fruits are deliverables.</span>
            </div>
            <div>
              <strong style={{ color: '#2ecc71', display: 'block', marginBottom: 2 }}>🌹 Rose Bushes (Pull Requests)</strong>
              <span>Represents Pull Requests (PRs). Green for Completed, Yellow for Under Review, Grey for Draft. Active PRs sprout flowers.</span>
            </div>
            <div>
              <strong style={{ color: '#e74c3c', display: 'block', marginBottom: 2 }}>🌿 Leafy Weeds (Issues/Bugs)</strong>
              <span>Represents Jira/Linear Issues. Red clumps are active high-priority bugs/tasks; dry grey clumps reside in the backlog.</span>
            </div>
            <div>
              <strong style={{ color: '#f1c40f', display: 'block', marginBottom: 2 }}>💧 Stone Well (Main Repository)</strong>
              <span>Represents the central repo & main branch. The well water\'s health reflects the overall workspace code integration stability.</span>
            </div>
            <div>
              <strong style={{ color: '#3498db', display: 'block', marginBottom: 2 }}>🧙 Garden Gnomes (AI Agents)</strong>
              <span>Operational AI Agents (Worker, Critic, Opponent) executing tasks, running pipeline checks, and testing system stability.</span>
            </div>
            <div>
              <strong style={{ color: '#e67e22', display: 'block', marginBottom: 2 }}>📦 Crop Crates (Deliverables)</strong>
              <span>Represents completed milestones or merged packages ready for deployment.</span>
            </div>
            <div>
              <strong style={{ color: '#95a5a6', display: 'block', marginBottom: 2 }}>🛢️ Wooden Barrels (Builds)</strong>
              <span>Represents generated build artifacts, packages, or container images in the CI pipeline.</span>
            </div>
            <div>
              <strong style={{ color: '#948c82', display: 'block', marginBottom: 2 }}>🛤️ Stepping Stones (CI/CD Path)</strong>
              <span>Represents the commit history path and CI/CD stages leading into the central branch.</span>
            </div>
            <div>
              <strong style={{ color: '#8e4a23', display: 'block', marginBottom: 2 }}>💮 Wildflowers (Dependencies)</strong>
              <span>The 5-circle objects scattered outside the fence represent external open-source libraries and package imports.</span>
            </div>
            <div>
              <strong style={{ color: '#7cd936', display: 'block', marginBottom: 2 }}>🚧 Fences (Workspace Scope)</strong>
              <span>Fences define active branch boundaries. Grass outside represents untracked files or third-party scopes.</span>
            </div>
            <div>
              <strong style={{ color: '#34495e', display: 'block', marginBottom: 2 }}>⛈️ Weather (Pipeline Load)</strong>
              <span>Sunny weather represents clean integration. High technical debt or failing tests trigger overcast skies and rain.</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      {!showLegend && uiVisible && (
        <button
          onClick={() => setShowLegend(true)}
          style={{
            position: 'absolute',
            left: 20,
            bottom: 20,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 14px',
            background: 'rgba(23, 28, 41, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 8,
            backdropFilter: 'blur(5px)',
            color: '#fff',
            fontWeight: 500,
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            transition: 'all 0.2s',
          }}
        >
          📖 DTO Glossary
        </button>
      )}
    </div>
  );
}
