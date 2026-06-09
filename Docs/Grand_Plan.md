# The Grand Plan: Project World Model (PWM) Framework

**Document Purpose**: This serves as the master blueprint for the technical development and commercialization of the Project World Model (PWM) Framework. It is derived directly from the "PWM Product Development Plan" feasibility study.

## Executive Summary
The PWM framework addresses the **"Paradox of Agility"** – the phenomenon where exponential asset generation by L1 AI models creates massive "integration debt," completely overwhelming linear, human-driven Agile/Scrum pipelines. PWM solves this by acting as a **Level 3 (L3) Causal Digital Twin**, orchestrating an asynchronous "Team of Rivals" to resolve embedded integration debt before it hits production.

**Academic Foundation**: The theoretical and conceptual framework of PWM is validated by Petri Paananen's Master's Thesis: *"Itseohjautuvat työnkulut videopeliteollisuudessa: tekoälyn maailmanmallit tuotannon johtamisen viitekehyksenä"* (AMK, 2026), published at URN: [https://urn.fi/URN:NBN:fi:amk-2026052919003](https://urn.fi/URN:NBN:fi:amk-2026052919003).

**Gemini XPRIZE Alignment**: PWM is entered in the **Build with Gemini XPRIZE Hackathon** (Small Business Services & Entrepreneurship categories), leveraging a fully native Google Cloud (GCP) stack for intensive GPU compute, serverless orchestration, and agentic validation.

---

## The 5-Layer Architecture (Open-Source Foundation Stack)
To fulfill the requirements of a true Digital Twin of the Organization (DTO), the architecture utilizes specialized, federated Open-Source AI models deployed on GCP:

1.  **Layer 1: Observation & State Tracking**: Ingests raw telemetric data and visual workflow observations into a structured latent space using **V-JEPA 2.1**. It acts as the "eyes" of the system, observing without text-based constraints.
2.  **Layer 2: The Latent Core & Simulation Engine**: The predictive cognitive engine utilizing **LeWorldModel (LeWM)** or **Solaris (DiT)**. It performs deep causal reasoning and parallel "what-if" counterfactuals in a computationally optimized latent space to protect proprietary data and keep Compute-to-Rework (CRR) ratios low.
3.  **Layer 3: Agentic Orchestration**: The asynchronous routing layer powered by **LMMs-Engine**. It delegates tasks dynamically by visually parsing complex topologies like Gantt charts and parallel workflow graphs.
4.  **Layer 4: Validation & Audit (Team of Rivals)**: The architectural firewall. Critic agents validate workflows within secure, air-gapped sandboxes using **NVIDIA NemoClaw & OpenShell** to prevent "strategic dishonesty" and Algorithmic Value Capture.
5.  **Layer 5: The Scenario Strategist**: The human-in-the-loop executive layer (FastAPI Dashboard) that sets objective functions, manages the intelligence budget, and exercises absolute veto power.

---

## The 7-Phase Development Roadmap

### Phase 1: Conceptualization and the Architectural Foundation
*   **Objective**: Validate the underlying causal logic and prompt architecture.
*   **Environment**: Google AI Studio / GCP.
*   **Tasks**:
    - [x] Test baseline logic and agentic reasoning. *(Completed: validated conceptually in Master's Thesis)*
    - [x] Refine system concepts for Layer 4 (Team of Rivals) to ensure critics accurately identify pseudo-alignment and adversarial inputs. *(Completed: validated conceptually in Master's Thesis)*

### Phase 2: Proof of Concept (PoC) Development within Google Antigravity
*   **Objective**: Move from browser-testing to a localized, highly integrated agent-driven workflow.
*   **Environment**: Google Antigravity IDE.
*   **Tasks**:
    - [x] Utilize Antigravity's **Agent Manager** and **Planning Mode** to ingest the codebase.
    - [x] Establish **MCP Integrations**: Connect to Linear/Jira (tasks), GitHub (version control), Slack (sentiment), Google Cloud Data (BigQuery/AlloyDB), and Data Commons.
    - [x] Prototype basic Worker and Critic agents locally.

### Phase 3: Prototype Construction and Open-Source Multi-Agent Orchestration
*   **Objective**: Scale into a standalone, continuously operating prototype using specialized foundation models.
*   **Environment**: GCP Compute Engine (GPU Instances).
*   **Tasks**:
    - [x] Deploy the asynchronous "Team of Rivals" architecture prototype.
    - [ ] Deploy **LMMs-Engine** for Layer 3 Agent Orchestration to handle visual pipeline delegations.
    - [ ] Integrate **LeWorldModel (LeWM)** / **Solaris** as the Layer 2 Latent Simulation Core to run highly cost-effective, latent-space "what-if" scenarios.
    - [ ] Upgrade **DebtDetector** to decode latent predictions into human-readable organizational bottlenecks.
    - [ ] Implement **V-JEPA 2.1** telemetry ingestion pipeline for Layer 1.

### Phase 4: Security, Compliance, and Sandbox Validation
*   **Objective**: Bridge the enterprise "Trust Gap" and establish absolute digital sovereignty.
*   **Tasks**:
    - [x] Apply Google's **SAIF** and the **AIDEFEND** framework. *(Completed: safety settings, input sanitization in base_agent.py)*
    - [x] Implement Agent Least-Privilege and Observability (immutable event logs). *(Completed: event logger and sandboxing constraints)*
    - [x] Run Adversarial Testing (Red Teaming for AI). *(Completed: pytest suite in tests/test_security_adversarial.py)*
    - [ ] Deploy **NVIDIA NemoClaw & OpenShell**: Sandbox the critic agents in secure enclaves to validate logic against hallucinated efficiencies.

### Phase 5: Simulation Sandbox & Production Visualization
*   **Objective**: Translate dense mathematical latent-space simulations into actionable human intelligence.
*   **Tasks**:
    - [x] Implement a "What-If Sandbox" for non-destructive alternative reality testing of production paths.
    - [x] Create an analytical, high-scannability production management dashboard tracking real-time data flows.
    - [x] Develop intuitive, automated telemetry visualizers that present complex agent negotiation trees clearly for the submission demo video.
    - [x] Use Stitch MCP to iterate on dashboard design system, generate screen variants, and maintain design consistency.
    - [ ] Iterate and enhance the app UI & UX to be more intuitive and easy to use for the XPRIZE demo (Ongoing).

### Phase 6: Minimum Viable Product (MVP) and Full GCP Deployment
*   **Objective**: Transition to highly scalable production infrastructure and justify the enterprise ROI for the XPRIZE Hackathon.
*   **Environment**: Google Cloud Platform (Cloud Run, Compute Engine, Firestore).
*   **Tasks**:
    - [x] Migrate web dashboard and orchestrator to Google Cloud Run for continuous, serverless execution.
    - [ ] Operationalize the heavy infrastructure (PyTorch, FlashAttention, Diffusers) required for V-JEPA and LeWM on GCP GPU instances.
    - [x] Operationalize the **CRR Metric (Compute-to-Rework Ratio)** to mathematically prove ROI to CFOs.
    - [x] Implement **Management Control of Compute** (cognitive budgeting tools) to prevent the *Jevons Paradox* (hallucination loops inflating cloud bills).

### Phase 7: Commercial V1.0, XPRIZE Submission, and Go-to-Market
*   **Objective**: XPRIZE Commercial launch and industry paradigm shift.
*   **Tasks**:
    - [ ] Finalize XPRIZE Demo Video showcasing the Dashboard and DTO Simulation logic.
    - [ ] Finalize XPRIZE Written Narrative (500–1000 words).
    - [ ] Launch the **Scenario Strategist** marketing campaign to reposition traditional Project Managers.
    - [ ] Establish **Subscription Pricing Tiers**: Basic ($19.99), Pro ($49.99), Enterprise ($99.99).
    - [ ] Execute localized launch within the mature **Finnish game development ecosystem** as the initial strategic testbed.