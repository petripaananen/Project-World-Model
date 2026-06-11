# 🌍 The Grand Plan: Project World Model (PWM) Framework

**Date**: June 10, 2026  
**Status**: Phase 1 ✅ → Phase 2 ✅ → Phase 3 🟡 → Phase 4 🟡 → Phase 5 ✅ → Phase 6 🟡 → Phase 7 ⏳

**Canonical Source of Truth**: [Petri_Paananen_thesis.md](./Petri_Paananen_thesis.md) — Paananen, P. (2026). *Itseohjautuvat työnkulut videopeliteollisuudessa: tekoälyn maailmanmallit tuotannon johtamisen viitekehyksenä.* JAMK University of Applied Sciences.

**Document Purpose**: This serves as the master blueprint for the technical development and commercialization of the Project World Model (PWM) Framework. Every architectural decision, technology selection, and development milestone in this document is derived from and validated by the academic thesis referenced above.

---

## 1. Executive Summary

The PWM framework addresses the **"Paradox of Agility" (Ketteryyden paradoksi)** — the phenomenon where exponential asset generation by L1 AI models creates massive "integration debt," completely overwhelming linear, human-driven Agile/Scrum pipelines (Thesis §1.1). PWM solves this by acting as a **Causal Digital Twin (CDT)** (Thesis §5.2), orchestrating an asynchronous **Team of Rivals** (Thesis §5.5) to resolve embedded integration debt before it hits production.

The system operates using **Causal Counterfactual Reasoning** (Thesis §2.2), enabling "what if we had done X differently?" scenario analysis in latent space — a capability fundamentally beyond traditional Agile tools that operate only at Level 1 (Association/correlation).

**Academic Foundation**: The theoretical and conceptual framework of PWM is validated by Petri Paananen's Master's Thesis: *"Itseohjautuvat työnkulut videopeliteollisuudessa: tekoälyn maailmanmallit tuotannon johtamisen viitekehyksenä"* (JAMK, 2026), published at URN: [https://urn.fi/URN:NBN:fi:amk-2026052919003](https://urn.fi/URN:NBN:fi:amk-2026052919003). Full text: [Petri_Paananen_thesis.md](./Petri_Paananen_thesis.md).

**Gemini XPRIZE Alignment**: PWM is entered in the **Build with Gemini XPRIZE Hackathon** (Small Business Services & Entrepreneurship categories), leveraging a fully native Google Cloud (GCP) stack for intensive GPU compute, serverless orchestration, and agentic validation.

---

## 2. The 5-Layer Architecture (Thesis §5.2)

To fulfill the requirements of a true Causal Digital Twin (CDT), the architecture implements the 5-layer vertical structure defined in the thesis (Kuvio 4). Each layer maps to specific open-source AI models selected in the thesis technology survey (Taulukko 4):

### 🔵 Layer 1: Observation & Spatial Understanding (Thesis §5.2)

Ingests three parallel data streams — version control telemetry, task management data, and team communication signals — into a structured latent representation. Acts as the **"muuttumaton liikkuja" (immutable mover)** that anchors all upper-layer agents in factual organizational truth. All observations are written to a cryptographically chained **immutable event log** before propagating upstream, preventing agent hallucination and regression.

- **Selected Models**: V-JEPA 2.1, LingBot-World for local edge inference.

### 🧠 Layer 2: The Latent Core & Simulation Engine (Thesis §5.2)

The predictive cognitive engine performing **action-conditioned simulation** in latent space. Executes deep causal reasoning and parallel "what-if" counterfactuals (Causal Impact Prediction) without requiring heavy pixel-level rendering. Uses **SIGReg regularization** to prevent representation collapse, ensuring the simulation reliably distinguishes between different production risk scenarios. Produces **causal evidence** ("kausaalinen todiste") — probability distributions, not binary pass/fail — for the Scenario Strategist. Compute scales linearly with problem size, keeping CRR ratios economically viable.

- **Selected Model (Primary)**: LeWorldModel / LeWM — stable end-to-end JEPA from pixels, runnable on a single GPU.
- **Selected Model (Multi-Agent Alternative)**: Solaris (solaris-wm) — multiplayer DiT for parallel workflow simulation.

### ⚙️ Layer 3: Agentic Orchestration (Thesis §5.2, §2.3)

The asynchronous routing layer implementing the **AsyncThink Fork-Delegate-Join protocol**. The Orchestrator (*Järjestelijä*) decomposes complex integration debt into specialized sub-tasks and delegates to domain-specific worker agents: QA Agent, Build Agent, Art Integration Agent. Agents negotiate asynchronously ("asynkroninen neuvottelu"), with **Muse Spark** providing natively multimodal reasoning for parallel orchestration.

- **Selected Framework**: LMMs-Engine for visual pipeline parsing of Gantt charts and dependency graphs.

### 🛡️ Layer 4: Validation & Audit — Team of Rivals (Thesis §5.5, §5.2.1)

The architectural firewall. Independent critic agents audit worker proposals through **hierarchical debate and veto**. Critics run in secure, air-gapped sandboxes to prevent **strategic dishonesty** and **Algorithmic Value Capture**. The thesis defines a **hallinta- ja linjausarkkitehti** (governance & alignment architect) — a supervisory AI instance that monitors agent cascading effects and hidden intentions.

- **Selected Framework**: NVIDIA NemoClaw & OpenShell — sandbox critic agents in secure enclaves within the studio's local infrastructure.

### 📊 Layer 5: The Scenario Strategist (Thesis §5.3, §5.7)

The human-in-the-loop executive layer. The thesis replaces the traditional producer role with a **Scenario Strategist (Skenaariostrategi)** who:
- Sets **qualitative objective functions** (laadulliset tavoitefunktiot) for the agent organization
- Manages the **intelligence budget** (kognitiivinen budjetti) via the CRR metric (Thesis §5.8)
- Exercises **absolute veto power** to prevent creative vision erosion
- Operates as a **reward architect** (palkkioarkkitehti; Thesis §2.5), tuning agent incentives
- Follows the **24-hour async cycle** (Thesis §5.7): agents simulate overnight, humans review and set objectives during the day.

### 🔄 Dynamic Control Flows (Thesis Kuvio 4)

Three critical feedback loops connect the layers:

| Flow | Direction | Description |
|------|-----------|-------------|
| Strategic Direction & Creative Compromises | L5 → L3 | Scenario Strategist sets objectives for agents |
| Reward & Permission Protocol | L5 → L2 | Scenario Strategist calibrates simulation parameters |
| Proactive Alerts & Scenarios | L4 → L5 | Validated high-probability risks escalate to human review |

### 🔗 Self-Governing Workflows (Thesis §5.2)

Layers 2, 3, and 4 collectively form the **"Itseohjautuvat työnkulut"** (self-governing workflows), which always produce two outputs: **production artifacts + causal evidence** ("tuotos + todiste").

---

## 3. The CRR Metric — Compute-to-Rework Ratio (Thesis §5.8.2)

The thesis introduces **CRR** as the new primary KPI replacing Agile Velocity:

```
CRR = Simulation Inference Cost (€) / Avoided Human Rework Value (€)
```

- **Numerator**: Token costs + GPU infrastructure costs for latent simulation
- **Denominator**: Human expert-hours saved by detecting cascading failures in latent space before they reach production (at €80/hour senior developer rate)
- **Thesis example** (§5.8.2): 2M tokens @ €10 inference → detects critical memory leak → saves 15h senior dev time (€1,200) → **CRR = 0.008** (125x return)

> [!WARNING]
> **Compute Runaway Alert (Jevons Paradox)** (Thesis §5.8.1): As inference costs plummet, total compute consumption explodes. The Scenario Strategist must enforce **token budget ceilings** to prevent hallucination loops inflating cloud bills.

### 📏 CRR Interpretation Thresholds

| CRR Value | Interpretation |
|-----------|---------------|
| < 0.01 | Exceptional — AI costs negligible vs. rework |
| < 0.10 | Excellent — AI is 10x+ cheaper than human rework |
| < 0.50 | Good — Significant savings |
| < 1.00 | Warning — Margins thin, approaching Compute Runaway territory |
| ≥ 1.00 | Danger — AI costs exceed human rework value; recalibrate |

---

## 4. The 7-Phase Development Roadmap

> [!IMPORTANT]
> Phases marked 🟡 use the Gemini API as a unified backend approximation. The thesis (Taulukko 4) requires federated open-source models to be deployed for full architectural compliance.

| Phase | Name | Status | Thesis Grounding |
|-------|------|--------|-----------------|
| **1** | Conceptualization & Architecture | ✅ **DONE** | L3 causal reasoning & L4 Team of Rivals validated via thesis (§3, §4) |
| **2** | Proof of Concept (PoC) | ✅ **DONE** | L1 observation via MCP (§5.2), L3/L4 Worker/Critic agents |
| **3** | Prototype & OSS Orchestration | 🟡 **PARTIAL** | Thesis model stack (Taulukko 4) not yet deployed |
| **4** | Security & Compliance (SAIF) | 🟡 **PARTIAL** | Prompt-based sandboxing only; NemoClaw not deployed (§6.3.2) |
| **5** | Simulation Sandbox & Visualization | ✅ **DONE** | Dashboard, What-If Sandbox, telemetry visualizers |
| **6** | MVP & GCP Deployment | 🟡 **PARTIAL** | Cloud Run deployed; GPU instances not provisioned |
| **7** | Commercial V1.0 & XPRIZE | ⏳ **PENDING** | Demo video & narrative not started. Deadline: August 17, 2026 |

---

### ✅ Phase 1 — Conceptualization & Architecture

- **Objective**: Validate the underlying causal logic, prompt architecture, and thesis concepts.
- **Environment**: Google AI Studio / GCP.

| Task | Description | Status |
|------|-------------|--------|
| 1.1 | Test baseline logic and agentic reasoning | ✅ Done |
| 1.2 | Refine L4 Team of Rivals critique patterns for pseudo-alignment detection | ✅ Done |

---

### ✅ Phase 2 — Proof of Concept (PoC) within Antigravity

- **Objective**: Move from browser-testing to a localized, agent-driven workflow.
- **Environment**: Google Antigravity IDE.

| Task | Description | Status |
|------|-------------|--------|
| 2.1 | Ingest codebase via Antigravity Agent Manager | ✅ Done |
| 2.2 | MCP Integrations: Linear/Jira, GitHub, Slack, GCP | ✅ Done |
| 2.3 | Prototype Worker & Critic agents locally via Gemini API | ✅ Done |

---

### 🟡 Phase 3 — Prototype & Open-Source Multi-Agent Orchestration

- **Objective**: Scale into a standalone prototype using thesis-specified foundation models (Taulukko 4).
- **Environment**: GCP Compute Engine (GPU Instances).

| Task | Description | Status |
|------|-------------|--------|
| 3.1 | Deploy async Team of Rivals architecture prototype | ✅ Done |
| 3.2 | Deploy LMMs-Engine for L3 visual pipeline delegations (§2.3) | ❌ Not started |
| 3.3 | Integrate LeWM / Solaris as L2 Latent Simulation Core (§5.2) | ❌ Not started |
| 3.4 | Upgrade DebtDetector with causal evidence (probability distributions) | ❌ Not started |
| 3.5 | Implement V-JEPA 2.1 telemetry ingestion pipeline for L1 (§5.2) | ❌ Not started |

---

### 🟡 Phase 4 — Security, Compliance & Sandbox Validation

- **Objective**: Bridge the enterprise "Trust Gap" and establish digital sovereignty (Thesis §6.3.2).

| Task | Description | Status |
|------|-------------|--------|
| 4.1 | Apply Google's SAIF and AIDEFEND framework | ✅ Done |
| 4.2 | Implement Agent Least-Privilege and immutable event logs | ✅ Done |
| 4.3 | Run Adversarial Testing (Red Teaming for AI) | ✅ Done |
| 4.4 | Deploy NemoClaw & OpenShell sandboxed critics (§6.3.2) | ❌ Not started |

---

### ✅ Phase 5 — Simulation Sandbox & Production Visualization

- **Objective**: Translate latent-space simulations into actionable intelligence for the Scenario Strategist (§5.7, Kuvio 8).

| Task | Description | Status |
|------|-------------|--------|
| 5.1 | Implement "What-If Sandbox" for non-destructive production path testing | ✅ Done |
| 5.2 | Create high-scannability production management dashboard | ✅ Done |
| 5.3 | Develop telemetry visualizers for agent negotiation trees | ✅ Done |
| 5.4 | Use Stitch MCP for design system consistency | ✅ Done |
| 5.5 | Iterate UI/UX for full 5-layer architecture with causal evidence, debate logs, CRR gauges | ⏳ Ongoing |

---

### 🟡 Phase 6 — MVP & Full GCP Deployment

- **Objective**: Transition to production infrastructure and justify enterprise ROI for XPRIZE.
- **Environment**: Cloud Run (dashboard), Compute Engine w/ GPUs (L1/L2 models), Firestore (audit logs).

| Task | Description | Status |
|------|-------------|--------|
| 6.1 | Migrate web dashboard and orchestrator to Cloud Run | ✅ Done |
| 6.2 | Operationalize V-JEPA 2.1 & LeWM on GCP GPU instances (Taulukko 4) | ❌ Not started |
| 6.3 | Operationalize CRR Metric to prove ROI (§5.8.2) | ✅ Done |
| 6.4 | Implement cognitive budgeting tools to prevent Jevons Paradox (§5.8.1) | ✅ Done |

---

### ⏳ Phase 7 — Commercial V1.0, XPRIZE Submission & Go-to-Market

- **Objective**: XPRIZE submission and commercial launch (Thesis §6.5).

| Task | Description | Status |
|------|-------------|--------|
| 7.1 | Finalize XPRIZE Demo Video showcasing all 5 layers | ❌ Not started |
| 7.2 | Finalize XPRIZE Written Narrative (500–1000 words) | ❌ Not started |
| 7.3 | Launch Scenario Strategist marketing campaign (§5.3) | ❌ Not started |
| 7.4 | Establish Subscription Pricing Tiers: Basic ($19.99), Pro ($49.99), Enterprise ($99.99) | ❌ Not started |
| 7.5 | Execute localized Finnish game dev ecosystem launch (§6.5) | ❌ Not started |
| 7.6 | De-academicization & Commercial Rebranding: Remove thesis academicisms (Pearl L3, Jevons Paradox) from UI/UX and documentation to prepare the product for commercial launch. | ✅ Done |

---

## 5. Key Thesis References

| Concept | Thesis Location | Academic Source |
|---------|----------------|----------------|
| Paradox of Agility | §1.1, Kuvio 1 | Bianchi et al. (2020); Yu et al. (2025) |
| AI Maturity Levels L0–L4 | §2.1, Taulukko 1 | Yu et al. (2025) |
| Pearl's Causal Hierarchy | §2.2, Taulukko 3 | Pearl (2019) |
| World Model Technologies | §2.2, Taulukko 4 | Multiple (see table) |
| AsyncThink Protocol | §2.3 | Chi et al. (2025) |
| Actor-Network Theory | §2.4, throughout | Latour (2005) |
| Algorithmic Value Capture | §2.4, §6.2.2 | Nguyen (2026) |
| PWM Operating Logic | §5.2, Kuvio 3 | — |
| 5-Layer Architecture | §5.2, Kuvio 4 | — |
| Strategic Dishonesty Detection | §5.2.1 | Anthropic (2026) |
| Scenario Strategist Role | §5.3, Kuvio 5 | — |
| Team of Rivals Validation | §5.5, Kuvio 7 | Vijayaraghavan et al. (2026) |
| 24h Async Cycle | §5.7, Kuvio 8 | — |
| CRR Metric | §5.8.2 | — |
| Jevons Paradox | §5.8.1 | Jevons (1865); Stanford AI Index (2025) |
| Digital Sovereignty | §6.3.2 | Deloitte (2026); NemoClaw (NVIDIA, 2026b) |
| Strategic Synthesis | §6.5, Kuvio 9 | — |