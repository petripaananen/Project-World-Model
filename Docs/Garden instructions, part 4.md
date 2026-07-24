Here is a structured summary of our discussions regarding the dynamic DTO garden, its visual fidelity in **Babylon.js**, and the precise system instructions to feed into your **AntiGravity** agent skill file (SKILL.md).

## **Part 1: Visual Fidelity & Realism Blueprint (Babylon.js)**

To move away from raw, greybox primitives and achieve an atmospheric, polished look, the visual engine relies on four core pillars:

### **1\. PBR Lighting & Environment**

* **HDR Environment Maps (MANDATORY):** Instead of basic directional/ambient lights, set `scene.environmentTexture` to supply realistic ambient IBL reflections. **⚠️ WARNING: If you omit this step entirely, all imported GLB assets using PBR materials (statues, rocks, flower beds, trees) will appear pure black — they receive zero ambient light without IBL.** When no local `.env` HDRI file is bundled, use the built-in Babylon.js helper as the correct fallback:
  ```ts
  scene.createDefaultEnvironment({
    createGround: false,  // manage your own terrain
    createSkybox: false,  // fog/clearColor handles horizon
    environmentTexture: "https://assets.babylonjs.com/environments/environmentSpecular.env",
  });
  scene.environmentIntensity = 0.85;
  ```
  Alternatively, load a bundled `.env` file via `BABYLON.CubeTexture.CreateFromPrefilteredData('/env/myScene.env', scene)` and assign it to `scene.environmentTexture`.
* **Cascaded Shadow Maps:** Enable BABYLON.CascadedShadowGenerator on the main directional light with Percentage Closer Filtering (usePercentageCloserFiltering = true) for crisp, soft-edged shadows across foliage and ground elements.  
* **Atmospheric Skybox & Fog:** Blend the terrain edges into the horizon using exponential fog to prevent sharp plane cutoffs.

### **2\. Post-Processing Pipeline (DefaultRenderingPipeline)**

Always route the camera output through Babylon’s built-in pipeline rather than rendering raw scene geometry directly:

* **Tone Mapping:** Enable ACES tone mapping (TONEMAPPING\_ACES) with an exposure around 1.2 for balanced highlights and deep color saturation.  
* **Bloom Pass:** Add subtle bloom (bloomThreshold \= 0.8, bloomWeight \= 0.3) to simulate sunlight glowing through leaves, water reflections, and active status indicators.  
* **Screen Space Ambient Occlusion (SSAO):** Add an SSAO pass (SSAORenderingPipeline) to create contact shadows beneath rocks, fences, and plant bases, giving the scene physical depth.

### **3\. Material & Terrain Quality**

* Use **PBR Metallic Roughness Materials** for ground textures (dirt, grass, stone) with normal and roughness maps rather than flat hex colors.  
* Use **Thin Instances** (thinInstanceSetBuffer) for high-density foliage like grass blades or ground flower scatter to keep performance high (1 single draw call for thousands of instances).

## **Part 2: Living DTO Architecture (The Hybrid Model)**

Because your garden acts as a **Digital Twin of Organization (DTO)** driven by underlying project DAG metrics (Epics ➔ Issues ➔ Pull Requests), static assets must be assembled dynamically:

\[Epic Parent Node (TransformNode)\]  
    ├── Trunk / Base Structure (Scales or morphs with Epic completion)  
    ├── Issue Sockets (TransformNodes created dynamically as issues pop up)  
    │     └── PR Assets (Low-poly props from Poly Pizza pack)  
    └── Status Indicators (Fences, Lanterns, Rocks for Tech Debt)

> 1. **Root Nodes:** Each Epic becomes a BABYLON.TransformNode.  
> 2. **Dynamic Growth (Sockets):** As issues or PRs are created in Jira/Linear, attach child nodes relative to the parent position.  
> 3. **Low-Poly Modular Props (Zsky's Pack):** Use pre-made .glb assets (potted plants, bushes, lanterns, fences, rocks) loaded from local storage (/public/assets/decorations/) and attach them to the socket nodes.  
> 4. **State Mapping:**  
   * **Merged PR:** Green healthy plant model / green tint.  
   * **In Review / Draft PR:** Yellow plant model / warm glow.  
   * **Active Work / In-Progress:** Lantern/lamp post turns **ON** (emissive lighting).  
   * **Blockers / High-Risk Bugs / Tech Debt:** Spawns rocks, logs, or clutter around the Epic base.

## **Part 3: AntiGravity Skill File (SKILL.md)**

Create the skill file under .agents/skills/dto-builder/SKILL.md in your project workspace. You can copy the exact Markdown structure below into your repository.

Markdown  
\---  
name: dto-builder  
description: Strict guidelines for generating and updating the Babylon.js 3D DTO Garden using pre-made modular low-poly assets and PBR post-processing.  
\---

\# DTO Garden Builder Skill

Use this skill whenever generating, updating, or refactoring the 3D Babylon.js Digital Twin visualization code.

\---

\#\# 1\. Scene Setup & Visual Guardrails

\- \*\*Pipeline Mandate:\*\* ALWAYS initialize \`BABYLON.DefaultRenderingPipeline\` with ACES Tone Mapping (\`TONEMAPPING\_ACES\`), Bloom (\`bloomEnabled \= true\`), and anti-aliasing enabled.  
\- \*\*Lighting:\*\* NEVER rely solely on default ambient/directional lights. Load an HDRI environment map via \`scene.environmentTexture\` and configure \`BABYLON.CascadedShadowGenerator\` for directional shadows.  
\- \*\*Post-Processing:\*\* Include \`SSAORenderingPipeline\` to generate ambient occlusion shadows beneath ground props and foliage.  
\- \*\*No Raw Primitives:\*\* NEVER generate basic code primitives (e.g., \`BABYLON.MeshBuilder.CreateSphere\` or \`CreateCylinder\`) to represent foliage, trees, or structural elements.

\---

\#\# 2\. Modular Asset Rules (Poly Pizza Low-Poly Pack)

\- Load all 3D props from local storage at \`/public/assets/decorations/\<asset\_name\>.glb\`.  
\- Use the following modular mapping for project DAG metrics:  
  \- \*\*Epics:\*\* Represented by central \`BABYLON.TransformNode\` roots (with trunk/base platform).  
  \- \*\*Issues & PRs:\*\* Represented by potted plants, bushes (\`plant\_01.glb\`, \`pot\_plant.glb\`), or small trees attached as children to issue sockets.  
  \- \*\*Sprint Boundaries:\*\* Represented by modular fence segments (\`fence.glb\`) scaled around the Epic cluster.  
  \- \*\*Active Commits / In-Progress Work:\*\* Represented by light post assets (\`lamp\_post.glb\`) with active emissive materials or light glows.  
  \- \*\*Tech Debt / Blocking Bugs:\*\* Represented by clutter assets (\`rock\_01.glb\`, \`dead\_log.glb\`) spawned around the parent node base.

\---

\#\# 3\. Dynamic Socket & Animation Logic

1\. \*\*Socket Attachment:\*\* Create dynamic child \`BABYLON.TransformNode\` sockets for each DAG child node and assign imported meshes to \`mesh.parent \= socketNode\`.  
2\. \*\*Pop-in Animations:\*\* When spawning a new asset into the garden on a live event, animate its scale from \`(0,0,0)\` to \`(1,1,1)\` over 15–30 frames using \`BABYLON.Animation.CreateAndStartAnimation\`.  
3\. \*\*Performance Optimization:\*\* For scatter items (grass, small ground pebbles), use \`ThinInstances\` (\`mesh.thinInstanceSetBuffer\`) to minimize draw calls.

### **Key Benefits of This Setup**

* **$0.00 Local API Costs:** Uses pre-baked CC-BY models locally instead of invoking paid cloud generative endpoints during iteration.  
* **Low GCP Overhead:** Frontend runs purely on client WebGL in Babylon.js; backend hosting scales smoothly on serverless infrastructure (e.g., Google Cloud Run).  
* **Clear Agent Enforcement:** AntiGravity will now read .agents/skills/dto-builder/SKILL.md and reliably produce clean, modular Babylon.js code.