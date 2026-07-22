import { useEffect, useRef, useMemo } from 'react';
import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders'; // Enable loader plugins just in case
import type { TaskNode, HoveredData } from './DataTree';
import {
  preloadGLBAssets,
  buildTerrain,
  buildWell,
  buildGnome,
  buildRoseBush,
  buildWeed,
  buildTree,
  buildFence,
  buildLantern,
} from './BabylonAssets';

interface DataTreeGardenBabylonProps {
  graph: any;
  crr?: number;
  projectName?: string;
  filters?: Record<string, boolean>;
  onHover: (data: HoveredData | null) => void;
  [key: string]: any;
}

export function DataTreeGardenBabylon({
  graph,
  crr = 1.25,
  projectName = '',
  filters,
  onHover,
}: DataTreeGardenBabylonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 1. Determine Project Theme Profile
  const theme = useMemo(() => {
    const name = (projectName || '').toLowerCase();
    if (name.includes('alpha')) return 'alpha';
    if (name.includes('beta')) return 'beta';
    if (name.includes('gamma')) return 'gamma';
    return 'default';
  }, [projectName]);

  const isRainy = crr < 1.0 || theme === 'gamma';

  // Theme-aware color settings (brightened for warm, cozy Hay Day style)
  const themeColors = useMemo(() => {
    const profile = {
      lightColor: new BABYLON.Color3(1.0, 0.98, 0.95), // Bright white-warm sunlight
      ambientColor: new BABYLON.Color3(0.7, 0.72, 0.75), // Bright blue-sky ambient fill
      fogColor: new BABYLON.Color3(0.95, 0.98, 1.0), // Clean light sky-haze fog
      fogDensity: isRainy ? 0.008 : 0.0006, // Very thin fog for clear visibility when sunny
      grassColorHex: '#a2e048', // Default bright lime green
    };

    if (theme === 'alpha') {
      // Project Alpha: Warm, golden bright afternoon (cheerful daylight)
      profile.lightColor = new BABYLON.Color3(1.0, 0.96, 0.88);
      profile.ambientColor = new BABYLON.Color3(0.68, 0.65, 0.62);
      profile.fogColor = new BABYLON.Color3(0.96, 0.94, 0.9);
      profile.grassColorHex = '#a2e048'; // Bright chartreuse/lime
    } else if (theme === 'beta') {
      // Project Beta: Cheerful bright morning sun
      profile.lightColor = new BABYLON.Color3(1.0, 0.94, 0.96);
      profile.ambientColor = new BABYLON.Color3(0.66, 0.68, 0.76);
      profile.fogColor = new BABYLON.Color3(0.94, 0.92, 0.96);
      profile.grassColorHex = '#8cd24e';
    } else if (theme === 'gamma') {
      // Project Gamma: Overcast rainy daylight but still clear and bright
      profile.lightColor = new BABYLON.Color3(0.8, 0.84, 0.88);
      profile.ambientColor = new BABYLON.Color3(0.48, 0.52, 0.58);
      profile.fogColor = new BABYLON.Color3(0.7, 0.74, 0.78);
      profile.grassColorHex = '#7ca262';
    }

    // Shift grass hex drier based on health
    const lush = BABYLON.Color3.FromHexString(profile.grassColorHex); // use bright grass color from theme
    const dry = new BABYLON.Color3(0.82, 0.78, 0.52); // warm bright straw yellow (#d1c784)
    const factor = Math.min(Math.max((crr - 0.7) / 0.8, 0), 1);
    profile.grassColorHex = BABYLON.Color3.Lerp(dry, lush, factor).toHexString();

    return profile;
  }, [theme, crr, isRainy]);

  // Extract PR and Issue nodes from flat graph (Identical layout algorithm logic as DataTreeGarden)
  const gardenElements = useMemo(() => {
    if (!graph || !graph.nodes) return { prs: [], issues: [], epicPRs: null, epicIssues: null };

    const prs: any[] = [];
    const issues: any[] = [];

    const exclusions = [
      { x: 0, z: 0, r: 1.8 },        // Central Stone Well Core
      { x: -1.4, z: -1.8, r: 1.0 },   // Worker Agent Gnome
      { x: 1.4, z: -1.8, r: 1.0 },    // Critic Agent Gnome
      { x: 0.0, z: 1.8, r: 1.0 },     // Opponent Agent Gnome
      { x: -3.6, z: -1.8, r: 2.0 },   // Epic Tree Left (PRs)
      { x: 3.6, z: -1.8, r: 2.0 },    // Epic Tree Right (Issues)
    ];

    const placedItems: { x: number; z: number; r: number }[] = [];

    const getCollisionFreePosition = (proposedX: number, proposedZ: number, itemRadius: number = 1.1): [number, number, number] => {
      let x = proposedX;
      let z = proposedZ;
      let angle = 0;
      const step = 0.35;

      for (let attempt = 0; attempt < 120; attempt++) {
        let collides = false;
        for (const esc of exclusions) {
          if (Math.hypot(x - esc.x, z - esc.z) < (itemRadius + esc.r)) {
            collides = true;
            break;
          }
        }
        if (!collides) {
          for (const item of placedItems) {
            if (Math.hypot(x - item.x, z - item.z) < (itemRadius + item.r)) {
              collides = true;
              break;
            }
          }
        }
        if (!collides && x >= -5.6 && x <= 5.6 && z >= -4.6 && z <= 4.6) {
          return [x, 0.01, z];
        }
        angle += 0.6;
        const r = step * Math.sqrt(attempt + 1);
        x = proposedX + r * Math.cos(angle);
        z = proposedZ + r * Math.sin(angle);
      }
      return [proposedX, 0.01, proposedZ];
    };

    const getPlotPosition = (index: number, total: number, offsetSide: 'left' | 'right') => {
      const count = total || 1;
      const itemRadius = offsetSide === 'left' ? 1.15 : 0.95;
      const angle = (index / count) * Math.PI * 1.5;
      const radius = 2.2 + Math.sin(index * 2) * 0.8;
      const xSign = offsetSide === 'left' ? -1 : 1;
      const xProposed = xSign * (radius * Math.cos(angle) + 2.5);
      const zProposed = radius * Math.sin(angle) * 0.9;

      const [finalX, finalY, finalZ] = getCollisionFreePosition(xProposed, zProposed, itemRadius);
      placedItems.push({ x: finalX, z: finalZ, r: itemRadius });
      return new BABYLON.Vector3(finalX, finalY, finalZ);
    };

    const epicPRNode = graph.nodes.find((n: any) => n.type.toLowerCase() === 'pr' && n.category === 'epic');
    const epicIssueNode = graph.nodes.find((n: any) => n.type.toLowerCase() === 'issue' && n.category === 'epic');

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
          elementType: 'Rose Bush',
        },
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
          elementType: 'Leafy Weed',
        },
      });
    });

    const epicPRs: TaskNode = epicPRNode ? {
      id: epicPRNode.id,
      title: epicPRNode.attributes?.title || epicPRNode.name,
      progress: epicPRNode.attributes?.completion ?? 0.85,
      complexity: epicPRNode.attributes?.complexity ?? 3,
      risk: epicPRNode.attributes?.riskProbability ?? 0.1,
      elementType: 'Epic Tree',
      subtasks: prs.map(p => p.node),
    } : {
      id: 'epic-pr-virtual',
      title: 'Pull Requests Root',
      progress: 0.85,
      complexity: 3,
      risk: 0.1,
      elementType: 'Epic Tree',
      subtasks: prs.map(p => p.node),
    };

    const epicIssues: TaskNode = epicIssueNode ? {
      id: epicIssueNode.id,
      title: epicIssueNode.attributes?.title || epicIssueNode.name,
      progress: epicIssueNode.attributes?.completion ?? 0.35,
      complexity: epicIssueNode.attributes?.complexity ?? 3,
      risk: epicIssueNode.attributes?.riskProbability ?? 0.65,
      elementType: 'Epic Tree',
      subtasks: issues.map(i => i.node),
    } : {
      id: 'epic-issue-virtual',
      title: 'Active Issues Root',
      progress: 0.35,
      complexity: 3,
      risk: 0.65,
      elementType: 'Epic Tree',
      subtasks: issues.map(i => i.node),
    };

    return { prs, issues, epicPRs, epicIssues };
  }, [graph, theme]);

  useEffect(() => {
    if (!canvasRef.current) return;

    // 1. Initialize Engine & Scene
    const engine = new BABYLON.Engine(canvasRef.current, true, { preserveDrawingBuffer: true, stencil: true });
    const scene = new BABYLON.Scene(engine);
    
    // Ambient Fog Configuration
    scene.clearColor = new BABYLON.Color4(
      themeColors.fogColor.r,
      themeColors.fogColor.g,
      themeColors.fogColor.b,
      1
    );
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogColor = themeColors.fogColor;
    scene.fogDensity = themeColors.fogDensity;

    // 2. Camera Setup
    const camera = new BABYLON.ArcRotateCamera(
      "camera",
      -Math.PI / 2,
      Math.PI / 3.5,
      14,
      new BABYLON.Vector3(0, 1.2, 0),
      scene
    );
    camera.attachControl(canvasRef.current, true);
    camera.lowerRadiusLimit = 4;
    camera.upperRadiusLimit = 22;
    camera.upperBetaLimit = Math.PI / 2 - 0.05; // Prevent camera going below ground level

    // 3. Lighting (Brightened up with higher fill/sun intensities and warmer bounce)
    const light = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), scene);
    light.diffuse = themeColors.ambientColor;
    light.groundColor = new BABYLON.Color3(0.35, 0.45, 0.25); // bright grass reflection bounce
    light.intensity = 1.25; // Increased ambient fill intensity

    const dirLight = new BABYLON.DirectionalLight("sunLight", new BABYLON.Vector3(-0.5, -0.85, -0.45), scene);
    dirLight.position = new BABYLON.Vector3(12, 20, 8);
    dirLight.diffuse = themeColors.lightColor;
    dirLight.intensity = 3.2; // Increased sun light intensity for fully sunlit look

    // 4. Cascaded Shadow Generator & PBR DefaultRenderingPipeline
    const shadowGenerator = new BABYLON.CascadedShadowGenerator(2048, dirLight);
    shadowGenerator.usePercentageCloserFiltering = true;

    // DefaultRenderingPipeline: ACES Tone Mapping, Bloom, Anti-aliasing
    const pipeline = new BABYLON.DefaultRenderingPipeline("defaultPipeline", true, scene, [camera]);
    pipeline.samples = 4;
    pipeline.imageProcessingEnabled = true;
    if (pipeline.imageProcessing) {
      pipeline.imageProcessing.toneMappingEnabled = true;
      pipeline.imageProcessing.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
      pipeline.imageProcessing.exposure = 1.2;
    }
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.8;
    pipeline.bloomWeight = 0.3;

    try {
      const ssao = new BABYLON.SSAO2RenderingPipeline("ssao", scene, 0.75, [camera]);
      ssao.radius = 2.0;
      ssao.totalStrength = 1.0;
    } catch (e) {
      // Graceful fallback for SSAO depth texture support
    }

    // Preload GLB models in parallel, then build garden elements once loaded
    const glbList = [
      "Water Fountain.glb", "Gazebo.glb", "Tree.glb", "Bonsai.glb",
      "Flower Bed.glb", "Flower Bed-dM9hXXth1I.glb", "Flower Bed-eUCvK3Oq9z.glb",
      "Rock.glb", "Rock-UkxWNmiFFj.glb", "Japanese Sedge.glb",
      "Statue.glb", "Statue-0Mkdl3SJDT.glb", "Statue-JXmywADgSk.glb", "Statue-NZo0rzQExF.glb",
      "Flowers.glb", "Flower Pot.glb", "Flower Pot-F8zLx6wGG8.glb",
      "Garden Lamp.glb", "Lamp.glb", "Pillar.glb",
      "Bench.glb", "Table.glb", "Bird House.glb", "Chiminea.glb", "Fire Place.glb"
    ];

    let cancelled = false;

    preloadGLBAssets(scene, glbList)
      .catch((err) => console.warn("GLB preloader catch:", err))
      .finally(() => {
        if (cancelled) return;

        // 5. Build Environment Base
        buildTerrain(scene, theme, themeColors.grassColorHex);
        buildWell(scene, new BABYLON.Vector3(0, 0, 0), crr, projectName);

    // 6. Build Gnomes (AI Agents)
    const workerGnome = buildGnome(scene, new BABYLON.Vector3(-1.4, 0.01, -1.8), '#2575fc', "Worker Agent Gnome", "Executes tasks, generates branches, refactors code, and runs system tests.");
    const criticGnome = buildGnome(scene, new BABYLON.Vector3(1.4, 0.01, -1.8), '#9b59b6', "Critic Agent Gnome", "Reviews pull requests, checks styling, runs linters, and rates visual fidelity.");
    const opponentGnome = buildGnome(scene, new BABYLON.Vector3(0.0, 0.01, 1.8), '#ec008c', "Opponent Agent Gnome", "Simulates system failures, breaks parameters, and tests resilience of the garden.");

    // 7. Dynamic Data Trees (Left & Right)
    if (gardenElements.epicPRs) {
      buildTree(scene, new BABYLON.Vector3(-3.6, 0, -1.8), gardenElements.epicPRs, theme);
    }
    if (gardenElements.epicIssues) {
      buildTree(scene, new BABYLON.Vector3(3.6, 0, -1.8), gardenElements.epicIssues, theme);
    }

    // 8. Pull Request Bushes
    gardenElements.prs.forEach(pr => {
      buildRoseBush(scene, pr.position, pr.status, pr.node);
    });

    // 9. Issue Weeds
    gardenElements.issues.forEach(issue => {
      buildWeed(scene, issue.position, issue.status, issue.node);
    });

    // 10. Static Fences Borders (crooked hand-built look)
    const fencePositions = [
      // Back fence (z = -6.5)
      [-4.5, -6.5], [-3, -6.5], [-1.5, -6.5], [0, -6.5], [1.5, -6.5], [3, -6.5], [4.5, -6.5],
      // Front fence (z = 6.5)
      [-4.5, 6.5], [-3, 6.5], [-1.5, 6.5], [0, 6.5], [1.5, 6.5], [3, 6.5], [4.5, 6.5]
    ];
    fencePositions.forEach(([x, z]) => {
      buildFence(scene, new BABYLON.Vector3(x, 0, z));
    });

    // 11. Fence Corner Glow Lanterns
    const lanternPositions = [
      [-4.5, -6.4], [4.5, -6.4], [-4.5, 6.4], [4.5, 6.4]
    ];
    lanternPositions.forEach(([x, z]) => {
      buildLantern(scene, new BABYLON.Vector3(x, 0, z));
    });



    // 11. Shadow Assignment Pass
    scene.meshes.forEach(m => {
      if (m.name !== "grass" && m.name !== "soil" && m.name !== "rainEmitter") {
        shadowGenerator.addShadowCaster(m, true);
      }
    });

    // 12. Weather rain rendering loop
    let groundRainEmitter: BABYLON.Mesh | null = null;
    if (isRainy) {
      groundRainEmitter = BABYLON.MeshBuilder.CreatePlane("rainEmitter", { size: 24 }, scene);
      groundRainEmitter.rotation.x = Math.PI / 2;
      groundRainEmitter.position.y = 8;
      groundRainEmitter.isVisible = false;
      
      const rainPS = new BABYLON.ParticleSystem("rainParticles", 300, scene);
      rainPS.particleTexture = new BABYLON.Texture("data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc0JyBoZWlnaHQ9JzE2Jz48cmVjdCB3aWR0aD0nMicgaGVpZ2h0PScxMicgZmlsbD0nd2hpdGUnIG9wYWNpdHk9JzAuNScvPjwvc3ZnPg==", scene);
      rainPS.emitter = groundRainEmitter;
      rainPS.minEmitBox = new BABYLON.Vector3(-11, 0, -11);
      rainPS.maxEmitBox = new BABYLON.Vector3(11, 0, 11);
      rainPS.color1 = new BABYLON.Color4(0.6, 0.75, 0.8, 0.35);
      rainPS.color2 = new BABYLON.Color4(0.5, 0.7, 0.85, 0.2);
      rainPS.minSize = 0.05;
      rainPS.maxSize = 0.18;
      rainPS.minLifeTime = 0.5;
      rainPS.maxLifeTime = 1.0;
      rainPS.emitRate = 180;
      rainPS.gravity = new BABYLON.Vector3(0, -9.81, 0);
      rainPS.direction1 = new BABYLON.Vector3(-0.06, -1.0, 0);
      rainPS.direction2 = new BABYLON.Vector3(-0.08, -1.0, 0);
      rainPS.minEmitPower = 6;
      rainPS.maxEmitPower = 8;
      rainPS.start();
    }

    // 13. Dynamic Interaction picking/hover details
    let lastHoveredMesh: BABYLON.AbstractMesh | null = null;

    scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
        const pickResult = scene.pick(scene.pointerX, scene.pointerY);
        if (pickResult && pickResult.hit && pickResult.pickedMesh) {
          let targetNode: BABYLON.Node | null = pickResult.pickedMesh;
          let details = null;
          let foundMesh: BABYLON.AbstractMesh | null = null;

          while (targetNode) {
            if (targetNode.metadata && targetNode.metadata.details) {
              details = targetNode.metadata.details;
              if (targetNode instanceof BABYLON.AbstractMesh) {
                foundMesh = targetNode;
              }
              break;
            }
            targetNode = targetNode.parent;
          }

          if (details) {
            const picked = foundMesh || pickResult.pickedMesh;
            if (lastHoveredMesh !== picked) {
              lastHoveredMesh = picked;
              document.body.style.cursor = 'pointer';
            }
            onHover({
              node: details,
              x: scene.pointerX,
              y: scene.pointerY
            });
            return;
          }
        }
        
        if (lastHoveredMesh) {
          lastHoveredMesh = null;
          document.body.style.cursor = 'default';
          onHover(null);
        }
      }
    });

    // 14. Gnome Movement & Interaction loop
    const gnomesList = [
      {
        node: workerGnome,
        home: new BABYLON.Vector3(-1.4, 0.01, -1.8),
        role: 'worker',
        target: null as BABYLON.Vector3 | null,
        targetNodeId: null as string | null,
        state: 'idle', // 'idle', 'walking', 'working'
        timer: 0,
        angleOffset: 0,
      },
      {
        node: criticGnome,
        home: new BABYLON.Vector3(1.4, 0.01, -1.8),
        role: 'critic',
        target: null as BABYLON.Vector3 | null,
        targetNodeId: null as string | null,
        state: 'idle',
        timer: 0,
        angleOffset: Math.PI * 2 / 3,
      },
      {
        node: opponentGnome,
        home: new BABYLON.Vector3(0.0, 0.01, 1.8),
        role: 'opponent',
        target: null as BABYLON.Vector3 | null,
        targetNodeId: null as string | null,
        state: 'idle',
        timer: 0,
        angleOffset: Math.PI * 4 / 3,
      }
    ];

    let animationTime = 0;
    const movementSpeed = 0.015; // Cozy walking speed

    scene.onBeforeRenderObservable.add(() => {
      const dt = engine.getDeltaTime() / 1000;
      animationTime += dt;

      gnomesList.forEach(g => {
        if (!g.node) return;

        // 1. Target Selection (Idle State)
        if (g.state === 'idle') {
          let targetSelected = false;

          if (g.role === 'worker') {
            const weeds = gardenElements.issues;
            if (weeds.length > 0) {
              const weed = weeds[Math.floor(Math.random() * weeds.length)];
              const issuePos = weed.position;
              g.target = new BABYLON.Vector3(
                issuePos.x + Math.cos(g.angleOffset) * 0.45,
                0.01,
                issuePos.z + Math.sin(g.angleOffset) * 0.45
              );
              g.targetNodeId = weed.node.id;
              targetSelected = true;
            }
          } else if (g.role === 'critic') {
            const bushes = gardenElements.prs;
            if (bushes.length > 0) {
              const bush = bushes[Math.floor(Math.random() * bushes.length)];
              const prPos = bush.position;
              g.target = new BABYLON.Vector3(
                prPos.x + Math.cos(g.angleOffset) * 0.45,
                0.01,
                prPos.z + Math.sin(g.angleOffset) * 0.45
              );
              g.targetNodeId = bush.node.id;
              targetSelected = true;
            }
          } else if (g.role === 'opponent') {
            const weeds = gardenElements.issues;
            // Opponent targets either the Central Well or active issues
            if (Math.random() > 0.4 || weeds.length === 0) {
              g.target = new BABYLON.Vector3(
                Math.cos(g.angleOffset) * 1.1,
                0.01,
                Math.sin(g.angleOffset) * 1.1
              );
              g.targetNodeId = 'well';
              targetSelected = true;
            } else {
              const weed = weeds[Math.floor(Math.random() * weeds.length)];
              const issuePos = weed.position;
              g.target = new BABYLON.Vector3(
                issuePos.x + Math.cos(g.angleOffset) * 0.45,
                0.01,
                issuePos.z + Math.sin(g.angleOffset) * 0.45
              );
              g.targetNodeId = weed.node.id;
              targetSelected = true;
            }
          }

          if (!targetSelected) {
            g.target = g.home.clone();
            g.targetNodeId = 'home';
          }

          g.state = 'walking';
        }

        // 2. Walking State
        if (g.state === 'walking' && g.target) {
          const dir = g.target.subtract(g.node.position);
          dir.y = 0; // Keep on ground plane
          const dist = dir.length();

          if (dist > 0.05) {
            dir.normalize();
            g.node.position.addInPlace(dir.scale(movementSpeed));

            // Smoothly rotate to face target heading direction
            const targetRotation = Math.atan2(dir.x, dir.z);
            let diff = targetRotation - g.node.rotation.y;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            g.node.rotation.y += diff * 0.1;

            // Cozy bouncing hop animation during walk
            g.node.position.y = 0.01 + Math.abs(Math.sin(animationTime * 12)) * 0.08;
            g.node.rotation.x = 0.12; // lean forward slightly
          } else {
            // Arrived at target!
            g.state = 'working';
            g.timer = 6 + Math.random() * 8; // work for 6-14 seconds
            g.node.position.y = 0.01;
            g.node.rotation.x = 0; // stand straight
          }
        }

        // 3. Working State
        if (g.state === 'working') {
          g.timer -= dt;

          // Gentle breathing bobbing animation
          g.node.position.y = 0.01 + Math.sin(animationTime * 3) * 0.015;

          // Face the target element while working on it
          let lookTarget = g.home;
          if (g.targetNodeId === 'well') {
            lookTarget = new BABYLON.Vector3(0, 0, 0);
          } else if (g.targetNodeId && g.targetNodeId !== 'home') {
            const weed = gardenElements.issues.find(i => i.node.id === g.targetNodeId);
            const bush = gardenElements.prs.find(p => p.node.id === g.targetNodeId);
            if (weed) lookTarget = weed.position;
            else if (bush) lookTarget = bush.position;
          }
          const lookDir = lookTarget.subtract(g.node.position);
          const lookAngle = Math.atan2(lookDir.x, lookDir.z);
          let diff = lookAngle - g.node.rotation.y;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          g.node.rotation.y += diff * 0.05;

          if (g.timer <= 0) {
            g.state = 'idle'; // select new target on next frame
          }
        }
      });
    });

    // 14b. Garden Filters visibility observable pass
    scene.onBeforeRenderObservable.add(() => {
      if (!filters) return;

      scene.meshes.forEach(m => {
        // Dewdrops Filter
        if (m.name === "dewdropMesh" || m.name === "dewdrop") {
          m.isVisible = filters.showDewdrops !== false;
        }

        // Epics / Trees Filter & Gnomes Filter
        let p: BABYLON.Node | null = m;
        let isTreeMesh = false;
        let isGnomeMesh = false;
        while (p) {
          if (p.name === "tree") isTreeMesh = true;
          if (p.name === "gnome") isGnomeMesh = true;
          p = p.parent;
        }
        if (isTreeMesh) {
          m.isVisible = filters.showEpics !== false;
        }
        if (isGnomeMesh) {
          m.isVisible = filters.showAgents !== false && filters.showBees !== false;
        }
      });
    });

    }); // end of preloadGLBAssets.then callback

    // 15. Render Loop
    engine.runRenderLoop(() => {
      scene.render();
    });

    // 16. Resize & Cleanup
    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", handleResize);
      scene.dispose();
      engine.dispose();
    };
  }, [graph, theme, crr, projectName, themeColors, isRainy, onHover, gardenElements, filters]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        outline: 'none',
      }}
    />
  );
}
