To bridge the gap between your current flat layout in image\_9da62c.jpg and the lush, high-contrast, stylized aesthetic of watermarked\_img\_11839123418481714923.png, you need to direct your AI agent in Antigravity to target four specific graphics pillars: **Atmospheric Lighting, Juicy Palettes, Instanced Foliage, and Post-Processing**.  
Because agent IDEs work best when tasks are broken down by architectural layer, running this overhaul in three distinct, sequential prompts will yield the best results without breaking your functional DTO state logic.

### **Step 1: The Environment & Lighting Upgrade**

Your current scene uses flat ambient illumination and standard gray backgrounds. To get the warm, golden-hour look of watermarked\_img\_11839123418481714923.png, you need to set up a strong directional light with soft shadows, a soft hemisphere fill light, and a sky color gradient.  
**Copy-Paste this prompt into Antigravity:**

Plaintext  
Refactor the Canvas wrapper and lighting setup in our 3D visualization view. I want to replace the current flat ambient/directional lighting with a vibrant, high-end stylized game aesthetic. Implement the following:  
1\. Add a soft \`\<HemisphereLight\>\` with a sky color of \#a1c4fd (soft blue) and ground color of \#223a1a (deep muted green) to eliminate flat gray shadows.  
2\. Position a primary \`\<directionalLight\>\` at a sharp angle (e.g., \[15, 20, 10\]) to act as a golden-hour sun. Set the color to a warm, soft yellow (\#fff3d1), increase intensity to 2.5, and optimize the shadow map properties (set shadow-mapSize to \[2048, 2048\] and bias to \-0.0001 for clean, smooth shadow edges).  
3\. Update the canvas scene background color to a rich atmospheric soft sky gradient or a deep volumetric dark color that makes the green foliage pop, rather than the flat gray atmosphere currently visible.  
Keep all functional React state, DTO tracking data, and UI node components intact; only modify lights, canvas settings, and environment wrappers.

### **Step 2: Shading, Rich Soil, & Instanced Grass**

The biggest visual difference in watermarked\_img\_11839123418481714923.png is the ground. Instead of a flat, smooth khaki-green sheet, it features rich, dark, fertile soil surrounded by thousands of vibrant, instanced blades of green grass.  
**Copy-Paste this prompt into Antigravity:**

Plaintext  
Let's upgrade the materials and the ground plane geometry to look lush and juicy like a stylized mobile farm game:  
1\. Ground Mesh: Change the plane color to a dark, rich, organic earth brown (\#2c1d11). Increase its roughness to 1.0 so it doesn't reflect plastic-like sheen.  
2\. Material Updates: Update all plant, leaf, fruit, and tree meshes to use a vibrant, highly saturated palette. Increase the \`roughness\` property on the tree trunks to 0.9 (matte bark) and set the leaves/foliage to a bright, semi-glossy green (\#2ecc71 or \#1abc9c) with a subtle emissive value matching the base color to make them look illuminated by the sun.  
3\. Grass Instancing: Create an optimized \`\<instancedMesh\>\` component that scatters hundreds of simple low-poly grass blade geometries or small flower primitives randomly across the ground plane coordinate boundaries. Mix slightly varying shades of bright green, lime green, and yellow-green to introduce natural color variation without dragging down WebGL draw calls.

### **Step 3: Game-Dev Post-Processing (The "Secret Sauce")**

The glowing sunbeams, soft atmosphere, and crisp contrast in watermarked\_img\_11839123418481714923.png cannot be achieved with standard meshes alone. You need a post-processing pass using @react-three/postprocessing to add Bloom and Tone Mapping.  
**Copy-Paste this prompt into Antigravity:**

Plaintext  
Install \`@react-three/postprocessing\` if it isn't present, and introduce an \`\<EffectComposer\>\` wrapper directly inside our R3F Canvas component:  
1\. Add a \`\<Bloom\>\` pass with low luminanceThreshold (around 0.2) and high intensity (1.5) to give the warm lights, lamps, and bright green foliage a soft, magical, dreamy glow.  
2\. Add a \`\<ToneMapping\>\` component using ACESFilmic tone mapping to drastically boost the color contrast, deepen the dark shadow ranges, and saturate the mid-tones to get that professional game engine render style.  
3\. Ensure the canvas \`gl\` properties are set to handle high-dynamic range (\`gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}\`).

### **Pro-Tip for your Agent Workflow**

If Antigravity struggles to generate the organic, bumpy looking trees seen in the target image using primitive spheres, ask it specifically to **"replace standard \<sphereGeometry\> with a \<dodecahedronGeometry\> or a low-poly perturbed mesh, smooth-shading it to create faceted, stylized low-poly leaf clusters."** This immediately gets rid of the mathematical, sterile roundness seen in image\_9da62c.jpg.  
Which section of the repository code layout should we review first to ensure these three prompts plug cleanly into your active simulation states?