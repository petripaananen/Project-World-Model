To handle tooltips in React Three Fiber without killing performance, the best approach is to track the hovered item's data in a single piece of state, and then render a **single screen-space HTML element** that follows the mouse.  
Trying to render a 3D HTML tag (\<Html\> from Drei) inside *every single recursive branch* will quickly bottleneck your application when your project scales.  
Two critical rules make this work smoothly in R3F:

1. **e.stopPropagation()**: In 3D raycasting, the laser pointer passes straight through overlapping objects. You must stop propagation on hover events, or a leaf hover will simultaneously trigger hover states for the branch behind it and the ground beneath it.  
2. **Pointer Capture/Out Syncing**: Explicitly clear the state on pointer exit so tooltips don't get stuck in mid-air.

### **Implementation: The Hover-Aware Garden**

Here is how you can refactor the setup to track hovers, handle the raycast events cleanly, and render a floating, modern UI overlay card.

TypeScript  
import React, { useState, useRef } from 'react';  
import { Canvas, useFrame } from '@react-three/fiber';  
import { OrbitControls } from '@react-three/drei';  
import \* as THREE from 'three';

// Data Interfaces  
interface TaskNode {  
  id: string;  
  title: string;  
  progress: number;  
  complexity: number;  
  risk: number;  
  subtasks?: TaskNode\[\];  
}

interface HoveredData {  
  node: TaskNode;  
  x: number;  
  y: number;  
}

// 1\. Recursive Branch Component  
interface BranchProps {  
  node: TaskNode;  
  depth: number;  
  maxDepth: number;  
  length: number;  
  radius: number;  
  onHover: (data: HoveredData | null) \=\> void;  
}

function Branch({ node, depth, maxDepth, length, radius, onHover }: BranchProps) {  
  const groupRef \= useRef\<THREE.Group\>(null);  
  const \[isHovered, setIsHovered\] \= useState(false);

  useFrame((state) \=\> {  
    if (\!groupRef.current) return;  
    const t \= state.clock.getElapsedTime();  
    // Sway a tiny bit faster/more erratically if hovered to provide physical feedback  
    const swayAmplitude \= isHovered ? 0.05 \* node.risk : 0.02 \* node.risk;  
    groupRef.current.rotation.z \= Math.sin(t \+ depth) \* swayAmplitude;  
  });

  if (depth \> maxDepth) return null;

  const baseBranchColor \= new THREE.Color('\#5a3d28').lerp(new THREE.Color('\#3a2516'), depth / maxDepth);  
  // Highlight the branch structure visually on hover  
  const branchColor \= isHovered ? baseBranchColor.clone().addScalar(0.2) : baseBranchColor;

  const baseLeafColor \= new THREE.Color('\#e67e22').lerp(new THREE.Color('\#2ecc71'), node.progress);  
  const leafColor \= isHovered ? baseLeafColor.clone().addScalar(0.3) : baseLeafColor;

  const children \= node.subtasks || \[\];  
  const branchCount \= children.length || 2;

  // Helper to handle unified raycast interaction  
  const handlePointerOver \= (e: any) \=\> {  
    e.stopPropagation(); // Stop the ray from piercing multiple branches  
    document.body.style.cursor \= 'pointer';  
    setIsHovered(true);  
    onHover({  
      node,  
      x: e.clientX,  
      y: e.clientY  
    });  
  };

  const handlePointerOut \= (e: any) \=\> {  
    e.stopPropagation();  
    document.body.style.cursor \= 'default';  
    setIsHovered(false);  
    onHover(null);  
  };

  const handlePointerMove \= (e: any) \=\> {  
    e.stopPropagation();  
    // Continuously track the screen coordinates as the mouse slides across the mesh  
    onHover({  
      node,  
      x: e.clientX,  
      y: e.clientY  
    });  
  };

  return (  
    \<group ref={groupRef}\>  
      {/\* Branch Segment \*/}  
      \<mesh   
        position={\[0, length / 2, 0\]}   
        castShadow   
        receiveShadow  
        onPointerOver={handlePointerOver}  
        onPointerOut={handlePointerOut}  
        onPointerMove={handlePointerMove}  
      \>  
        \<cylinderGeometry args={\[radius \* 0.7, radius, length, 8\]} /\>  
        \<meshStandardMaterial color={branchColor} roughness={0.9} /\>  
      \</mesh\>

      {/\* Leaf / Bloom Cluster \*/}  
      {(depth \=== maxDepth || children.length \=== 0\) ? (  
        \<mesh   
          position={\[0, length, 0\]}   
          castShadow  
          onPointerOver={handlePointerOver}  
          onPointerOut={handlePointerOut}  
          onPointerMove={handlePointerMove}  
        \>  
          \<sphereGeometry args={\[radius \* 2.5 \* (node.progress \+ 0.5), 8, 8\]} /\>  
          \<meshStandardMaterial   
            color={leafColor}   
            roughness={0.6}  
            emissive={leafColor}  
            emissiveIntensity={isHovered ? 0.5 : node.progress \* 0.2}  
          /\>  
        \</mesh\>  
      ) : (  
        \<group position={\[0, length, 0\]}\>  
          {children.map((subtask, index) \=\> {  
            const angleSpread \= 0.5 \+ (node.risk \* 0.2);   
            const mid \= (branchCount \- 1\) / 2;  
            const zRotation \= (index \- mid) \* angleSpread;  
            const yRotation \= (index \* Math.PI \* 2\) / branchCount;

            return (  
              \<group key={subtask.id} rotation={\[0, yRotation, zRotation\]}\>  
                \<Branch  
                  node={subtask}  
                  depth={depth \+ 1}  
                  maxDepth={Math.min(node.complexity, 4)}  
                  length={length \* 0.75}  
                  radius={radius \* 0.65}  
                  onHover={onHover}  
                /\>  
              \</group\>  
            );  
          })}  
        \</group\>  
      )}  
    \</group\>  
  );  
}

// 2\. Main Dashboard Component with Screen-Space UI Overlay  
export default function GardenDashboard({ projectData }: { projectData: TaskNode }) {  
  const \[hoveredInfo, setHoveredInfo\] \= useState\<HoveredData | null\>(null);

  return (  
    \<div style={{ width: '100vw', height: '100vh', position: 'relative', background: '\#141913', overflow: 'hidden' }}\>  
        
      {/\* 3D WebGL Canvas Loop \*/}  
      \<Canvas camera={{ position: \[0, 5, 10\], fov: 50 }} shadows\>  
        \<ambientLight intensity={0.4} /\>  
        \<directionalLight position={\[5, 10, 5\]} intensity={1.5} castShadow /\>  
          
        \<Branch   
          node={projectData}   
          depth={0}   
          maxDepth={Math.min(projectData.complexity, 4)}   
          length={3}   
          radius={0.25}   
          onHover={setHoveredInfo}   
        /\>  
          
        \<mesh rotation={\[-Math.PI / 2, 0, 0\]} receiveShadow\>  
          \<planeGeometry args={\[30, 30\]} /\>  
          \<meshStandardMaterial color="\#1c2418" roughness={1} /\>  
        \</mesh\>  
          
        \<OrbitControls makeDefault /\>  
      \</Canvas\>

      {/\* 3\. Floating Custom HTML Overlay Card \*/}  
      {hoveredInfo && (  
        \<div  
          style={{  
            position: 'absolute',  
            left: hoveredInfo.x \+ 15, // Offset slightly right from cursor  
            top: hoveredInfo.y \+ 15,  // Offset slightly down from cursor  
            pointerEvents: 'none',     // Crucial: lets click events pass through to the canvas underneath  
            background: 'rgba(20, 25, 20, 0.95)',  
            border: '1px solid rgba(255,255,255,0.15)',  
            borderRadius: '6px',  
            padding: '12px',  
            color: '\#fff',  
            fontFamily: 'sans-serif',  
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',  
            zIndex: 10,  
            minWidth: '200px',  
          }}  
        \>  
          \<div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}\>  
            {hoveredInfo.node.title}  
          \</div\>  
          \<div style={{ fontSize: '11px', color: '\#aaa', marginBottom: '8px' }}\>  
            ID: {hoveredInfo.node.id}  
          \</div\>  
            
          {/\* Progress Bar UI \*/}  
          \<div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}\>  
            \<span style={{ minWidth: '55px' }}\>Progress:\</span\>  
            \<div style={{ flexGrow: 1, background: '\#333', height: '6px', borderRadius: '3px', overflow: 'hidden' }}\>  
              \<div   
                style={{   
                  width: \`${hoveredInfo.node.progress \* 100}%\`,   
                  background: hoveredInfo.node.progress \> 0.5 ? '\#2ecc71' : '\#e67e22',   
                  height: '100%'   
                }}   
              /\>  
            \</div\>  
            \<span\>{Math.round(hoveredInfo.node.progress \* 100)}%\</span\>  
          \</div\>

          {/\* Risk Level UI \*/}  
          \<div style={{ fontSize: '12px', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}\>  
            \<span\>Risk Index:\</span\>  
            \<span style={{ color: hoveredInfo.node.risk \> 0.5 ? '\#ff4d4d' : '\#2ecc71', fontWeight: 'bold' }}\>  
              {(hoveredInfo.node.risk \* 10).toFixed(1)} / 10  
            \</span\>  
          \</div\>  
        \</div\>  
      )}  
    \</div\>  
  );  
}

### **Key Performance Benefits of This Setup**

* **No DOM Thrashing:** By managing coordinates purely dynamically through a absolute container layout, the browser engine avoids recalculating huge layout trees inside WebGL coordinates.  
* **Immediate Feedback:** Applying an emissive boost inside meshStandardMaterial (emissiveIntensity={isHovered ? 0.5 : ...}) scales seamlessly inside the Three.js shader engine, offering game-like hardware responses.