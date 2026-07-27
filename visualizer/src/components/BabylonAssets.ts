import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

// ─── GLB ASSET CONTAINER CACHE & PRELOADER ─────────────────────────
const sceneAssetCache = new WeakMap<BABYLON.Scene, Record<string, BABYLON.AssetContainer>>();

export async function preloadGLBAssets(scene: BABYLON.Scene, filenames: string[]): Promise<void> {
  let cache = sceneAssetCache.get(scene);
  if (!cache) {
    cache = {};
    sceneAssetCache.set(scene, cache);
  }
  const currentCache = cache;

  await Promise.all(
    filenames.map(async (filename) => {
      if (currentCache[filename]) return;
      try {
        const container = await BABYLON.SceneLoader.LoadAssetContainerAsync(
          "/decorations/",
          filename,
          scene
        );
        currentCache[filename] = container;
      } catch (err) {
        console.warn(`[GLB Loader Warning] Could not preload /decorations/${filename}:`, err);
      }
    })
  );
}

export function instantiateGLBModel(
  scene: BABYLON.Scene,
  filename: string,
  parent: BABYLON.Node | null,
  position: BABYLON.Vector3,
  scale: number = 1.0,
  rotationY: number = 0,
  metadata?: any,
  shadowGenerator?: BABYLON.ShadowGenerator | BABYLON.CascadedShadowGenerator
): BABYLON.TransformNode | null {
  const cache = sceneAssetCache.get(scene);
  const container = cache ? cache[filename] : null;
  if (!container) return null;

  try {
    const root = new BABYLON.TransformNode(`inst_${filename}_${Math.random().toString(36).substring(2, 7)}`, scene);
    if (parent) {
      root.parent = parent;
    }
    root.position = position.clone();
    root.rotation.y = rotationY;

    const entries = container.instantiateModelsToScene(name => `${name}_${Math.random().toString(36).substring(2, 7)}`);
    entries.rootNodes.forEach(rNode => {
      rNode.parent = root;
      if (rNode instanceof BABYLON.TransformNode) {
        rNode.scaling.set(scale, scale, scale);
      }
      
      const childMeshes = rNode.getChildMeshes();
      childMeshes.forEach(m => {
        m.isPickable = true;
        if (metadata) {
          m.metadata = metadata;
        }
        m.receiveShadows = true;
        if (shadowGenerator) {
          shadowGenerator.addShadowCaster(m, true);
        }
      });
    });

    // Compute hierarchy bounds to align bottom-most vertex flush to position.y (soil surface) for unparented root models
    if (!parent) {
      root.computeWorldMatrix(true);
      root.getDescendants(false).forEach(n => {
        if (n instanceof BABYLON.TransformNode || n instanceof BABYLON.AbstractMesh) {
          n.computeWorldMatrix(true);
        }
      });
      let localMinY = Infinity;
      root.getChildMeshes(false).forEach(m => {
        m.refreshBoundingInfo(true, true);
        m.computeWorldMatrix(true);
        const b = m.getBoundingInfo().boundingBox;
        if (b && Number.isFinite(b.minimumWorld.y) && b.minimumWorld.y < localMinY) {
          localMinY = b.minimumWorld.y;
        }
      });

      if (Number.isFinite(localMinY) && localMinY !== Infinity) {
        const targetY = position.y;
        const offset = targetY - localMinY;
        root.position.y += offset;
        // Debug: report GLB origin offset for verification of different model origins
        console.log(`[GLB Ground] ${filename}: localMinY=${localMinY.toFixed(4)}, targetY=${targetY.toFixed(4)}, offset=${offset.toFixed(4)}, finalY=${root.position.y.toFixed(4)}`);
      }
    }

    return root;
  } catch (err) {
    console.error(`[instantiateGLBModel error for ${filename}]:`, err);
    return null;
  }
}

// ─── COLLISION BOX HELPER ─────────────────────────────────────────────
// Creates an invisible AABB proxy mesh parented to any TransformNode.
// Uses Babylon's built-in legacy collision system (no physics engine needed).
// Every major scene asset should call this after GLB instantiation.
export function addCollisionBox(
  scene: BABYLON.Scene,
  parent: BABYLON.TransformNode,
  radius: number,
  height: number,
  yOffset: number = 0
): BABYLON.Mesh {
  const box = BABYLON.MeshBuilder.CreateBox(
    `col_${parent.name}`,
    { width: radius * 2, depth: radius * 2, height },
    scene
  );
  box.parent = parent;
  box.position.y = yOffset + height / 2;
  box.isVisible = false;
  box.checkCollisions = true;
  box.isPickable = false;
  box.receiveShadows = false;
  return box;
}

// ─── PROCEDURAL TEXTURE GENERATORS ───────────────────────────────────

export function createGrassTexture(scene: BABYLON.Scene): BABYLON.DynamicTexture {
  const size = 256;
  const texture = new BABYLON.DynamicTexture("grassTex", size, scene, true);
  const ctx = texture.getContext();

  // Dark green base (updated to bright warm lime green for Hay Day aesthetic)
  ctx.fillStyle = "#a2e048";
  ctx.fillRect(0, 0, size, size);

  // Noise specks (updated to bright greens)
  for (let i = 0; i < 600; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = Math.random() > 0.5 ? "#b5f25c" : "#89c833";
    ctx.fillRect(x, y, 2 + Math.random() * 2, 2 + Math.random() * 2);
  }

  // Painterly clover shapes (updated to bright green)
  ctx.fillStyle = "#7cb92a";
  for (let i = 0; i < 60; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    ctx.beginPath();
    ctx.arc(cx - 3, cy, 4, 0, Math.PI * 2);
    ctx.arc(cx + 3, cy, 4, 0, Math.PI * 2);
    ctx.arc(cx, cy - 4, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  texture.update();
  texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.uScale = 8;
  texture.vScale = 8;
  return texture;
}

export function createSoilTexture(scene: BABYLON.Scene, theme: string): BABYLON.DynamicTexture {
  const size = 128;
  const texture = new BABYLON.DynamicTexture("soilTex", size, scene, true);
  const ctx = texture.getContext();

  // Wet organic brown base (brightened to warm terracotta/clay for Hay Day style)
  ctx.fillStyle = theme === 'gamma' ? "#2d241d" : "#7c5535";
  ctx.fillRect(0, 0, size, size);

  // Dirt particles (warm brown specks)
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = "#5c3d25";
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  // Little grey pebbles
  for (let i = 0; i < 15; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = "#5c646b";
    ctx.beginPath();
    ctx.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  texture.update();
  texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.uScale = 4;
  texture.vScale = 4;
  return texture;
}

export function createWoodTexture(scene: BABYLON.Scene): BABYLON.DynamicTexture {
  const size = 256;
  const texture = new BABYLON.DynamicTexture("woodTex", size, scene, true);
  const ctx = texture.getContext();

  ctx.fillStyle = "#8b5a2b"; // warm golden oak base
  ctx.fillRect(0, 0, size, size);

  // Wood grain lines
  ctx.fillStyle = "#6f421b";
  for (let i = 0; i < size; i += 6) {
    const offset = Math.sin(i * 0.05) * 15;
    ctx.fillRect(0, i + offset, size, 2);
  }

  // Knots
  for (let i = 0; i < 3; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    ctx.strokeStyle = "#5c3516";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  texture.update();
  return texture;
}

export function createStoneTexture(scene: BABYLON.Scene): BABYLON.DynamicTexture {
  const size = 256;
  const texture = new BABYLON.DynamicTexture("stoneTex", size, scene, true);
  const ctx = texture.getContext();

  ctx.fillStyle = "#7f8c8d";
  ctx.fillRect(0, 0, size, size);

  // Speckles
  for (let i = 0; i < 500; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = Math.random() > 0.5 ? "#95a5a6" : "#626f70";
    ctx.fillRect(x, y, 2, 2);
  }

  // Cracks
  ctx.strokeStyle = "#4d5656";
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, Math.random() * size);
    ctx.lineTo(Math.random() * size, Math.random() * size);
    ctx.stroke();
  }

  texture.update();
  return texture;
}

// ─── 3D PBR ASSET BUILDERS ───────────────────────────────────────────

export function buildTerrain(scene: BABYLON.Scene, theme: string, grassColorHex: string) {
  const terrainGroup = new BABYLON.TransformNode("terrainNode", scene);

  // 1. Outer Grass Plane
  const grass = BABYLON.MeshBuilder.CreatePlane("grass", { size: 45 }, scene);
  grass.rotation.x = Math.PI / 2;
  grass.position.y = -0.01;
  grass.receiveShadows = true;
  grass.parent = terrainGroup;

  const grassMat = new BABYLON.PBRMaterial("grassMat", scene);
  grassMat.albedoTexture = createGrassTexture(scene);
  grassMat.albedoColor = BABYLON.Color3.FromHexString(grassColorHex);
  grassMat.roughness = 0.95;
  grassMat.metallic = 0.05;
  grass.material = grassMat;

  // 2. Central Soil Bed
  const soil = BABYLON.MeshBuilder.CreatePlane("soil", { width: 13.5, height: 11.5 }, scene);
  soil.rotation.x = Math.PI / 2;
  soil.position.y = 0.005;
  soil.receiveShadows = true;
  soil.parent = terrainGroup;

  const soilMat = new BABYLON.PBRMaterial("soilMat", scene);
  soilMat.albedoTexture = createSoilTexture(scene, theme);
  soilMat.roughness = 0.98;
  soilMat.metallic = 0.01;
  soil.material = soilMat;

  return terrainGroup;
}

export function buildWell(scene: BABYLON.Scene, position: BABYLON.Vector3, crr: number = 1.25, projectName: string = '') {
  const details = {
    id: 'well-core',
    title: `${projectName ? `${projectName} ` : ''}Well Core`,
    elementType: 'Stone Well',
    description: `Represents the main repository branch. Well water health reflects the integration stability and build success of the workspace (${crr < 1.0 ? 'BLUE means healthy' : 'RED indicates warning state'}).`,
    crr: crr,
    status: crr < 1.0 ? 'Optimal' : 'Debt Warning'
  };

  // 1. Attempt GLB model instantiation (Water Fountain.glb)
  const glbRoot = instantiateGLBModel(scene, 'Water Fountain.glb', null, position, 0.7, 0, details);
  if (glbRoot) {
    glbRoot.metadata = { type: 'well', details };
    addCollisionBox(scene, glbRoot, 1.0, 1.8, 0); // fountain base + bowl
    return glbRoot;
  }

  const well = new BABYLON.TransformNode("well", scene);
  well.position = position;
  well.metadata = { type: 'well', details };

  const stoneTexture = createStoneTexture(scene);
  const woodTexture = createWoodTexture(scene);

  const stoneMat = new BABYLON.PBRMaterial("wellStoneMat", scene);
  stoneMat.albedoTexture = stoneTexture;
  stoneMat.roughness = 0.85;

  const woodMat = new BABYLON.PBRMaterial("wellWoodMat", scene);
  woodMat.albedoTexture = woodTexture;
  woodMat.roughness = 0.9;

  // 1. Stone Brick Circular Blocks Base
  const numRows = 3;
  const blockCount = 10;
  const radius = 0.85;
  const blockHeight = 0.24;

  for (let r = 0; r < numRows; r++) {
    const yOffset = r * (blockHeight + 0.01) + 0.12;
    const rowNode = new BABYLON.TransformNode(`wellRow_${r}`, scene);
    rowNode.parent = well;
    rowNode.position.y = yOffset;
    rowNode.rotation.y = (r * Math.PI) / 10;

    for (let i = 0; i < blockCount; i++) {
      const angle = (i * Math.PI * 2) / blockCount;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;

      const brick = BABYLON.MeshBuilder.CreateBox(`brick_${r}_${i}`, { width: 0.45, height: blockHeight, depth: 0.18 }, scene);
      brick.position.set(x, 0, z);
      brick.rotation.y = -angle;
      brick.material = stoneMat;
      brick.receiveShadows = true;
      brick.parent = rowNode;
      brick.metadata = { type: 'well', details };
    }
  }

  // 2. Well Rim Ring
  const rim = BABYLON.MeshBuilder.CreateTorus("wellRim", { diameter: 1.7, thickness: 0.15, tessellation: 24 }, scene);
  rim.position.y = 0.82;
  rim.rotation.x = Math.PI / 2;
  rim.material = stoneMat;
  rim.receiveShadows = true;
  rim.parent = well;
  rim.metadata = { type: 'well', details };

  // 3. Water Core (Shifts blue to red based on CRR)
  const water = BABYLON.MeshBuilder.CreateCylinder("wellWater", { diameter: 1.5, height: 0.1 }, scene);
  water.position.y = 0.65;
  water.parent = well;

  const waterMat = new BABYLON.PBRMaterial("wellWaterMat", scene);
  const healthyColor = new BABYLON.Color3(0.2, 0.6, 0.95);
  const warningColor = new BABYLON.Color3(0.9, 0.3, 0.2);
  const f = Math.min(Math.max((crr - 0.7) / 0.5, 0), 1);
  const waterColor = BABYLON.Color3.Lerp(healthyColor, warningColor, f);
  
  waterMat.albedoColor = waterColor;
  waterMat.emissiveColor = waterColor;
  waterMat.emissiveIntensity = 0.4;
  waterMat.roughness = 0.1;
  waterMat.metallic = 0.8;
  water.material = waterMat;
  water.metadata = { type: 'well', details };

  // 4. Wooden Support Pillars
  const pillarL = BABYLON.MeshBuilder.CreateCylinder("pillarL", { diameter: 0.08, height: 1.3 }, scene);
  pillarL.position.set(-0.68, 1.35, 0);
  pillarL.material = woodMat;
  pillarL.parent = well;
  pillarL.metadata = { type: 'well', details };

  const pillarR = BABYLON.MeshBuilder.CreateCylinder("pillarR", { diameter: 0.08, height: 1.3 }, scene);
  pillarR.position.set(0.68, 1.35, 0);
  pillarR.material = woodMat;
  pillarR.parent = well;
  pillarR.metadata = { type: 'well', details };

  // 5. Crossbar Beam
  const beam = BABYLON.MeshBuilder.CreateCylinder("crossBeam", { diameter: 0.07, height: 1.3 }, scene);
  beam.position.set(0, 1.88, 0);
  beam.rotation.z = Math.PI / 2;
  beam.material = woodMat;
  beam.parent = well;
  beam.metadata = { type: 'well', details };

  // 6. Well Roof (Square Pyramid)
  const roof = BABYLON.MeshBuilder.CreateCylinder("wellRoof", { 
    diameterTop: 0, 
    diameterBottom: 1.9, 
    height: 0.7, 
    tessellation: 4 
  }, scene);
  roof.position.set(0, 2.25, 0);
  roof.rotation.y = Math.PI / 4; // Align sides parallel to pillars
  
  const roofMat = new BABYLON.PBRMaterial("roofMat", scene);
  roofMat.albedoColor = new BABYLON.Color3(0.85, 0.45, 0.25); // bright warm terracotta roof
  roofMat.roughness = 0.85;
  roof.material = roofMat;
  roof.parent = well;
  roof.metadata = { type: 'well', details };

  return well;
}

export function buildFence(scene: BABYLON.Scene, position: BABYLON.Vector3) {
  const details = {
    id: `pillar-${Math.random().toString(36).substring(2, 7)}`,
    title: 'Garden Pillar (Sprint Boundary)',
    elementType: 'Garden Pillar',
    description: 'Boundary pillar representing workspace sprint and scope limits.'
  };

  const glbRoot = instantiateGLBModel(scene, 'Pillar.glb', null, position, 0.45, 0, details);
  if (glbRoot) {
    glbRoot.metadata = { type: 'border', details };
    addCollisionBox(scene, glbRoot, 0.22, 1.8, 0); // pillar shaft
    return glbRoot;
  }

  const fenceNode = new BABYLON.TransformNode("fence", scene);
  fenceNode.position = position;
  fenceNode.metadata = { type: 'border', details };

  const woodTexture = createWoodTexture(scene);
  const woodMat = new BABYLON.PBRMaterial("fenceWoodMat", scene);
  woodMat.albedoTexture = woodTexture;
  woodMat.roughness = 0.95;

  const whitePaintMat = new BABYLON.PBRMaterial("fencePaintMat", scene);
  whitePaintMat.albedoColor = new BABYLON.Color3(0.95, 0.95, 0.92);
  whitePaintMat.roughness = 0.9;

  // Posts
  const postL = BABYLON.MeshBuilder.CreateBox("postL", { width: 0.08, height: 0.72, depth: 0.08 }, scene);
  postL.position.set(-0.75, 0.36, 0);
  postL.material = woodMat;
  postL.parent = fenceNode;

  const postR = BABYLON.MeshBuilder.CreateBox("postR", { width: 0.08, height: 0.72, depth: 0.08 }, scene);
  postR.position.set(0.75, 0.36, 0);
  postR.material = woodMat;
  postR.parent = fenceNode;

  // Horizontal rails
  const railTop = BABYLON.MeshBuilder.CreateBox("railTop", { width: 1.5, height: 0.04, depth: 0.03 }, scene);
  railTop.position.set(0, 0.48, 0);
  railTop.material = woodMat;
  railTop.parent = fenceNode;

  const railBot = BABYLON.MeshBuilder.CreateBox("railBot", { width: 1.5, height: 0.04, depth: 0.03 }, scene);
  railBot.position.set(0, 0.18, 0);
  railBot.material = woodMat;
  railBot.parent = fenceNode;

  // Chunky Pickets with slight randomized angles for natural look
  const pickets = [-0.6, -0.3, 0, 0.3, 0.6];
  pickets.forEach((x, idx) => {
    const rot = Math.sin(x * 12) * 0.03;
    const picketGroup = new BABYLON.TransformNode(`picketGroup_${idx}`, scene);
    picketGroup.parent = fenceNode;
    picketGroup.position.set(x, 0.34, 0.015);
    picketGroup.rotation.z = rot;

    const picket = BABYLON.MeshBuilder.CreateBox(`picket_${idx}`, { width: 0.065, height: 0.6, depth: 0.02 }, scene);
    picket.material = whitePaintMat;
    picket.parent = picketGroup;

    // Pointed top hat
    const cap = BABYLON.MeshBuilder.CreateCylinder(`cap_${idx}`, { diameter: 0.046, height: 0.02, tessellation: 4 }, scene);
    cap.position.y = 0.31;
    cap.rotation.x = Math.PI / 2;
    cap.rotation.y = Math.PI / 4;
    cap.scaling.z = 0.1;
    cap.material = whitePaintMat;
    cap.parent = picketGroup;
  });

  return fenceNode;
}

export function buildLantern(scene: BABYLON.Scene, position: BABYLON.Vector3) {
  const details = {
    id: `lamp-${Math.random().toString(36).substring(2, 7)}`,
    title: 'Active Work Lamp Post',
    elementType: 'Active Lamp',
    description: 'Active lamp post glowing with emissive light representing in-progress task execution.'
  };

  const glbRoot = instantiateGLBModel(scene, 'Garden Lamp.glb', null, position, 0.45, 0, details);
  if (glbRoot) {
    glbRoot.metadata = { type: 'lamp', details };
    const light = new BABYLON.PointLight(`lampLight_${Math.random()}`, new BABYLON.Vector3(0, 0.8, 0), scene);
    light.parent = glbRoot;
    light.diffuse = new BABYLON.Color3(1, 0.82, 0.4);
    light.intensity = 1.0;
    light.range = 6;
    return glbRoot;
  }

  const lantern = new BABYLON.TransformNode("lantern", scene);
  lantern.position = position;
  lantern.metadata = { type: 'lamp', details };

  const metalMat = new BABYLON.PBRMaterial("lanternMetal", scene);
  metalMat.albedoColor = new BABYLON.Color3(0.18, 0.22, 0.25);
  metalMat.roughness = 0.55;

  const post = BABYLON.MeshBuilder.CreateBox("lPost", { width: 0.07, height: 0.9, depth: 0.07 }, scene);
  post.position.y = 0.45;
  post.material = metalMat;
  post.parent = lantern;

  const arm = BABYLON.MeshBuilder.CreateBox("lArm", { width: 0.16, height: 0.03, depth: 0.03 }, scene);
  arm.position.set(0.08, 0.85, 0);
  arm.material = metalMat;
  arm.parent = lantern;

  const cap = BABYLON.MeshBuilder.CreateCylinder("lCap", { diameterTop: 0.01, diameterBottom: 0.15, height: 0.06, tessellation: 8 }, scene);
  cap.position.set(0.16, 0.82, 0);
  cap.material = metalMat;
  cap.parent = lantern;

  const glowMat = new BABYLON.PBRMaterial("lGlow", scene);
  glowMat.albedoColor = new BABYLON.Color3(1, 0.8, 0.4);
  glowMat.emissiveColor = new BABYLON.Color3(1, 0.8, 0.3);
  glowMat.emissiveIntensity = 1.8;

  const bulb = BABYLON.MeshBuilder.CreateSphere("lBulb", { diameter: 0.05 }, scene);
  bulb.position.set(0.16, 0.74, 0);
  bulb.material = glowMat;
  bulb.parent = lantern;

  // Add Point Light inside lantern
  const light = new BABYLON.PointLight("lanternLight", new BABYLON.Vector3(0.16, 0.74, 0), scene);
  light.parent = lantern;
  light.diffuse = new BABYLON.Color3(1, 0.78, 0.45);
  light.intensity = 0.8;
  light.range = 5;

  return lantern;
}

export function buildWoodenBarrel(scene: BABYLON.Scene, position: BABYLON.Vector3) {
  const barrel = new BABYLON.TransformNode("barrel", scene);
  barrel.position = position;

  const woodTex = createWoodTexture(scene);
  const barrelWoodMat = new BABYLON.PBRMaterial("barrelWood", scene);
  barrelWoodMat.albedoTexture = woodTex;
  barrelWoodMat.roughness = 0.95;

  const ironMat = new BABYLON.PBRMaterial("barrelIron", scene);
  ironMat.albedoColor = new BABYLON.Color3(0.3, 0.33, 0.35);
  ironMat.metallic = 0.8;
  ironMat.roughness = 0.3;

  // Barrel Body
  const body = BABYLON.MeshBuilder.CreateCylinder("barrelBody", { diameterTop: 0.34, diameterBottom: 0.34, height: 0.5, tessellation: 12 }, scene);
  body.position.y = 0.25;
  body.material = barrelWoodMat;
  body.parent = barrel;

  // Bulgy rings around barrel to simulate curve
  const ringHeights = [0.08, 0.25, 0.42];
  ringHeights.forEach((y, idx) => {
    const widthFactor = y === 0.25 ? 0.38 : 0.35;
    const ring = BABYLON.MeshBuilder.CreateTorus(`ring_${idx}`, { diameter: widthFactor, thickness: 0.015, tessellation: 16 }, scene);
    ring.position.set(0, y, 0);
    ring.rotation.x = Math.PI / 2;
    ring.material = ironMat;
    ring.parent = body;
  });

  return barrel;
}

export function buildCropCrate(scene: BABYLON.Scene, position: BABYLON.Vector3) {
  const crate = new BABYLON.TransformNode("cropCrate", scene);
  crate.position = position;

  const crateMat = new BABYLON.PBRMaterial("crateMat", scene);
  crateMat.albedoColor = new BABYLON.Color3(0.55, 0.42, 0.3); // wood crate color
  crateMat.roughness = 0.95;

  const appleMat = new BABYLON.PBRMaterial("appleMat", scene);
  appleMat.albedoColor = new BABYLON.Color3(0.85, 0.2, 0.15); // rich red
  appleMat.roughness = 0.35;

  // Outer Crate Box
  const outer = BABYLON.MeshBuilder.CreateBox("crateBox", { width: 0.5, height: 0.2, depth: 0.4 }, scene);
  outer.position.y = 0.1;
  outer.material = crateMat;
  outer.parent = crate;

  // 3D Apple spheres piled inside
  const applePositions = [
    [-0.12, 0.16, -0.08], [0.12, 0.16, -0.08],
    [-0.12, 0.16, 0.08], [0.12, 0.16, 0.08],
    [0.0, 0.21, 0.0]
  ];
  applePositions.forEach((pos, idx) => {
    const apple = BABYLON.MeshBuilder.CreateSphere(`apple_${idx}`, { diameter: 0.11 }, scene);
    apple.position.set(pos[0], pos[1], pos[2]);
    apple.material = appleMat;
    apple.parent = crate;
  });

  return crate;
}

export function buildWildflower(scene: BABYLON.Scene, position: BABYLON.Vector3, colorHex: string, scale: number) {
  const details = {
    id: `wildflower-${Math.random().toString(36).substring(2, 8)}`,
    title: 'Wildflower (Dependency)',
    elementType: 'Wildflower',
    description: 'Represents external open-source dependencies and package imports powering this project.',
    progress: 1.0,
    complexity: 0.1,
    risk: 0.05
  };

  const flowerFile = Math.random() > 0.4 ? 'Flowers.glb' : 'Flower Pot.glb';
  const glbRoot = instantiateGLBModel(scene, flowerFile, null, position, scale * 0.12, 0, details);
  if (glbRoot) {
    glbRoot.metadata = { type: 'wildflower', details };
    return glbRoot;
  }

  const flower = new BABYLON.TransformNode("wildflower", scene);
  flower.position = position;
  flower.scaling.set(scale * 0.15, scale * 0.15, scale * 0.15);
  flower.metadata = { type: 'wildflower', details };

  const centerMat = new BABYLON.PBRMaterial("flowerCenter", scene);
  centerMat.albedoColor = new BABYLON.Color3(1, 0.78, 0.12);
  centerMat.roughness = 0.6;

  const petalMat = new BABYLON.PBRMaterial("flowerPetals", scene);
  petalMat.albedoColor = BABYLON.Color3.FromHexString(colorHex);
  petalMat.roughness = 0.85;

  const stemMat = new BABYLON.PBRMaterial("flowerStemMat", scene);
  stemMat.albedoColor = new BABYLON.Color3(0.2, 0.6, 0.25);
  stemMat.roughness = 0.9;

  // 1. 3D Vertical Green Stem
  const stem = BABYLON.MeshBuilder.CreateCylinder("fStem", { diameter: 0.03, height: 0.25 }, scene);
  stem.position.y = 0.125;
  stem.material = stemMat;
  stem.parent = flower;
  stem.metadata = { type: 'wildflower', details };
  stem.isPickable = true;

  // Small Green Leaves on Stem
  for (let l = 0; l < 2; l++) {
    const leaf = BABYLON.MeshBuilder.CreateBox(`fStemLeaf_${l}`, { width: 0.02, height: 0.08, depth: 0.04 }, scene);
    leaf.position.set(l === 0 ? 0.03 : -0.03, 0.1 + l * 0.05, 0);
    leaf.rotation.z = l === 0 ? -0.5 : 0.5;
    leaf.material = stemMat;
    leaf.parent = flower;
    leaf.metadata = { type: 'wildflower', details };
    leaf.isPickable = true;
  }

  // 2. Sepal Base Cup
  const sepal = BABYLON.MeshBuilder.CreateCylinder("fSepal", { diameterTop: 0.08, diameterBottom: 0.03, height: 0.04 }, scene);
  sepal.position.y = 0.24;
  sepal.material = stemMat;
  sepal.parent = flower;
  sepal.metadata = { type: 'wildflower', details };
  sepal.isPickable = true;

  // 3. Center sphere
  const center = BABYLON.MeshBuilder.CreateSphere("fCenter", { diameter: 0.15 }, scene);
  center.position.y = 0.28;
  center.material = centerMat;
  center.parent = flower;
  center.metadata = { type: 'wildflower', details };
  center.isPickable = true;

  // 4. 5 Petals arranged in circle
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5;
    const x = Math.sin(angle) * 0.12;
    const z = Math.cos(angle) * 0.12;

    const petal = BABYLON.MeshBuilder.CreateSphere(`petal_${i}`, { diameter: 0.15 }, scene);
    petal.position.set(x, 0.27, z);
    petal.scaling.set(1.4, 0.4, 1.4);
    petal.material = petalMat;
    petal.parent = flower;
    petal.metadata = { type: 'wildflower', details };
    petal.isPickable = true;
  }

  return flower;
}

// ─── 4. HIGH-FIDELITY ORGANIC GEOMETRY CREATORS ──────────────────────
export function buildGnome(scene: BABYLON.Scene, position: BABYLON.Vector3, hatColorHex: string, name: string, role: string) {
  const details = {
    id: `gnome-${name.toLowerCase().replace(/\s+/g, '-')}`,
    title: name,
    elementType: 'Garden Gnome',
    description: role,
    status: 'Active Pathfinding',
    role
  };

  // 1. Attempt GLB model instantiation (Statue.glb / Statue-0Mkdl3SJDT.glb)
  const statueFile = role.includes('Worker') ? 'Statue.glb' : role.includes('Critic') ? 'Statue-0Mkdl3SJDT.glb' : 'Statue-JXmywADgSk.glb';
  const glbRoot = instantiateGLBModel(scene, statueFile, null, position, 0.8, 0, details);
  if (glbRoot) {
    glbRoot.metadata = { type: 'gnome', details };
    // Narrow cylinder-like collision box — gnomes are ~0.35 wide and ~1.4 tall
    addCollisionBox(scene, glbRoot, 0.35, 1.4, 0);
    // Auto-grounding in instantiateGLBModel handles bottom alignment — no extra offset needed
    return glbRoot;
  }

  const gnome = new BABYLON.TransformNode("gnome", scene);
  gnome.position = position.clone();
  gnome.position.y += 0.15;
  gnome.scaling.set(1.4, 1.4, 1.4);
  gnome.metadata = { type: 'gnome', details };

  // Material setup
  const hatMat = new BABYLON.PBRMaterial("gnomeHat", scene);
  hatMat.albedoColor = BABYLON.Color3.FromHexString(hatColorHex);
  hatMat.roughness = 0.85;

  const faceMat = new BABYLON.PBRMaterial("gnomeFace", scene);
  faceMat.albedoColor = new BABYLON.Color3(1, 0.85, 0.72); // peach face
  faceMat.roughness = 0.75;

  const beardMat = new BABYLON.PBRMaterial("gnomeBeard", scene);
  beardMat.albedoColor = new BABYLON.Color3(0.95, 0.95, 0.95);
  beardMat.roughness = 0.95;

  const clothingMat = new BABYLON.PBRMaterial("gnomeCoat", scene);
  clothingMat.albedoColor = new BABYLON.Color3(0.18, 0.35, 0.65); // deep blue coat
  clothingMat.roughness = 0.9;

  const bootMat = new BABYLON.PBRMaterial("gnomeBoots", scene);
  bootMat.albedoColor = new BABYLON.Color3(0.15, 0.15, 0.15); // dark grey
  bootMat.roughness = 0.3;

  // 1. Body/Coat
  const coat = BABYLON.MeshBuilder.CreateCylinder("gnomeCoat", { diameterTop: 0.06, diameterBottom: 0.16, height: 0.22 }, scene);
  coat.position.y = 0.11;
  coat.material = clothingMat;
  coat.parent = gnome;
  coat.metadata = { type: 'gnome', details };
  coat.isPickable = true;

  // 2. Face
  const face = BABYLON.MeshBuilder.CreateSphere("gnomeFace", { diameter: 0.1 }, scene);
  face.position.set(0, 0.23, 0.01);
  face.material = faceMat;
  face.parent = gnome;
  face.metadata = { type: 'gnome', details };
  face.isPickable = true;

  // 3. Nose
  const nose = BABYLON.MeshBuilder.CreateSphere("gnomeNose", { diameter: 0.026 }, scene);
  nose.position.set(0, 0.225, 0.06);
  nose.material = faceMat;
  nose.parent = gnome;
  nose.metadata = { type: 'gnome', details };
  nose.isPickable = true;

  // 4. Beard (Compound fluffy sphere cluster instead of a flat shape)
  const beardRoot = new BABYLON.TransformNode("beardRoot", scene);
  beardRoot.parent = gnome;
  beardRoot.metadata = { type: 'gnome', details };

  const beardPoints = [
    [0.0, 0.18, 0.05, 0.06],
    [-0.04, 0.19, 0.04, 0.045], [0.04, 0.19, 0.04, 0.045],
    [-0.02, 0.15, 0.035, 0.04], [0.02, 0.15, 0.035, 0.04]
  ];
  beardPoints.forEach((pt, idx) => {
    const puff = BABYLON.MeshBuilder.CreateSphere(`beard_puff_${idx}`, { diameter: pt[3] }, scene);
    puff.position.set(pt[0], pt[1], pt[2]);
    puff.material = beardMat;
    puff.parent = beardRoot;
    puff.metadata = { type: 'gnome', details };
    puff.isPickable = true;
  });

  // 5. Tall Pointed Gnome Hat (Slanted slightly backward for personality)
  const hat = BABYLON.MeshBuilder.CreateCylinder("gnomeHat", { diameterTop: 0.01, diameterBottom: 0.11, height: 0.28 }, scene);
  hat.position.set(0, 0.35, -0.02);
  hat.rotation.x = -0.15;
  hat.material = hatMat;
  hat.parent = gnome;
  hat.metadata = { type: 'gnome', details };
  hat.isPickable = true;

  // 6. Black boots
  const bootL = BABYLON.MeshBuilder.CreateBox("bootL", { width: 0.04, height: 0.04, depth: 0.08 }, scene);
  bootL.position.set(-0.045, 0.02, 0.02);
  bootL.material = bootMat;
  bootL.parent = gnome;
  bootL.metadata = { type: 'gnome', details };
  bootL.isPickable = true;

  const bootR = BABYLON.MeshBuilder.CreateBox("bootR", { width: 0.04, height: 0.04, depth: 0.08 }, scene);
  bootR.position.set(0.045, 0.02, 0.02);
  bootR.material = bootMat;
  bootR.parent = gnome;
  bootR.metadata = { type: 'gnome', details };
  bootR.isPickable = true;

  return gnome;
}

export function buildRoseBush(scene: BABYLON.Scene, position: BABYLON.Vector3, status: string, node?: any) {
  const details = node;
  const flowerBedFile = status.toLowerCase() === 'approved' || status.toLowerCase() === 'done'
    ? 'Flower Bed.glb'
    : status.toLowerCase() === 'under review' || status.toLowerCase() === 'pending'
      ? 'Flower Bed-dM9hXXth1I.glb'
      : 'Flower Bed-eUCvK3Oq9z.glb';

  const glbRoot = instantiateGLBModel(scene, flowerBedFile, null, position, 0.4, 0, details);
  if (glbRoot) {
    glbRoot.metadata = { type: 'pr', details };
    addCollisionBox(scene, glbRoot, 0.7, 0.6, 0); // flower bed footprint
    return glbRoot;
  }

  const bushNode = new BABYLON.TransformNode("roseBush", scene);
  bushNode.position = position;
  bushNode.metadata = { type: 'pr', details };

  // Determine colors based on PR status
  const s = status.toLowerCase();
  let baseColor = new BABYLON.Color3(0.18, 0.65, 0.32); // approved/default healthy green
  let bloomColor = new BABYLON.Color3(0.9, 0.15, 0.15); // red roses
  let bloomCount = 4;

  if (s === 'under review' || s === 'pending') {
    baseColor = new BABYLON.Color3(0.9, 0.72, 0.12); // golden/amber
    bloomColor = new BABYLON.Color3(0.95, 0.55, 0.1); // orange blossoms
    bloomCount = 2;
  } else if (s === 'draft') {
    baseColor = new BABYLON.Color3(0.55, 0.6, 0.62); // dormant grey-green
    bloomCount = 0;
  }

  const foliageMat = new BABYLON.PBRMaterial("bushFoliage", scene);
  foliageMat.albedoColor = baseColor;
  foliageMat.roughness = 0.95;

  const potMat = new BABYLON.PBRMaterial("bushPot", scene);
  potMat.albedoColor = new BABYLON.Color3(0.65, 0.38, 0.22); // terracotta pot
  potMat.roughness = 0.9;

  // 1. Terracotta Pot Base
  const pot = BABYLON.MeshBuilder.CreateCylinder("bushPot", { diameterTop: 0.22, diameterBottom: 0.16, height: 0.16 }, scene);
  pot.position.y = 0.08;
  pot.material = potMat;
  pot.parent = bushNode;
  pot.metadata = { type: 'pr', details };

  // 2. High-Fidelity Multi-Cluster Organic Canopy (Overlap noise spheres)
  const canopy = new BABYLON.TransformNode("bushCanopy", scene);
  canopy.parent = bushNode;

  const clusters = [
    { pos: [0, 0.34, 0], scale: 0.38 },
    { pos: [0.12, 0.42, -0.06], scale: 0.28 },
    { pos: [-0.12, 0.4, 0.06], scale: 0.26 },
    { pos: [0.08, 0.28, 0.1], scale: 0.24 },
    { pos: [-0.08, 0.28, -0.1], scale: 0.22 }
  ];

  clusters.forEach((c, idx) => {
    // Subdivided sphere for organic displacement
    const sphere = BABYLON.MeshBuilder.CreateSphere(`foliage_${idx}`, { diameter: c.scale * 2, segments: 16 }, scene);
    sphere.position.set(c.pos[0], c.pos[1], c.pos[2]);
    sphere.material = foliageMat;
    sphere.receiveShadows = true;
    sphere.parent = canopy;
    sphere.metadata = { type: 'pr', details };

    // Add 3D Dewdrop Glass Droplet on bush foliage leaves
    if (idx < 3) {
      buildDewdrop(scene, sphere, new BABYLON.Vector3(0, c.scale * 0.9, 0), 0.85);
    }

    // Apply simple vertex noise for organic roughness
    const positions = sphere.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    if (positions) {
      for (let p = 0; p < positions.length; p += 3) {
        const x = positions[p];
        const y = positions[p + 1];
        const z = positions[p + 2];
        const offset = Math.sin(x * 15 + y * 12 + z * 18) * 0.035;
        positions[p] += x * offset;
        positions[p + 1] += y * offset;
        positions[p + 2] += z * offset;
      }
      sphere.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
      // Recalculate normals
      const indices = sphere.getIndices();
      const normals: number[] = [];
      BABYLON.VertexData.ComputeNormals(positions, indices, normals);
      sphere.setVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
    }
  });

  // 3. 3D Procedural Blooms
  const bloomMat = new BABYLON.PBRMaterial("bushBloom", scene);
  bloomMat.albedoColor = bloomColor;
  bloomMat.roughness = 0.5;

  const bloomPositions = [
    [0.12, 0.48, 0.12], [-0.14, 0.42, 0.15],
    [0.02, 0.54, -0.08], [-0.08, 0.35, -0.14]
  ];

  for (let i = 0; i < bloomCount; i++) {
    const pos = bloomPositions[i % bloomPositions.length];
    const flower = BABYLON.MeshBuilder.CreateSphere(`bloom_${i}`, { diameter: 0.09 }, scene);
    flower.position.set(pos[0], pos[1], pos[2]);
    flower.scaling.set(1.2, 0.5, 1.2);
    flower.material = bloomMat;
    flower.parent = bushNode;
    flower.metadata = { type: 'pr', details };
  }

  return bushNode;
}

export function buildWeed(scene: BABYLON.Scene, position: BABYLON.Vector3, status: string, node?: any) {
  const details = node;
  const rockFile = status.toLowerCase() === 'backlog'
    ? 'Rock-UkxWNmiFFj.glb'
    : status.toLowerCase() === 'blocked'
      ? 'Japanese Sedge.glb'
      : 'Rock.glb';

  const glbRoot = instantiateGLBModel(scene, rockFile, null, position, 0.45, 0, details);
  if (glbRoot) {
    glbRoot.metadata = { type: 'issue', details };
    addCollisionBox(scene, glbRoot, 0.55, 0.5, 0); // rock/sedge footprint
    return glbRoot;
  }

  const weedNode = new BABYLON.TransformNode("weed", scene);
  weedNode.position = position;
  weedNode.metadata = { type: 'issue', details };

  const s = status.toLowerCase();
  const baseColor = s === 'backlog' ? new BABYLON.Color3(0.55, 0.52, 0.48) : new BABYLON.Color3(0.85, 0.25, 0.15); // dry grey vs active red

  const weedMat = new BABYLON.PBRMaterial("weedMat", scene);
  weedMat.albedoColor = baseColor;
  weedMat.roughness = 0.85;

  // Generate a rosette of spiky leafy planes using thin box elements rotated outward
  const leafCount = 6;
  for (let i = 0; i < leafCount; i++) {
    const angle = (i * Math.PI * 2) / leafCount;
    const leaf = BABYLON.MeshBuilder.CreateBox(`leaf_${i}`, { width: 0.05, height: 0.35, depth: 0.16 }, scene);
    leaf.position.y = 0.14;
    leaf.rotation.set(0.4, angle, 0.3); // rotate and tilt outward
    leaf.material = weedMat;
    leaf.parent = weedNode;
    leaf.metadata = { type: 'issue', details };

    // Tweak vertices to taper leaf tips
    const positions = leaf.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    if (positions) {
      for (let p = 0; p < positions.length; p += 3) {
        // Taper upper vertices (where y is high) to a point
        if (positions[p + 1] > 0.1) {
          positions[p] *= 0.1;
          positions[p + 2] *= 0.1;
        }
      }
      leaf.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
    }
  }

  // Small central spike
  const centerSpike = BABYLON.MeshBuilder.CreateCylinder("centerSpike", { diameterTop: 0.01, diameterBottom: 0.08, height: 0.4 }, scene);
  centerSpike.position.y = 0.18;
  centerSpike.material = weedMat;
  centerSpike.parent = weedNode;
  centerSpike.metadata = { type: 'issue', details };

  return weedNode;
}

export function buildCrop(scene: BABYLON.Scene, position: BABYLON.Vector3, type: 'corn' | 'cabbage' | 'carrot') {
  const crop = new BABYLON.TransformNode("crop", scene);
  crop.position = position;

  if (type === 'corn') {
    const stalkMat = new BABYLON.PBRMaterial("stalkMat", scene);
    stalkMat.albedoColor = new BABYLON.Color3(0.24, 0.52, 0.18);
    stalkMat.roughness = 0.85;

    const cornMat = new BABYLON.PBRMaterial("cornMat", scene);
    cornMat.albedoColor = new BABYLON.Color3(0.95, 0.8, 0.12); // yellow
    cornMat.roughness = 0.4;

    // Stalk
    const stalk = BABYLON.MeshBuilder.CreateCylinder("stalk", { diameterTop: 0.02, diameterBottom: 0.038, height: 0.72 }, scene);
    stalk.position.y = 0.36;
    stalk.material = stalkMat;
    stalk.parent = crop;

    // Leaves
    for (let i = 0; i < 3; i++) {
      const angle = i * Math.PI * 0.7;
      const leaf = BABYLON.MeshBuilder.CreateBox(`cornLeaf_${i}`, { width: 0.01, height: 0.22, depth: 0.04 }, scene);
      leaf.position.set(Math.sin(angle) * 0.05, 0.3 + i * 0.12, Math.cos(angle) * 0.05);
      leaf.rotation.set(0.6, angle, 0.4);
      leaf.material = stalkMat;
      leaf.parent = crop;
    }

    // Yellow Cob
    const cob = BABYLON.MeshBuilder.CreateSphere("cornCob", { diameter: 0.12 }, scene);
    cob.position.set(0.05, 0.36, 0.03);
    cob.scaling.set(0.6, 1.6, 0.6);
    cob.material = cornMat;
    cob.parent = crop;

  } else if (type === 'cabbage') {
    const cabMatOuter = new BABYLON.PBRMaterial("cabMatOuter", scene);
    cabMatOuter.albedoColor = new BABYLON.Color3(0.12, 0.36, 0.16);
    cabMatOuter.roughness = 0.95;

    const cabMatInner = new BABYLON.PBRMaterial("cabMatInner", scene);
    cabMatInner.albedoColor = new BABYLON.Color3(0.55, 0.85, 0.58);
    cabMatInner.roughness = 0.85;

    // Outer leaves (compound sphere deformation)
    const numLeaves = 5;
    for (let i = 0; i < numLeaves; i++) {
      const angle = (i * Math.PI * 2) / numLeaves;
      const leaf = BABYLON.MeshBuilder.CreateSphere(`cabLeaf_${i}`, { diameter: 0.22 }, scene);
      leaf.position.set(Math.sin(angle) * 0.04, 0.08, Math.cos(angle) * 0.04);
      leaf.scaling.set(1.3, 0.5, 1.3);
      leaf.rotation.set(0.2, angle, 0.1);
      leaf.material = cabMatOuter;
      leaf.parent = crop;
    }

    // Inner core
    const core = BABYLON.MeshBuilder.CreateSphere("cabCore", { diameter: 0.18 }, scene);
    core.position.y = 0.11;
    core.material = cabMatInner;
    core.parent = crop;

  } else if (type === 'carrot') {
    const carrotMat = new BABYLON.PBRMaterial("carrotRootMat", scene);
    carrotMat.albedoColor = new BABYLON.Color3(0.9, 0.45, 0.1); // orange
    carrotMat.roughness = 0.7;

    const topMat = new BABYLON.PBRMaterial("carrotTopMat", scene);
    topMat.albedoColor = new BABYLON.Color3(0.18, 0.6, 0.28);
    topMat.roughness = 0.9;

    // Root (sticking out slightly)
    const root = BABYLON.MeshBuilder.CreateCylinder("carrotRoot", { diameterTop: 0.09, diameterBottom: 0.01, height: 0.2 }, scene);
    root.position.y = 0.06;
    root.rotation.x = Math.PI; // pointy side down
    root.material = carrotMat;
    root.parent = crop;

    // Tops
    const tops = BABYLON.MeshBuilder.CreateSphere("carrotTop", { diameter: 0.09 }, scene);
    tops.position.y = 0.17;
    tops.scaling.set(0.8, 1.5, 0.8);
    tops.material = topMat;
    tops.parent = crop;
  }

  return crop;
}

export function buildDewdrop(scene: BABYLON.Scene, parent: BABYLON.Node, position: BABYLON.Vector3, scale = 1.0) {
  const dewdrop = BABYLON.MeshBuilder.CreateSphere("dewdrop", { diameter: 0.09 * scale, segments: 12 }, scene);
  dewdrop.position = position;
  dewdrop.scaling.set(1.0, 0.65, 1.0);
  dewdrop.parent = parent;
  
  const glassMat = new BABYLON.PBRMaterial("dewdropGlassMat", scene);
  glassMat.albedoColor = new BABYLON.Color3(0.9, 0.96, 1.0);
  glassMat.emissiveColor = new BABYLON.Color3(0.4, 0.75, 1.0);
  glassMat.emissiveIntensity = 0.5;
  glassMat.roughness = 0.05;
  glassMat.metallic = 0.95;
  dewdrop.material = glassMat;
  dewdrop.name = "dewdropMesh";
  return dewdrop;
}

export function buildTree(scene: BABYLON.Scene, position: BABYLON.Vector3, node: any, _theme?: string) {
  const details = node;
  const treeFile = node.title && node.title.toLowerCase().includes('pr') ? 'Bonsai.glb' : 'Tree.glb';

  const glbRoot = instantiateGLBModel(scene, treeFile, null, position, 0.7, 0, details);
  if (glbRoot) {
    glbRoot.metadata = { type: 'epic', details };
    addCollisionBox(scene, glbRoot, 0.3, 3.5, 0); // trunk collision — stops camera/gnomes walking through trunk

    // NOTE: Subtask child sockets (Rock.glb / Flower Bed.glb) are NOT instantiated here
    // on the tree canopy, because:
    // 1. They were parented at canopy height (y=1.4+), creating 'floating rocks'
    // 2. The same subtask data is already represented at ground level as PR flower beds
    //    and issue rocks by the main gardenElements layout in DataTreeGardenBabylon.tsx
    // 3. Parented GLB models skip auto-grounding, and bought assets have varying origins

    return glbRoot;
  }

  const tree = new BABYLON.TransformNode("tree", scene);
  tree.position = position;
  tree.metadata = { type: 'epic', details };

  const trunkMat = new BABYLON.PBRMaterial("trunkMat", scene);
  trunkMat.albedoColor = new BABYLON.Color3(0.28, 0.18, 0.12);
  trunkMat.roughness = 0.95;

  // 1. Central Trunk Base
  const trunkHeight = 1.8;
  const trunkRadius = 0.22;
  const trunk = BABYLON.MeshBuilder.CreateCylinder("treeTrunk", { 
    diameterTop: trunkRadius * 0.75 * 2, 
    diameterBottom: trunkRadius * 2, 
    height: trunkHeight, 
    tessellation: 12 
  }, scene);
  trunk.position.y = trunkHeight / 2;
  trunk.material = trunkMat;
  trunk.receiveShadows = true;
  trunk.parent = tree;
  trunk.metadata = { type: 'epic', details };
  trunk.isPickable = true;

  // Organic gnarled deformation on trunk
  const trunkPos = trunk.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  if (trunkPos) {
    for (let p = 0; p < trunkPos.length; p += 3) {
      const y = trunkPos[p + 1];
      const offset = Math.sin(y * 6) * 0.025;
      trunkPos[p] += offset;
    }
    trunk.setVerticesData(BABYLON.VertexBuffer.PositionKind, trunkPos);
  }

  // 2. Child Issues as Dedicated Branches
  const subtasks: any[] = node.subtasks || [];
  const branchCount = Math.max(subtasks.length, 3);
  const mainTipNode = new BABYLON.TransformNode("mainTipNode", scene);
  mainTipNode.position.y = trunkHeight;
  mainTipNode.parent = tree;

  subtasks.forEach((subtask: any, idx: number) => {
    const angle = (idx / branchCount) * Math.PI * 2 + (idx * 0.4);
    const zRot = 0.45 + (idx % 2 === 0 ? 0.1 : -0.1);
    const branchLength = 1.1 + (subtask.complexity || 2) * 0.15;
    const branchRadius = 0.08;

    const bNode = new BABYLON.TransformNode(`issueBranch_${idx}`, scene);
    bNode.parent = mainTipNode;
    bNode.rotation.y = angle;
    bNode.rotation.z = zRot;

    // Issue / Subtask Details for Mouseover
    const branchDetails = {
      ...subtask,
      title: `${subtask.title || subtask.name || 'Child Issue'} (Epic Subtask)`,
      description: `Issue within epic ${node.title}. Status: ${subtask.status || 'Active'}. Progress: ${Math.round((subtask.progress || 0.5) * 100)}%`,
    };

    // Branch cylinder representing issue
    const branch = BABYLON.MeshBuilder.CreateCylinder(`subtaskBranchMesh_${idx}`, {
      diameterTop: branchRadius * 0.5,
      diameterBottom: branchRadius,
      height: branchLength,
      tessellation: 8
    }, scene);
    branch.position.y = branchLength / 2;
    branch.material = trunkMat;
    branch.receiveShadows = true;
    branch.parent = bNode;
    branch.isPickable = true;
    branch.metadata = { type: 'issue', details: branchDetails };

    // Branch Tip Foliage Cluster
    const tipNode = new BABYLON.TransformNode(`branchTip_${idx}`, scene);
    tipNode.position.y = branchLength;
    tipNode.parent = bNode;

    // Foliage Color based on child issue progress & status
    const prog = subtask.progress ?? 0.5;
    let leafColor = new BABYLON.Color3(0.18, 0.72, 0.28); // healthy vibrant green
    if (prog < 0.4) leafColor = new BABYLON.Color3(0.85, 0.25, 0.18); // active bug/risk red
    else if (prog < 0.8) leafColor = new BABYLON.Color3(0.9, 0.7, 0.15); // amber in-progress

    const branchLeafMat = new BABYLON.PBRMaterial(`branchLeafMat_${idx}`, scene);
    branchLeafMat.albedoColor = leafColor;
    branchLeafMat.roughness = 0.65;
    branchLeafMat.emissiveColor = leafColor;
    branchLeafMat.emissiveIntensity = 0.06;

    const foliageScale = 0.45 + prog * 0.35;
    const puffCount = 3;
    for (let pf = 0; pf < puffCount; pf++) {
      const pAngle = (pf / puffCount) * Math.PI * 2;
      const puff = BABYLON.MeshBuilder.CreateSphere(`canopy_puff_${idx}_${pf}`, { diameter: foliageScale, segments: 12 }, scene);
      puff.position.set(Math.sin(pAngle) * 0.12, pf * 0.1, Math.cos(pAngle) * 0.12);
      puff.material = branchLeafMat;
      puff.receiveShadows = true;
      puff.parent = tipNode;
      puff.metadata = { type: 'issue', details: branchDetails };
      puff.isPickable = true;

      // 3D Leaf shapes around canopy puff
      for (let lf = 0; lf < 4; lf++) {
        const lAngle = (lf / 4) * Math.PI * 2;
        const leafBlade = BABYLON.MeshBuilder.CreateSphere(`leafBlade_${idx}_${pf}_${lf}`, { diameter: 0.1 }, scene);
        leafBlade.position.set(Math.sin(lAngle) * (foliageScale * 0.55), 0, Math.cos(lAngle) * (foliageScale * 0.55));
        leafBlade.scaling.set(1.4, 0.2, 0.6);
        leafBlade.rotation.set(0.3, lAngle, 0.2);
        leafBlade.material = branchLeafMat;
        leafBlade.parent = puff;
        leafBlade.metadata = { type: 'issue', details: branchDetails };
        leafBlade.isPickable = true;
      }

      // Add 3D Dewdrop Glass Water Droplet resting on leaves
      buildDewdrop(scene, puff, new BABYLON.Vector3(0.05, foliageScale * 0.45, 0.05), 1.0);
    }

    // Deliverable Fruit on resolved branches
    if (prog > 0.7) {
      const fruitMat = new BABYLON.PBRMaterial(`branchFruitMat_${idx}`, scene);
      fruitMat.albedoColor = new BABYLON.Color3(0.95, 0.3, 0.15);
      fruitMat.roughness = 0.2;

      const fruit = BABYLON.MeshBuilder.CreateSphere(`branchFruit_${idx}`, { diameter: 0.12 }, scene);
      fruit.position.set(0, -0.15, 0.1);
      fruit.material = fruitMat;
      fruit.parent = tipNode;
      fruit.metadata = { type: 'issue', details: branchDetails };
      fruit.isPickable = true;
    }
  });

  // Central Top Canopy Puff
  const centralCanopy = BABYLON.MeshBuilder.CreateSphere("centralCanopy", { diameter: 0.95, segments: 16 }, scene);
  centralCanopy.position.y = trunkHeight + 0.3;
  const centralLeafMat = new BABYLON.PBRMaterial("centralLeafMat", scene);
  centralLeafMat.albedoColor = new BABYLON.Color3(0.16, 0.65, 0.26); // rich green
  centralLeafMat.roughness = 0.65;
  centralCanopy.material = centralLeafMat;
  centralCanopy.parent = tree;
  centralCanopy.metadata = { type: 'epic', details };
  centralCanopy.isPickable = true;

  // Add dewdrops to central canopy
  buildDewdrop(scene, centralCanopy, new BABYLON.Vector3(0.15, 0.42, 0.1), 1.2);
  buildDewdrop(scene, centralCanopy, new BABYLON.Vector3(-0.2, 0.38, -0.15), 1.0);

  return tree;
}

// ─── DECORATIVE SCATTER FOLIAGE ──────────────────────────────────────
// Adds green foliage props around the garden to make it feel lush and alive.
// Uses Bamboo, Japanese Sedge, and extra Flower Pot/Bed GLBs from the asset pack.
export function buildScatterFoliage(scene: BABYLON.Scene) {
  const foliageGroup = new BABYLON.TransformNode("scatterFoliage", scene);

  const foliageDetails = (name: string, desc: string) => ({
    id: `foliage-${Math.random().toString(36).substring(2, 7)}`,
    title: name,
    elementType: 'Garden Foliage',
    description: desc,
  });

  // ── Corner Bamboo Clusters (4 corners, inside fence line) ──
  const bambooPositions: [number, number, number][] = [
    [-6.0, 0, -5.8],
    [ 6.0, 0, -5.8],
    [-6.0, 0,  5.8],
    [ 6.0, 0,  5.8],
  ];
  bambooPositions.forEach((pos, i) => {
    const details = foliageDetails('Bamboo Cluster', 'Decorative bamboo adding lush greenery to the garden boundary.');
    const node = instantiateGLBModel(scene, 'Bamboo.glb', foliageGroup, new BABYLON.Vector3(pos[0], pos[1], pos[2]), 0.35, (i * 1.2), details);
    if (node) {
      node.metadata = { type: 'foliage', details };
    }
  });

  // ── Edge Sedge Patches (along fence midpoints and inner edges) ──
  const sedgePositions: [number, number, number, number][] = [
    // [x, y, z, rotationY]
    [-3.0, 0, -6.0, 0.3],
    [ 0.0, 0, -6.0, 1.1],
    [ 3.0, 0, -6.0, 2.0],
    [-3.0, 0,  6.0, 0.8],
    [ 0.0, 0,  6.0, 1.6],
    [ 3.0, 0,  6.0, 2.4],
    // Inner edge accent patches
    [-6.2, 0, -3.0, 0.5],
    [-6.2, 0,  0.0, 1.0],
    [-6.2, 0,  3.0, 1.8],
    [ 6.2, 0, -3.0, 0.7],
    [ 6.2, 0,  0.0, 1.4],
    [ 6.2, 0,  3.0, 2.2],
  ];
  sedgePositions.forEach((pos) => {
    const details = foliageDetails('Ornamental Sedge', 'Decorative grass adding natural green texture to the garden floor.');
    const node = instantiateGLBModel(scene, 'Japanese Sedge.glb', foliageGroup, new BABYLON.Vector3(pos[0], pos[1], pos[2]), 0.25, pos[3], details);
    if (node) {
      node.metadata = { type: 'foliage', details };
    }
  });

  // ── Mid-zone Flower Pot Accents ──
  const potVariants = [
    'Flower Pot-FNqGPLKY0V.glb',
    'Flower Pot-Kgt363WkKd.glb',
    'Flower Pot-k1FsCQTgWu.glb',
  ];
  const potPositions: [number, number, number][] = [
    [-1.0, 0,  4.8],
    [ 1.0, 0,  4.8],
    [-4.8, 0,  1.5],
    [ 4.8, 0,  1.5],
    [ 0.0, 0, -4.8],
    [-1.5, 0,  2.8],
    [ 1.5, 0,  2.8],
  ];
  potPositions.forEach((pos, i) => {
    const glbFile = potVariants[i % potVariants.length];
    const details = foliageDetails('Flower Pot', 'Decorative potted flowers adorning the garden pathways.');
    const node = instantiateGLBModel(scene, glbFile, foliageGroup, new BABYLON.Vector3(pos[0], pos[1], pos[2]), 0.18, (i * 0.9), details);
    if (node) {
      node.metadata = { type: 'foliage', details };
    }
  });

  // ── Extra Flower Bed Accents (non-data-driven decorative beds) ──
  const bedVariants = [
    'Flower Bed-kxvm53IIIU.glb',
    'Flower Bed-wibWtE6p8L.glb',
  ];
  const bedPositions: [number, number, number][] = [
    [-4.5, 0,  3.8],
    [ 4.5, 0,  3.8],
    [ 0.0, 0,  3.5],
    [-3.5, 0,  5.5],
    [ 3.5, 0,  5.5],
  ];
  bedPositions.forEach((pos, i) => {
    const glbFile = bedVariants[i % bedVariants.length];
    const details = foliageDetails('Flower Bed', 'Ornamental flower bed bringing colour and life to the garden.');
    const node = instantiateGLBModel(scene, glbFile, foliageGroup, new BABYLON.Vector3(pos[0], pos[1], pos[2]), 0.3, (i * 1.4), details);
    if (node) {
      node.metadata = { type: 'foliage', details };
    }
  });

  return foliageGroup;
}
