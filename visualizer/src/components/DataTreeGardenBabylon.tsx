import { useEffect, useRef, useMemo } from 'react';
import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders'; // Enable loader plugins just in case
import type { TaskNode, HoveredData } from './DataTree';
import {
  buildTerrain,
  buildWell,
  buildGnome,
  buildRoseBush,
  buildWeed,
  buildTree,
  buildFence,
  buildLantern,
  buildWoodenBarrel,
  buildCropCrate,
  buildWildflower,
  buildCrop,
} from './BabylonAssets';

interface DataTreeGardenBabylonProps {
  graph: any;
  crr?: number;
  projectName?: string;
  onHover: (data: HoveredData | null) => void;
  [key: string]: any;
}

export function DataTreeGardenBabylon({
  graph,
  crr = 1.25,
  projectName = '',
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

  // Theme-aware color settings
  const themeColors = useMemo(() => {
    const profile = {
      lightColor: new BABYLON.Color3(1, 0.95, 0.85),
      ambientColor: new BABYLON.Color3(0.5, 0.55, 0.65),
      fogColor: new BABYLON.Color3(0.98, 0.96, 0.94),
      fogDensity: isRainy ? 0.024 : 0.012,
      grassColorHex: '#7cd936',
    };

    if (theme === 'alpha') {
      profile.lightColor = new BABYLON.Color3(1, 0.8, 0.65); // deep sunset gold
      profile.ambientColor = new BABYLON.Color3(0.5, 0.35, 0.3);
      profile.fogColor = new BABYLON.Color3(0.88, 0.42, 0.33);
      profile.grassColorHex = '#b8a655';
    } else if (theme === 'beta') {
      profile.lightColor = new BABYLON.Color3(1, 0.9, 0.92); // pink sunrise
      profile.ambientColor = new BABYLON.Color3(0.4, 0.45, 0.6);
      profile.fogColor = new BABYLON.Color3(0.92, 0.85, 0.9);
      profile.grassColorHex = '#8ad24e';
    } else if (theme === 'gamma') {
      profile.lightColor = new BABYLON.Color3(0.62, 0.68, 0.72); // cold storm grey
      profile.ambientColor = new BABYLON.Color3(0.26, 0.3, 0.35);
      profile.fogColor = new BABYLON.Color3(0.29, 0.34, 0.35);
      profile.grassColorHex = '#4a5b3f';
    }

    // Shift grass hex drier based on health
    const lush = new BABYLON.Color3(0.13, 0.22, 0.1);
    const dry = new BABYLON.Color3(0.38, 0.32, 0.2);
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

    if (theme === 'alpha') {
      exclusions.push(
        { x: -3.2, z: 3.2, r: 0.6 }, { x: -2.2, z: 3.2, r: 0.6 }, { x: -1.2, z: 3.2, r: 0.6 },
        { x: -3.2, z: 4.4, r: 0.6 }, { x: -2.2, z: 4.4, r: 0.6 }, { x: -1.2, z: 4.4, r: 0.6 },
        { x: 2.5, z: 2.5, r: 0.7 }, { x: 1.0, z: 3.5, r: 0.7 }
      );
    } else if (theme === 'beta') {
      exclusions.push(
        { x: -3.5, z: 2.8, r: 0.5 }, { x: -2.5, z: 2.8, r: 0.5 }, { x: -1.5, z: 2.8, r: 0.5 },
        { x: -3.5, z: 3.8, r: 0.5 }, { x: -2.5, z: 3.8, r: 0.5 }, { x: -1.5, z: 3.8, r: 0.5 },
        { x: -3.5, z: 4.8, r: 0.5 }, { x: -2.5, z: 4.8, r: 0.5 }, { x: -1.5, z: 4.8, r: 0.5 }
      );
    } else if (theme === 'gamma') {
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

    const getCollisionFreePosition = (proposedX: number, proposedZ: number): [number, number, number] => {
      let x = proposedX;
      let z = proposedZ;
      const radius = 0.65;
      let angle = 0;
      const step = 0.25;

      for (let attempt = 0; attempt < 100; attempt++) {
        let collides = false;
        for (const esc of exclusions) {
          if (Math.hypot(x - esc.x, z - esc.z) < (radius + esc.r)) {
            collides = true;
            break;
          }
        }
        if (!collides) {
          for (const item of placedItems) {
            if (Math.hypot(x - item.x, z - item.z) < (radius + item.r)) {
              collides = true;
              break;
            }
          }
        }
        if (!collides && x >= -6.0 && x <= 6.0 && z >= -5.0 && z <= 5.0) {
          return [x, 0.01, z];
        }
        angle += 0.5;
        const r = step * Math.sqrt(attempt + 1);
        x = proposedX + r * Math.cos(angle);
        z = proposedZ + r * Math.sin(angle);
      }
      return [proposedX, 0.01, proposedZ];
    };

    const getPlotPosition = (index: number, total: number, offsetSide: 'left' | 'right') => {
      const count = total || 1;
      const angle = (index / count) * Math.PI * 1.5;
      const radius = 2.0 + Math.sin(index * 2) * 0.8;
      const xSign = offsetSide === 'left' ? -1 : 1;
      const xProposed = xSign * (radius * Math.cos(angle) + 2.5);
      const zProposed = radius * Math.sin(angle) * 0.9;

      const [finalX, finalY, finalZ] = getCollisionFreePosition(xProposed, zProposed);
      placedItems.push({ x: finalX, z: finalZ, r: 0.65 });
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

    // 3. Lighting
    const light = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), scene);
    light.diffuse = themeColors.ambientColor;
    light.groundColor = new BABYLON.Color3(0.12, 0.18, 0.08);
    light.intensity = 0.8;

    const dirLight = new BABYLON.DirectionalLight("sunLight", new BABYLON.Vector3(-0.6, -1.0, -0.4), scene);
    dirLight.position = new BABYLON.Vector3(12, 20, 8);
    dirLight.diffuse = themeColors.lightColor;
    dirLight.intensity = 2.4;

    // 4. Shadow Setup
    const shadowGenerator = new BABYLON.ShadowGenerator(2048, dirLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 32;

    // 5. Build Environment Base
    buildTerrain(scene, theme, themeColors.grassColorHex);
    buildWell(scene, new BABYLON.Vector3(0, 0, 0), crr, projectName);

    // 6. Build Gnomes (AI Agents)
    buildGnome(scene, new BABYLON.Vector3(-1.4, 0.01, -1.8), '#2575fc', "Worker Agent Gnome", "Executes tasks, generates branches, refactors code, and runs system tests.");
    buildGnome(scene, new BABYLON.Vector3(1.4, 0.01, -1.8), '#9b59b6', "Critic Agent Gnome", "Reviews pull requests, checks styling, runs linters, and rates visual fidelity.");
    buildGnome(scene, new BABYLON.Vector3(0.0, 0.01, 1.8), '#ec008c', "Opponent Agent Gnome", "Simulates system failures, breaks parameters, and tests resilience of the garden.");

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

    // 12. Flat Stepping Stones (Paths)
    const stonePositions = [
      [-1.0, -0.65], [-2.0, -1.3], [1.0, -0.65], [2.0, -1.3]
    ];
    stonePositions.forEach(([x, z], idx) => {
      const stone = BABYLON.MeshBuilder.CreateCylinder(`stepStone_${idx}`, { diameter: 0.52, height: 0.03, tessellation: 8 }, scene);
      stone.position.set(x, 0.015, z);
      stone.rotation.y = idx * 0.4;
      const stoneMat = new BABYLON.PBRMaterial(`stepStoneMat_${idx}`, scene);
      stoneMat.albedoColor = new BABYLON.Color3(0.53, 0.5, 0.46); // warm stone grey
      stoneMat.roughness = 0.95;
      stone.material = stoneMat;
      stone.receiveShadows = true;
    });

    // 13. Hay Day Clutter & Deployed Releases / Builds
    buildWoodenBarrel(scene, new BABYLON.Vector3(-1.1, 0, -1.0));
    buildWoodenBarrel(scene, new BABYLON.Vector3(1.1, 0, -1.0));
    buildCropCrate(scene, new BABYLON.Vector3(-1.2, 0, 0.8));
    buildCropCrate(scene, new BABYLON.Vector3(1.2, 0, 0.8));

    // 14. Scattered Project Crops & Themed Patches
    if (theme === 'alpha') {
      // Project Alpha: Tall Corn Rows and Pumpkin Crates
      buildCrop(scene, new BABYLON.Vector3(-3.2, 0.01, 3.2), 'corn');
      buildCrop(scene, new BABYLON.Vector3(-2.2, 0.01, 3.2), 'corn');
      buildCrop(scene, new BABYLON.Vector3(-1.2, 0.01, 3.2), 'corn');
      buildCrop(scene, new BABYLON.Vector3(-3.2, 0.01, 4.4), 'corn');
      buildCrop(scene, new BABYLON.Vector3(-2.2, 0.01, 4.4), 'corn');
      buildCrop(scene, new BABYLON.Vector3(-1.2, 0.01, 4.4), 'corn');
      buildCropCrate(scene, new BABYLON.Vector3(2.5, 0.01, 2.5));
      buildCropCrate(scene, new BABYLON.Vector3(1.0, 0.01, 3.5));
    } else if (theme === 'beta') {
      // Project Beta: Orange Carrot Rows
      buildCrop(scene, new BABYLON.Vector3(-3.5, 0.01, 2.8), 'carrot');
      buildCrop(scene, new BABYLON.Vector3(-2.5, 0.01, 2.8), 'carrot');
      buildCrop(scene, new BABYLON.Vector3(-1.5, 0.01, 2.8), 'carrot');
      buildCrop(scene, new BABYLON.Vector3(-3.5, 0.01, 3.8), 'carrot');
      buildCrop(scene, new BABYLON.Vector3(-2.5, 0.01, 3.8), 'carrot');
      buildCrop(scene, new BABYLON.Vector3(-1.5, 0.01, 3.8), 'carrot');
      buildCrop(scene, new BABYLON.Vector3(-3.5, 0.01, 4.8), 'carrot');
      buildCrop(scene, new BABYLON.Vector3(-2.5, 0.01, 4.8), 'carrot');
      buildCrop(scene, new BABYLON.Vector3(-1.5, 0.01, 4.8), 'carrot');
    } else if (theme === 'gamma') {
      // Project Gamma: Leafy Cabbages and Wild Spiky weeds (bug representation)
      buildCrop(scene, new BABYLON.Vector3(-3.5, 0.01, 3.2), 'cabbage');
      buildCrop(scene, new BABYLON.Vector3(-2.0, 0.01, 3.2), 'cabbage');
      buildCrop(scene, new BABYLON.Vector3(-0.5, 0.01, 3.2), 'cabbage');
      buildCrop(scene, new BABYLON.Vector3(-3.5, 0.01, 4.4), 'cabbage');
      buildCrop(scene, new BABYLON.Vector3(-2.0, 0.01, 4.4), 'cabbage');
      buildCrop(scene, new BABYLON.Vector3(-0.5, 0.01, 4.4), 'cabbage');
      buildWeed(scene, new BABYLON.Vector3(2.5, 0.01, 2.5), 'active');
      buildWeed(scene, new BABYLON.Vector3(1.0, 0.01, 3.5), 'active');
    } else {
      // Default/Live: Mixed Crop Patch
      buildCrop(scene, new BABYLON.Vector3(-3.5, 0.01, 3.0), 'carrot');
      buildCrop(scene, new BABYLON.Vector3(-2.5, 0.01, 3.0), 'carrot');
      buildCrop(scene, new BABYLON.Vector3(-3.5, 0.01, 4.2), 'cabbage');
      buildCrop(scene, new BABYLON.Vector3(-2.0, 0.01, 4.2), 'cabbage');
      buildCrop(scene, new BABYLON.Vector3(1.8, 0.01, 3.0), 'corn');
      buildCropCrate(scene, new BABYLON.Vector3(2.2, 0.01, 4.2));
    }

    // 15. Scattered Colorful Wildflowers
    const flowerColors = [
      '#e74c3c', '#9b59b6', '#f1c40f', '#e67e22', 
      '#e84393', '#ffffff', '#fd79a8', '#00cec9',
      '#9c88ff', '#fbc531', '#4cd137', '#487eb0'
    ];
    for (let i = 0; i < 80; i++) {
      const angle = (i / 80) * Math.PI * 2 + Math.sin(i * 2.5) * 0.3;
      const radius = 6.8 + Math.cos(i * 1.7) * 4.0;
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      const scale = 3.5 + Math.sin(i) * 1.5;
      buildWildflower(scene, new BABYLON.Vector3(x, 0.015, z), flowerColors[i % flowerColors.length], scale);
    }

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
      
      const rainPS = new BABYLON.ParticleSystem("rainParticles", 300, scene);
      rainPS.particleTexture = new BABYLON.Texture("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='4' height='16'><rect width='2' height='12' fill='white' opacity='0.5'/></svg>", scene);
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

    const pointerObs = scene.onPointerObservable.add((pointerInfo) => {
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
            const canvas = scene.getEngine().getRenderingCanvas();
            const rect = canvas ? canvas.getBoundingClientRect() : null;
            const x = rect ? pointerInfo.event.clientX - rect.left : pointerInfo.event.offsetX;
            const y = rect ? pointerInfo.event.clientY - rect.top : pointerInfo.event.offsetY;

            onHover({
              node: details,
              x: x,
              y: y
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

    // 14. Render Loop
    engine.runRenderLoop(() => {
      scene.render();
    });

    // 15. Resize & Cleanup
    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      scene.onPointerObservable.remove(pointerObs);
      scene.dispose();
      engine.dispose();
    };
  }, [graph, theme, crr, projectName, themeColors, isRainy, onHover, gardenElements]);

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
