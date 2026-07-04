Here is a clean, data-driven implementation of a recursive tree structure for React Three Fiber.  
Instead of a traditional string-parsing L-System (which can be hard to map directly to structured objects), this approach uses **Data-Driven Structural Recursion**. It interprets your epic and task hierarchy directly into structural components, making the 3D topology a literal mirror of your project health.

### **The Data-Driven Tree Component**

You can drop this directly into a component file (e.g., components/garden/DataTree.tsx). It dynamically calculates branch splits, angles, and leaf density based on your DTO state.

TypeScript  
import React, { useRef } from 'react';  
import { useFrame } from '@react-three/fiber';  
import \* as THREE from 'three';

interface TaskNode {  
  id: string;  
  title: string;  
  progress: number; // 0.0 to 1.0  
  complexity: number; // 1 to 4 (drives recursion depth)  
  risk: number; // 0.0 to 1.0 (drives gnarled/twisted angles)  
  subtasks?: TaskNode\[\];  
}

interface BranchProps {  
  node: TaskNode;  
  depth: number;  
  maxDepth: number;  
  length: number;  
  radius: number;  
}

// Recursive Branch Component  
function Branch({ node, depth, maxDepth, length, radius }: BranchProps) {  
  const groupRef \= useRef\<THREE.Group\>(null);

  // Animate subtle swaying based on risk/uncertainty factor  
  useFrame((state) \=\> {  
    if (\!groupRef.current) return;  
    const t \= state.clock.getElapsedTime();  
    const sway \= Math.sin(t \+ depth) \* (0.02 \* node.risk);  
    groupRef.current.rotation.z \= sway;  
  });

  if (depth \> maxDepth) return null;

  // Base colors on progress: healthy green vs unstarted/delayed amber  
  const branchColor \= new THREE.Color('\#5a3d28').lerp(new THREE.Color('\#3a2516'), depth / maxDepth);  
  const leafColor \= new THREE.Color('\#e67e22').lerp(new THREE.Color('\#2ecc71'), node.progress);

  const children \= node.subtasks || \[\];  
  const branchCount \= children.length || 2; // Default split if no subtasks

  return (  
    \<group ref={groupRef}\>  
      {/\* The actual segment cylinder \*/}  
      \<mesh position={\[0, length / 2, 0\]} castShadow receiveShadow\>  
        \<cylinderGeometry args={\[radius \* 0.7, radius, length, 8\]} /\>  
        \<meshStandardMaterial color={branchColor} roughness={0.9} /\>  
      \</mesh\>

      {/\* Terminal leaves/blooms sprout at the ends of completed paths \*/}  
      {depth \=== maxDepth || children.length \=== 0 ? (  
        \<mesh position={\[0, length, 0\]} castShadow\>  
          \<sphereGeometry args={\[radius \* 2.5 \* (node.progress \+ 0.5), 8, 8\]} /\>  
          \<meshStandardMaterial   
            color={leafColor}   
            roughness={0.6}   
            emissive={leafColor}  
            emissiveIntensity={node.progress \* 0.2}   
          /\>  
        \</mesh\>  
      ) : (  
        // Sprout child branches at the tip of this branch  
        \<group position={\[0, length, 0\]}\>  
          {children.map((subtask, index) \=\> {  
            // Distribute branch angles symmetrically, distorted by the risk factor  
            const angleSpread \= 0.5 \+ (node.risk \* 0.2);   
            const mid \= (branchCount \- 1\) / 2;  
            const zRotation \= (index \- mid) \* angleSpread;  
            const yRotation \= (index \* Math.PI \* 2\) / branchCount;

            return (  
              \<group key={subtask.id} rotation={\[0, yRotation, zRotation\]}\>  
                \<Branch  
                  node={subtask}  
                  depth={depth \+ 1}  
                  maxDepth={maxDepth}  
                  length={length \* 0.75} // Classic algorithmic decay  
                  radius={radius \* 0.65}  
                /\>  
              \</group\>  
            );  
          })}  
        \</group\>  
      )}  
    \</group\>  
  );  
}

// Main Export Component  
export function DataTree({ data }: { data: TaskNode }) {  
  // Enforce recursion limits to guard GPU performance  
  const safeMaxDepth \= Math.min(data.complexity, 4);

  return (  
    \<group\>  
      \<Branch   
        node={data}   
        depth={0}   
        maxDepth={safeMaxDepth}   
        length={3}   
        radius={0.25}   
      /\>  
    \</group\>  
  );  
}

### **How to Hook it up to your DTO Engine**

To see it in action inside your WebGL context, wrap it inside your canvas rendering loop and pass down a structured JSON tree:

TypeScript  
import { Canvas } from '@react-three/fiber';  
import { OrbitControls } from '@react-three/drei';  
import { DataTree } from './DataTree';

const mockEpicData \= {  
  id: 'epic-1',  
  title: 'Architecture Setup',  
  progress: 0.8, // Pretty healthy  
  complexity: 3,  // Will grow 3 levels deep  
  risk: 0.1,       // Low risk \= straight, stable branches  
  subtasks: \[  
    {  
      id: 'task-1.1',  
      title: 'Database Layer',  
      progress: 1.0, // Fully green leaf cluster  
      complexity: 1,  
      risk: 0.0,  
    },  
    {  
      id: 'task-1.2',  
      title: 'State Engine',  
      progress: 0.4, // Half-dead/amber color  
      complexity: 2,  
      risk: 0.6,     // High risk causes broader angle displacement  
      subtasks: \[  
        { id: 'sub-1', title: 'Zustand Setup', progress: 0.9, complexity: 1, risk: 0.1 },  
        { id: 'sub-2', title: 'Sync Middleware', progress: 0.1, complexity: 1, risk: 0.8 }  
      \]  
    }  
  \]  
};

export default function GardenSandbox() {  
  return (  
    \<div style={{ width: '100vw', height: '100vh', background: '\#111' }}\>  
      \<Canvas camera={{ position: \[0, 5, 10\], fov: 50 }} shadows\>  
        \<color attach="background" args={\['\#141913'\]} /\>  
        \<ambientLight intensity={0.4} /\>  
        \<directionalLight position={\[5, 10, 5\]} intensity={1.5} castShadow /\>  
        \<pointLight position={\[-5, 5, \-5\]} intensity={0.5} /\>  
          
        \<DataTree data={mockEpicData} /\>  
          
        \<mesh rotation={\[-Math.PI / 2, 0, 0\]} position={\[0, 0, 0\]} receiveShadow\>  
          \<planeGeometry args={\[20, 20\]} /\>  
          \<meshStandardMaterial color="\#222b1d" roughness={1} /\>  
        \</mesh\>  
          
        \<OrbitControls makeDefault /\>  
      \</Canvas\>  
    \</div\>  
  );  
}

### **Why this scales better than World Models**

1. **Zero Render Cost:** The computational footprint shifts entirely to the user's GPU using native WebGL primitives.  
2. **Infinite Variation:** Two projects will never look identical because the layout architecture changes dynamically based on branching structures.  
3. **Instancing Cleanliness:** If you scale this to display hundreds of trees on a massive factory grid floor, you can swap the raw \<mesh\> structures out for Three.js InstancedMesh logic to draw 10,000 components at 60 FPS.

