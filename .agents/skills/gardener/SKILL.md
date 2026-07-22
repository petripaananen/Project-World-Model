---
name: gardener
description: Guidelines and spatial layout standards for maintaining the 3D DTO Garden in Babylon.js, enforcing ground alignment, zero mesh overlaps, socket height math, and scene harmony.
---

# Gardener Skill — 3D DTO Garden Maintenance & Aesthetic Standards

## Purpose
The **Gardener** skill provides definitive architectural guidelines, spatial alignment formulas, and visual quality rules for maintaining and extending the 3D Data Tree Organism (DTO) Garden in Babylon.js.

---

## Key Principles & Layout Rules

### 1. Ground Alignment & Bounding Box Math
- **Root Elements (`parent === null`)**:
  - Always measure local bounding box minimum Y using `getBoundingInfo().boundingBox.minimumWorld.y` across child meshes.
  - Automatically adjust `root.position.y += (targetY - localMinY)` so the base of the model rests flush on top of the soil plane (`y = 0.005`–`0.01`).
- **Parented Socket Elements (`parent !== null`)**:
  - **NEVER** apply global Y auto-grounding to objects parented to tree branch sockets or character transforms.
  - Parented items inherit transform hierarchies directly from their parent socket vectors.

### 2. Physical Footprint Radii & Collision Solver
To prevent mesh clipping and model overlapping:
- Maintain an active `exclusions` array and `placedItems` tracker during 3D scene construction.
- Enforce the following physical collision radii (`r`):
  | Asset Category | Target GLB / Builder | Collision Radius (`r`) |
  | :--- | :--- | :--- |
  | **Stone Well** | `Water Fountain.glb` | `1.8` units |
  | **Epic Trees** | `Tree.glb` / `Bonsai.glb` | `2.0` units |
  | **PR Flower Beds** | `Flower Bed.glb` variants | `1.15` units |
  | **Tech Debt Rocks** | `Rock.glb` / `Japanese Sedge.glb` | `0.95` units |
  | **AI Statues** | `Statue.glb` variants | `1.0` unit |
  | **Active Lamps** | `Garden Lamp.glb` | `0.7` units |
  | **Boundary Pillars**| `Pillar.glb` | `0.6` units |

### 3. Spatial Zoning
- **Left Quad (`x < 0`)**: Dedicated Pull Request zone (`PR Flower Beds` & Left Epic Tree).
- **Right Quad (`x > 0`)**: Dedicated Issue/Tech Debt zone (`Tech Debt Rocks` & Right Epic Tree).
- **Center Core (`x = 0, z = 0`)**: Stone Well (Main Repository Branch).
- **Outer Quad Perimeter (`|x| >= 5.8, |z| >= 6.4`)**: Sprint Boundary Pillars & Glow Lamps.

---

## Scene Verification Checklist
Before committing or deploying 3D DTO Garden modifications:
1. [ ] **No Floating Objects**: Check that no rocks or props float in mid-air above trees.
2. [ ] **No Sunken Pedestals**: Check that statues and well bases sit flush on the brown soil.
3. [ ] **Zero Overlaps**: Check that flower bed rings and rocks do not clip into each other.
4. [ ] **Workspace Switch Remount**: Verify that selecting Project Alpha, Beta, Gamma, or Live Pipeline re-instantiates the 3D scene cleanly without canvas errors.
