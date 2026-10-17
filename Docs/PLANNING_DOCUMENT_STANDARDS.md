# PWM Planning Document Standards & Style Guide

**AI Assistant Directive:**
Any time a "Plan", "Roadmap", or "Strategy" document is generated or updated within the Project World Model (PWM) workspace, the AI assistant MUST strictly follow these formatting and UX rules.

## 1. Artifact-First Rendering
*   **Never output raw Markdown files (`.md`) as the primary presentation layer** for business or project plans. 
*   **Always generate plans as Rich UI Artifacts** (using the AI's artifact generation system) so the user experiences a clean, rendered interface rather than raw code.

## 2. Formatting Rules
*   **Headers:** Use standard Markdown headers (`#`, `##`, `###`) for clean logical separation.
*   **Action Items:** Use GitHub-flavored task lists (`- [ ]` and `- [x]`) for all deliverables, milestones, and tasks. Do NOT use standard bullet points (`*`) or numbered lists for actionable items.
*   **No Code Blocks:** Do not wrap the plan content in triple-backtick code blocks (` ```markdown `), as this breaks the UI rendering and forces the user to look at line numbers.
*   **Descriptions:** Keep descriptions concise. Use bolding (`**`) to highlight key terms, roles, or environments (e.g., **Environment**: Google AI Studio).

## 3. Mandatory Structure for Plans
Every plan must contain at minimum:
1.  **Document Title & Purpose:** Clear H1 header and a 1-sentence summary.
2.  **Categorized Phases/Sections:** H2 or H3 headers grouping the work logically.
3.  **Actionable Checklists:** Every phase must have at least one `- [ ]` actionable item to ensure the plan acts as a tracker, not just an essay.

## 4. Professional Project Management Terminology
The AI assistant MUST strictly use terminology aligned with standard enterprise project management platforms (e.g., Jira, Linear, Azure DevOps) and Petri Paananen's Master's Thesis. 
*   **Ban Playful Metaphors:** Never use playful, non-professional metaphors (such as "Zen Garden", "sand", "vegetation", "bamboo", "weeds", "gnomes", "weather", "storm", "pollen") in the UI, tooltips, code comments, or documentation.
*   **Terminology Mapping:**
    *   *Use:* **"DTO Simulation"**, **"Digital Twin Simulation"**, or **"Causal Simulation Workspace"** (instead of "Zen Garden").
    *   *Use:* **"Worker / Critic / Opponent Agent Nodes"** or **"Autonomous Verification Agents"** (instead of "Gnomes").
    *   *Use:* **"Dependency Graph"**, **"Telemetry Nodes"**, or **"PR / Issue Ingestion Objects"** (instead of "Bamboo" / "Weeds").
    *   *Use:* **"System Health State"**, **"Integration Debt Levels"**, or **"Stable / Alert status"** (instead of "Weather" / "Storm").

## 5. Mandatory $\LaTeX$ Mathematical & Technical Documentation Standard
To maintain academic rigor and executive clarity across all project documentation, specifications, plans, and reports, the AI assistant and all contributors MUST adhere to standard $\LaTeX$ math formatting:

*   **Strict Ban on Pseudo-Math:** Never use ASCII approximations or raw Unicode superscripts for mathematical formulas, vector spaces, or variables (e.g., do NOT write `s in R^d`, `||W W^T - I|| < 10^-6`, `E = ||s' - s||_2`, `a1, a2, ..., an`, or `c ∈ ℝ⁴ˣ¹⁶`).
*   **Inline Mathematics:** Wrap all variables, dimensions, scalars, metrics, and short mathematical expressions in single dollar signs (`$...$`).
*   **Block Display Mathematics:** Format all multi-variable equations, loss functions, optimization objectives, and definitions in centered double dollar display blocks (`$$...$$`).
*   **Standardized PWM $\LaTeX$ Notation Table:**

| Concept | $\LaTeX$ Syntax | Rendered Output | Context / Definition |
| :--- | :--- | :--- | :--- |
| **Latent State Vector** | `$\mathbf{s} \in \mathbb{R}^d$` | $\mathbf{s} \in \mathbb{R}^d$ | Global project latent state ($d=64$). |
| **Factor Coordinates** | `$\mathbf{c} \in \mathbb{R}^{K \times r}$` | $\mathbf{c} \in \mathbb{R}^{K \times r}$ | OPF representation with $K=4$ factors of rank $r=16$. |
| **Subspace Factors** | `$c_{\text{topology}}, c_{\text{velocity}}, c_{\text{coordination}}, c_{\text{architecture}}$` | $c_{\text{topology}}, c_{\text{velocity}}, c_{\text{coordination}}, c_{\text{architecture}}$ | Decomposed predictive dimensions. |
| **Projector-Gram Invariant** | `$\|W W^T - I\|_F < 10^{-6}$` | $\|W W^T - I\|_F < 10^{-6}$ | Strict orthonormal basis condition. |
| **System ID Vector** | `$\mathbf{z}_{\text{env}} = (\gamma_{\text{rev}}, \kappa_{\text{coupling}}, \tau_{\text{latency}}, \sigma_{\text{exo}})^T$` | $\mathbf{z}_{\text{env}} = (\gamma_{\text{rev}}, \kappa_{\text{coupling}}, \tau_{\text{latency}}, \sigma_{\text{exo}})^T$ | Domain physical invariants. |
| **Riemannian Event Clock** | `$\Delta \tau_k = 1 \iff \|\mathbf{s}_t - \mathbf{s}_{t-1}\|_2 \ge \theta_{\text{flux}} \lor \Delta t > \tau_{\max}$` | $\Delta \tau_k = 1 \iff \|\mathbf{s}_t - \mathbf{s}_{t-1}\|_2 \ge \theta_{\text{flux}} \lor \Delta t > \tau_{\max}$ | Intrinsic project event progression. |
| **Quasimetric Latent Energy** | `$$E(\mathbf{s}, \mathbf{s}') = \sqrt{(\mathbf{s}'-\mathbf{s})^T G(\mathbf{z}_{\text{env}}) (\mathbf{s}'-\mathbf{s})} + (1 - \gamma_{\text{rev}}) \cdot \max(0, \Phi(\mathbf{s}') - \Phi(\mathbf{s}))$$` | $$E(\mathbf{s}, \mathbf{s}') = \sqrt{(\mathbf{s}'-\mathbf{s})^T G(\mathbf{z}_{\text{env}}) (\mathbf{s}'-\mathbf{s})} + (1 - \gamma_{\text{rev}}) \cdot \max(0, \Phi(\mathbf{s}') - \Phi(\mathbf{s}))$$ | Asymmetric path-dependent distance. |
| **Conditional Value at Risk** | `$$\text{CVaR}_{0.95}(L) = \mathbb{E}[L \mid L \ge \text{VaR}_{0.95}(L)]$$` | $$\text{CVaR}_{0.95}(L) = \mathbb{E}[L \mid L \ge \text{VaR}_{0.95}(L)]$$ | Tail risk over stochastic perturbations. |
| **Compute-to-Rework Ratio** | `$$\text{CRR} = \frac{\text{Total AI Inference Cost } (€) + \text{Infrastructure Cost } (€)}{\text{Estimated Human Developer Rework Saved } (€)}$$` | $$\text{CRR} = \frac{\text{Total AI Inference Cost } (€) + \text{Infrastructure Cost } (€)}{\text{Estimated Human Developer Rework Saved } (€)}$$ | Economic guardrail metric (target $\le 0.30$). |
| **Pre-Screening Objective** | `$$\pi^* = \arg\min_{\pi \in \Pi} [0.45 \cdot \text{Risk}(\pi) + 0.35 \cdot \text{CVaR}_{0.95}(\pi) + 0.20 \cdot E_{\text{quasi}}(\pi)]$$` | $$\pi^* = \arg\min_{\pi \in \Pi} [0.45 \cdot \text{Risk}(\pi) + 0.35 \cdot \text{CVaR}_{0.95}(\pi) + 0.20 \cdot E_{\text{quasi}}(\pi)]$$ | Layer 3 strategy ranking function. |
| **Flow Dynamics** | `$L = \lambda W$` | $L = \lambda W$ | Little's Law throughput formulation. |

*By adhering to this standard, we guarantee a premium, "Executive-Ready" and academically rigorous presentation across all PWM documentation, plans, and whitepapers.*

