# Build with Gemini XPRIZE — Project Story (Devpost)

**Project Name:** Project World Model (PWM)  
**Track Category:** Small Business Services  
**Author / Lead Developer:** Petri Paananen  
**Academic Basis:** Paananen, P. (2026). *Itseohjautuvat työnkulut videopeliteollisuudessa: tekoälyn maailmanmallit tuotannon johtamisen viitekehyksenä.* JAMK University of Applied Sciences.

---

## Inspiration

Project World Model (PWM) was born out of a systemic crisis in modern software engineering: the **"Paradox of Agility."** While generative AI tools allow small development teams to generate code ten times faster, the cost of *integrating* that code has exploded. Hidden dependency collisions, architectural drift, and integration debt consume up to 40% of developer time in small engineering businesses and tech startups.

Traditional Agile/Scrum boards are passive and reactive—they track what broke yesterday rather than predicting what will break tomorrow. Grounded in Master's Thesis research at JAMK University of Applied Sciences, we set out to build an **L3 Causal Digital Twin (CDT)** that shifts software development from reactive bug-fixing to proactive, counterfactual scenario simulation.

---

## What it does

Project World Model acts as an autonomous operational co-pilot for small software development businesses, deploying a 5-layer architecture powered by Google Gemini and specialized open-source world models:

1. **Continuous Telemetry Observation (Layer 1)**: Ingests version control events (GitHub MCP), task state changes (Linear MCP), and team communications, utilizing a **V-JEPA 2.1** connector to encode project telemetry into latent spatial embeddings stored in a cryptographically chained, immutable JSON Lines event log.
2. **Counterfactual Risk Forecasting (Layer 2)**: Driven by **LeWM (Latent World Model)** action-conditioned simulation engines, PWM predicts "what-if" branch merge scenarios in latent space before code is merged, calculating causal risk probabilities.
3. **Agent Verification Engine (Layer 3 & 4)**: When conflicts arise, specialized Worker agents (QA, Build, Pipeline Integration) powered by **Gemini 3.6 Flash** and **Gemini 3.1 Pro** draft solutions. Critic agents powered by **Gemini 3.6 Flash**, **Gemini 3.5 Flash**, and **Gemini 2.5 Pro** run sandboxed verification inside isolated containers (**NVIDIA NemoClaw** architecture) to enforce code safety and SAIF compliance before code hits production.
4. **CRR Intelligence Budgeting**: Calculates the **Compute-to-Rework Ratio (CRR)**:
   $$\text{CRR} = \frac{\text{Simulation Inference Cost } (€)}{\text{Value of Avoided Rework } (€)}$$
   This mathematically balances token spend against risk mitigation, preventing Jevons Paradox cost runaways.
5. **Interactive 3D Classical Garden Digital Twin (Layer 5)**: Renders software project health as a living 3D garden in React + Babylon.js (and Three.js)—where blooming flowers represent verified features, wilted weeds signal technical debt, the Stone Well core reflects repository health, and AI Agent statues execute verification passes.

---

## How we built it

PWM is built natively on Google Cloud Platform and powered by a hybrid LLM and World Model AI stack:

- **Google Gemini API Ecosystem (via Vertex AI)**:
  - **Gemini 3.6 Flash**: Serves as the primary high-speed reasoning engine for real-time telemetry ingestion, event parsing, and dynamic UI state updates.
  - **Gemini 3.1 Pro**: Executes deep causal reasoning, multi-branch conflict analysis, and complex code proposal generation for specialized Worker agents.
  - **Gemini 3.5 Flash**: Powers fast Critic agent validation loops, loop-detection audits, and SAIF security compliance checks.
  - **Gemini 2.5 Pro**: Used for analytical fallback checks and structured code verification.
- **Latent World Models & Middleware**: Integrated connectors for **V-JEPA 2.1** (Layer 1 representation learning) and **LeWM** (Layer 2 action-conditioned latent simulation).
- **Sandboxed Execution**: **NVIDIA NemoClaw** containerized sandbox environment for secure, isolated code execution auditing.
- **Cloud Infrastructure & Tools**: Hosted on **Google Cloud Run** with automatic scale-to-zero cost controls, integrated inside **Google Antigravity IDE** via the **Model Context Protocol (MCP)**, and visualized using a glassmorphic React + Babylon.js / Three.js 3D frontend.

---

## Challenges we ran into

1. **Preventing Agent Pseudo-Alignment**: Ensuring AI Critic agents do not silently approve flawed code proposals required building strict sandboxed validation layers with string-similarity loop detection and red-team security filters.
2. **Controlling Model Compute Overhead**: Autonomous 24-hour agent loops can quickly generate runaway API token costs. We solved this by implementing the CRR (Compute-to-Rework Ratio) engine and configuring Cloud Run scale-to-zero thresholds.
3. **Spatial Graph Rendering**: Mapping abstract git branch dependencies and issue tickets into intuitive 3D spatial elements (PR bushes, Issue weeds, Stone Well core health, and AI Agent statues) required custom PBR shader pipelines and spatial collision algorithms.

---

## Accomplishments that we're proud of

- **Production-Ready 5-Layer Architecture**: Deployed a fully operational Causal Digital Twin on Google Cloud Run capable of running real-time counterfactual simulations.
- **Ultra-Efficient Token Utilization**: Executed over 4.5 million Gemini API tokens during testing while maintaining total July 2026 GCP operational infrastructure costs at just **€34.92** (~$38 USD).
- **Academic to Production Bridge**: Successfully translated peer-reviewed Master's Thesis theory into a live, working application.
- **100% Test & Build Health**: Maintained a clean 62/62 test suite pass rate and zero-error TypeScript visualizer build.

---

## What we learned

- **Gemini Multi-Agent Orchestration**: How to coordinate specialized Gemini 3.6 Flash, 3.1 Pro, 3.5 Flash, and 2.5 Pro models via Vertex AI to execute complex "Fork-Delegate-Join" verification loops overnight.
- **Spatial Situational Awareness**: That 3D digital twin visualizations give developers significantly faster spatial intuition regarding project health than traditional flat Kanban boards.
- **Cost-Governed Autonomy**: How mathematical KPIs like CRR allow small businesses to leverage autonomous AI agents without risking unthrottled billing surprises.

---

## What's next for Project World Model

- **Small Business SaaS Onboarding**: Rolling out closed beta access to small software businesses and tech startups.
- **Live Stream Ingestors**: Expanding Layer 1 connectors for real-time Slack and Discord WebSocket streaming.
- **Self-Supervised Latent Space Calibration (Phase 8)**: Grounding LeWM simulation predictions against observed actual outcomes to continuously fine-tune latent state vectors.
- **Commercial SaaS Tier Launch**: Activating tiered subscription plans ($19.99/mo Basic, $49.99/mo Pro, $99.99/mo Enterprise).
