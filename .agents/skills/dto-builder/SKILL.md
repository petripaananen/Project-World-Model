---
name: dto-builder
description: Strict guidelines for generating and updating the Babylon.js 3D DTO Garden using pre-made modular low-poly assets and PBR post-processing.
---

# DTO Garden Builder Skill

Use this skill whenever generating, updating, or refactoring the 3D Babylon.js Digital Twin visualization code.

---

## 1. Scene Setup & Visual Guardrails

- **Pipeline Mandate:** ALWAYS initialize `BABYLON.DefaultRenderingPipeline` with ACES Tone Mapping (`TONEMAPPING_ACES`), Bloom (`bloomEnabled = true`), and anti-aliasing enabled.
- **Environment IBL (MANDATORY — do NOT skip):** ALWAYS call `scene.createDefaultEnvironment()` immediately after creating the scene and shadow generator. Omitting this causes **all imported GLB/PBR assets (statues, rocks, flower beds) to appear pure black** because PBR materials rely on IBL for their ambient contribution. Use:
  ```ts
  scene.createDefaultEnvironment({
    createGround: false,   // garden manages its own terrain planes
    createSkybox: false,   // fog + clearColor handles the horizon
    environmentTexture: "https://assets.babylonjs.com/environments/environmentSpecular.env",
  });
  scene.environmentIntensity = 0.85; // lower to 0.55 for rainy/overcast themes
  ```
- **Lighting:** Use `BABYLON.HemisphericLight` for ambient fill (`groundColor` must be a **bright** warm tone, e.g. `Color3(0.55, 0.62, 0.35)`) PLUS a `BABYLON.DirectionalLight` for sun at intensity ≤ 2.5 (high values blow out PBR metallic highlights under ACES). Configure `BABYLON.CascadedShadowGenerator` with `usePercentageCloserFiltering = true`.
- **Post-Processing:** Include `SSAORenderingPipeline` or `SSAO2RenderingPipeline` to generate contact shadows beneath ground props and foliage.
- **No Raw Primitives:** NEVER generate basic code primitives (e.g., `BABYLON.MeshBuilder.CreateSphere` or `CreateCylinder`) to represent foliage, trees, or structural elements.

---

## 2. Modular Asset Rules (Low-Poly Outdoor Decorations Pack)

- Load all 3D props from local storage at `/Low Poly Outdoor Decorations/<asset_name>.glb`.
- Use the following modular mapping for project DAG metrics:
  - **Stone Well / Core:** `Water Fountain.glb` / `Gazebo.glb` positioned at scene origin (0, 0, 0).
  - **Epics:** Represented by central `BABYLON.TransformNode` roots (`Tree.glb`, `Bonsai.glb`).
  - **Issues & PRs:** Represented by `Flower Bed.glb`, `Flower Bed-dM9hXXth1I.glb`, or `Flower Bed-eUCvK3Oq9z.glb` attached as children to issue sockets.
  - **Sprint Boundaries:** Represented by modular fence/pillar segments (`Pillar.glb`) scaled around the Epic cluster.
  - **Active Commits / In-Progress Work:** Represented by light post assets (`Garden Lamp.glb`, `Lamp.glb`) with active emissive materials or light glows.
  - **Tech Debt / Blocking Bugs:** Represented by clutter assets (`Rock.glb`, `Japanese Sedge.glb`) spawned around the parent node base.

---

## 3. Dynamic Socket & Animation Logic

1. **Socket Attachment:** Create dynamic child `BABYLON.TransformNode` sockets for each DAG child node and assign imported meshes to `mesh.parent = socketNode`.
2. **Pop-in Animations:** When spawning a new asset into the garden on a live event, animate its scale from `(0,0,0)` to `(1,1,1)` over 15–30 frames using `BABYLON.Animation.CreateAndStartAnimation`.
3. **Performance Optimization:** For scatter items (grass, small ground pebbles, flowers), use `ThinInstances` (`mesh.thinInstanceSetBuffer`) or asset container cloning to minimize draw calls.
