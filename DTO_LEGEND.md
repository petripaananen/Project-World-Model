# DTO Legend - Project World Model (PWM) Visual Dictionary

In the Project World Model Causal Digital Twin, every visual element in the garden is mapped to a specific software project asset, pipeline metric, or system agent. This ensures a direct mapping between physical operations (the garden) and digital state (code quality, technical debt, and pipeline health).

---

## 🌳 1. Epic Trees (Project Epics)
* **Visual:** Smooth, fluffy, cloud-like trees with branching structures and hanging fruits.
* **DTO Description:** Represents the **Strategic Project Epics** (e.g. Infrastructure, UI Redesign, Security Audit).
* **DTO Function:** 
  * **Tree Height & Foliage Size:** Directly maps to the Epic completion progress (higher progress equals taller branches and larger foliage clouds).
  * **Branch Angles & Swaying:** High risk factors or complexity trigger gnarled branch angles and increased physical swaying in the wind.
  * **Foliage Theme Colors:** Custom-themed per project (Infrastructure is sunset crimson, UI Redesign is cherry blossom pink, Data Pipelines is slate spruce, default is vibrant grass green).
  * **Hanging Fruits (Apples/Pears/Peaches):** Represents completed deliverables and milestones under that Epic.

## 🌹 2. Rose Bushes (Pull Requests)
* **Visual:** Smooth, rounded green, yellow, or grey bushes.
* **DTO Description:** Represents active and integrated **Pull Requests (PRs)**.
* **DTO Function:**
  * **Green Bush with Red Flowers:** Completed & Approved PR.
  * **Yellow Bush with Yellow Flower:** Pending & Under Review PR.
  * **Grey Bush without Flowers:** Draft PR.
  * **Location:** Active PR bushes are planted within the active soil bed.

## 🪨 3. Tech Debt Rocks (Issues & Bugs)
* **Visual:** Low-poly grey rocks and sedge clutter (`Rock.glb`, `Japanese Sedge.glb`).
* **DTO Description:** Represents tracked **Jira or Linear Issues/Bugs**.
* **DTO Function:**
  * **Red/Grey Clumps & Boulders:** Active, unresolved, high-priority bugs or backlog tasks.
  * **Location:** Spawns on the right quadrant of the soil bed. Cleared automatically when issues are marked as resolved in Linear/Jira.

## ⛲ 4. Water Fountain (Central Repository & Main Branch)
* **Visual:** Tiered outdoor water fountain (`Water Fountain.glb`).
* **DTO Description:** Represents the **Workspace Origin / Main Branch / Central Git Repository**.
* **DTO Function:**
  * **Fountain Water Health:** The water depth and clarity represent code integration stability.
  * **Location:** Acts as the centerpiece of the garden. All stepping stone pipelines lead directly into it.

## 🧙 5. Garden Gnomes (AI Agents)
* **Visual:** Interactive gnomes with colorful hats and beards.
* **DTO Description:** Represents active **AI Agents** in the operational pipeline.
* **DTO Function:**
  * **Blue Gnome (Worker Agent):** Refactors code, runs unit tests, and implements new features.
  * **Purple Gnome (Critic Agent):** Reviews PRs, runs linters, and checks visual style rules.
  * **Pink Gnome (Opponent Agent):** Conducts chaos testing, simulates service failures, and tests system resilience.

## 📦 6. Crop Crates (Deliverables)
* **Visual:** Wooden crates containing 6 red spheres (apples).
* **DTO Description:** Represents **merged packages and deployed releases** ready for customers.
* **DTO Function:** Placed near the central well to represent successfully integrated milestones.

## 🛢️ 7. Wooden Barrels (CI Builds)
* **Visual:** Stylized brown wooden barrels.
* **DTO Description:** Represents **generated build artifacts and Docker container images** compiled during CI stages.

## 🛤️ 8. Stepping Stones (CI/CD Pipeline Path)
* **Visual:** Circular grey stone steps leading from the outer garden boundary to the central well.
* **DTO Description:** Represents the **commit timeline and CI/CD stages** that code changes progress through before merging into the main branch.

## 💮 9. Wildflowers (Open Source Dependencies)
* **Visual:** 5-sphere clusters (yellow pollen center + 4 colored petals) on the outer grassy field.
* **DTO Description:** Represents **external open-source libraries, package imports, and third-party APIs**.
* **DTO Function:** They grow outside the fence to signify they are outside the active workspace source tree.

## 🚧 10. Garden Fence (Workspace Scope)
* **Visual:** White wooden picket fence surrounding the soil plot.
* **DTO Description:** Defines the **active branch boundary and repository limits**. Elements inside the fence are actively tracked local source assets; elements outside (like wildflowers) are untracked external dependencies.

## ⛈️ 11. Weather System (Pipeline Load & Debt Severity)
* **Visual:** Sunny sky with sunbeams vs. overcast sky with rain/storm effects.
* **DTO Description:** Represents **overall workspace technical debt and test coverage load**.
* **DTO Function:** Healthy pipelines ($\text{CRR} \le 0.30$) run in sunny spring weather; high technical debt ($\text{CRR} > 0.30$), failing test suites, or critical PR blocks trigger dark clouds, fog ($\text{density} = 0.008$), and falling rain particles.

## 📐 12. Spatial Physics & Domain-Agnostic Telemetry Mathematics
The 3D DTO Garden adheres to strict spatial layout constraints and real-time telemetry bindings:

* **Ground-Level Flush Elevation**: All ground objects, soil plots, and bases MUST align flush with the terrain plane:
  $$y \in [0.005, 0.01]\,\text{m}$$
* **Centroid Exclusion Radii ($r_{\text{exclusion}}$)**:
  - Central Water Fountain: $r_{\text{fountain}} = 2.4\,\text{m}$ at $(x, z) = (0.0, 0.0)$
  - Epic Left & Right Trees: $r_{\text{tree}} = 3.0\,\text{m}$ at $(x, z) = (\pm 3.6, -1.8)$
  - Verification Agent Avatars: $r_{\text{agent}} = 1.0\,\text{m}$
* **Dynamic Boulder Mass & Collision Scaling**:
  When the System Identification reversibility parameter drops below $\gamma_{\text{rev}} < 0.6$ (indicating irreversible physical operations or concrete lock-in), weed/issue boulders scale non-linearly:
  $$\text{scale} = s_0 \cdot \left[1.0 + (1.0 - \gamma_{\text{rev}}) \cdot 0.45\right]$$
  where $s_0 = 0.45$ is the base mesh scale. The collision box footprint scales proportionally:
  $$w_{\text{col}} = 0.55 \cdot \left(\frac{\text{scale}}{s_0}\right)\,\text{m}$$
* **Raycast Hover Telemetry Binding**: Real-time raycasting dynamically computes and displays the System Identification vector $\mathbf{z}_{\text{env}} = (\gamma_{\text{rev}}, \kappa_{\text{coupling}}, \tau_{\text{latency}}, \sigma_{\text{exo}})^T$, Quasimetric Latent Energy $E_{\text{quasi}}$, and 95th percentile Conditional Value at Risk:
  $$\text{CVaR}_{0.95}(L) = \mathbb{E}[L \mid L \ge \text{VaR}_{0.95}(L)]$$

