# 🚀 Build with Gemini XPRIZE — Devpost Submission Cheat Sheet

This document compiles all ready-to-copy text answers for your **Devpost submission forms** (Project Story Narrative & Additional Info fields) for **Project World Model (PWM)**.

---

## 📝 SECTION 1: Main Project Story (Narrative Tab)

### 📌 Project Title & Tagline
* **Project Name:** `Project World Model (PWM)`
* **Track Category:** `Small Business Services`
* **Short Description / Subtitle:** `Autonomous operational co-pilot & L3 Causal Digital Twin powered by Google Gemini to eliminate integration debt for small software engineering businesses.`

---

### 1. Inspiration
```text
Project World Model (PWM) was born out of a systemic crisis in modern software engineering: the "Paradox of Agility." While generative AI tools allow small development teams to generate code ten times faster, the cost of integrating that code has exploded. Hidden dependency collisions, architectural drift, and integration debt consume up to 40% of developer time in small engineering businesses and tech startups.

Traditional Agile/Scrum boards are passive and reactive—they track what broke yesterday rather than predicting what will break tomorrow. Grounded in Master's Thesis research at JAMK University of Applied Sciences, we set out to build an L3 Causal Digital Twin (CDT) that shifts software development from reactive bug-fixing to proactive, counterfactual scenario simulation.
```

---

### 2. What it does
```text
Project World Model acts as an autonomous operational co-pilot for small software development businesses, deploying a 5-layer architecture powered by Google Gemini and specialized open-source world models:

1. Continuous Telemetry Observation (Layer 1): Ingests version control events (GitHub MCP), task state changes (Linear MCP), and team communications, utilizing a V-JEPA 2.1 connector to encode project telemetry into latent spatial embeddings stored in a cryptographically chained, immutable JSON Lines event log.

2. Counterfactual Risk Forecasting (Layer 2): Driven by LeWM (Latent World Model) action-conditioned simulation engines, PWM predicts "what-if" branch merge scenarios in latent space before code is merged, calculating causal risk probabilities.

3. Agent Verification Engine (Layer 3 & 4): When conflicts arise, specialized Worker agents (QA, Build, Pipeline Integration) powered by Gemini 3.6 Flash and Gemini 3.1 Pro draft solutions. Critic agents powered by Gemini 3.6 Flash, Gemini 3.5 Flash, and Gemini 3.1 Pro run sandboxed verification inside isolated containers (NVIDIA NemoClaw architecture) to enforce code safety and SAIF compliance before code hits production.

4. CRR Intelligence Budgeting: Calculates the Compute-to-Rework Ratio (CRR):
   CRR = (Simulation Inference Cost €) / (Value of Avoided Rework €)
   This mathematically balances token spend against risk mitigation, preventing Jevons Paradox cost runaways.

5. Interactive 3D Classical Garden Digital Twin (Layer 5): Renders software project health as a living 3D garden in React + Babylon.js (and Three.js)—where blooming flowers represent verified features, wilted weeds signal technical debt, the Stone Well core reflects repository health, and AI Agent statues execute verification passes.
```

---

### 3. How we built it
```text
PWM is built natively on Google Cloud Platform and powered by a hybrid LLM and World Model AI stack:

• Google Gemini API Ecosystem (via Vertex AI):
  - Gemini 3.6 Flash: Serves as the primary high-speed reasoning engine for real-time telemetry ingestion, event parsing, and dynamic UI state updates.
  - Gemini 3.1 Pro: Executes deep causal reasoning, multi-branch conflict analysis, and complex code proposal generation for specialized Worker agents.
  - Gemini 3.5 Flash: Powers fast Critic agent validation loops, loop-detection audits, and SAIF security compliance checks.
  - Gemini 3.1 Pro: Used for analytical verification and deep code reasoning.

• Latent World Models & Middleware: Integrated connectors for V-JEPA 2.1 (Layer 1 representation learning) and LeWM (Layer 2 action-conditioned latent simulation).

• Sandboxed Execution: NVIDIA NemoClaw containerized sandbox environment for secure, isolated code execution auditing.

• Cloud Infrastructure & Tools: Hosted on Google Cloud Run with automatic scale-to-zero cost controls, integrated inside Google Antigravity IDE via the Model Context Protocol (MCP), and visualized using a glassmorphic React + Babylon.js / Three.js 3D frontend.
```

---

### 4. Challenges we ran into
```text
1. Preventing Agent Pseudo-Alignment: Ensuring AI Critic agents do not silently approve flawed code proposals required building strict sandboxed validation layers with string-similarity loop detection and red-team security filters.

2. Controlling Model Compute Overhead: Autonomous 24-hour agent loops can quickly generate runaway API token costs. We solved this by implementing the CRR (Compute-to-Rework Ratio) engine and configuring Cloud Run scale-to-zero thresholds.

3. Spatial Graph Rendering: Mapping abstract git branch dependencies and issue tickets into intuitive 3D spatial elements (PR bushes, Issue weeds, Stone Well core health, and AI Agent statues) required custom PBR shader pipelines and spatial collision algorithms.
```

---

### 5. Accomplishments that we're proud of
```text
• Production-Ready 5-Layer Architecture: Deployed a fully operational Causal Digital Twin on Google Cloud Run capable of running real-time counterfactual simulations.
• Ultra-Efficient Token Utilization: Executed over 4.5 million Gemini API tokens during testing while maintaining total July 2026 GCP operational infrastructure costs at just €34.92 (~$38 USD).
• Academic to Production Bridge: Successfully translated peer-reviewed Master's Thesis theory into a live, working application.
• 100% Test & Build Health: Maintained a clean 62/62 test suite pass rate and zero-error TypeScript visualizer build.
```

---

### 6. What we learned
```text
• Gemini Multi-Agent Orchestration: How to coordinate specialized Gemini 3.6 Flash, 3.1 Pro, 3.5 Flash, and 2.5 Pro models via Vertex AI to execute complex "Fork-Delegate-Join" verification loops overnight.
• Spatial Situational Awareness: That 3D digital twin visualizations give developers significantly faster spatial intuition regarding project health than traditional flat Kanban boards.
• Cost-Governed Autonomy: How mathematical KPIs like CRR allow small businesses to leverage autonomous AI agents without risking unthrottled billing surprises.
```

---

### 7. What's next for Project World Model
```text
• Small Business SaaS Onboarding: Rolling out closed beta access to small software businesses and tech startups.
• Live Stream Ingestors: Expanding Layer 1 connectors for real-time Slack and Discord WebSocket streaming.
• Self-Supervised Latent Space Calibration (Phase 8): Grounding LeWM simulation predictions against observed actual outcomes to continuously fine-tune latent state vectors.
• Commercial SaaS Tier Launch: Activating tiered subscription plans (Free Hobby $0/mo, Starter $9.99/mo, Pro $49.99/mo, Enterprise $99.99/mo) with included compute quotas and a Three-Gate overage model that defaults to throttled mode — ensuring customers are never surprised by costs.
```

---

## 📋 SECTION 2: Additional Info Form Fields

| Devpost Field Name | Required | Ready-to-Copy Value / Response |
| :--- | :---: | :--- |
| **Project Start Date** | `Yes` | `May 1, 2026` *(Repo initialized April 29, 2026)* |
| **Revenue by Month (USD)** | `Yes` | `May: $0, June: $0, July: $0, August: $0` |
| **Related-Party Revenue (USD)** | `Yes` | `$0. No revenue was earned from team members, family, related entities, or pre-existing relationships during the hackathon period.` |
| **Total Revenue (USD)** | `Yes` | `$0` |
| **Explanation of Revenue** | `Yes` | *(See block below)* |
| **Upload Profit Evidence (P&L)** | `Yes` | Upload file: `Docs/PWM_Profit_and_Loss_Statement.csv` |
| **Total Expenses (USD)** | `Yes` | `$38.00 USD` *(€34.92)* |
| **Total Cost of Goods Sold (COGS)**| `Yes` | `$38.00 USD (€34.92) covering Gemini API inference tokens (Gemini 3.5/3.6 Flash and 3.1 Pro) and Google Cloud container/storage hosting.` |
| **Total Marketing & CAC Expense** | `Yes` | `$0` |
| **Explanation of Marketing Expenses**| `No` | `None.` |
| **Additional Expenses** | `No` | `None. All infrastructure costs are detailed under COGS above.` |
| **Number of Users Acquired** | `Yes` | `0` |
| **Number of Paying Users** | `Yes` | `0` |
| **Testimonial** | `No` | `Not yet available.` |
| **Customer Concentration Confirmation**| `Yes` | `[x] Confirmed` |
| **AI Impact & Category Fit** | `Yes` | *(See block below)* |
| **Business Model** | `Yes` | *(See block below)* |
| **Business Model Sustainability** | `Yes` | *(See block below)* |
| **Sustainability Plan** | `Yes` | *(See block below)* |
| **AI Tools Leveraged** | `Yes` | `Gemini 3.6 Flash, Gemini 3.5 Flash, Gemini 3.1 Pro, Google Antigravity IDE (Agent Manager), and the Model Context Protocol (MCP) server ecosystem.` |
| **Business Operations with AI** | `Yes` | `AI orchestrators coordinate git commit monitoring, issue tracking via Linear/GitHub MCPs, debt risk analysis, and propose code changes. This keeps internal operational costs low, running a fully automated pipeline with minimal human intervention.` |
| **AI Live in Production** | `Yes` | `Our agents monitor the development branch, generate pull request merge proposals, and flag architectural conflicts. The Scenario Strategist (human) retains ultimate veto power over major merge decisions, while routine conflict checks and resolution validations are automated by the Critic agent.` |
| **Google Cloud Product Usage** | `Yes` | `- Google Cloud Run: Hosts the async orchestrator loop and background agents.\n- Vertex AI API: Serves LLM requests (Gemini) with low-latency access and token metrics.\n- Google Cloud Firestore: Records execution logs and event histories securely.` |
| **Gemini API & LLM Call Details** | `Yes` | `The project utilizes Gemini 3.6 Flash (for default agent reasoning and high-speed telemetry ingestion), Gemini 3.1 Pro (for deep causal reasoning and complex Worker agent conflict resolutions), and Gemini 3.5 Flash (for fast validation checks by the Critic agent). The Gemini API is called via the google-genai SDK inside the BaseAgent class.` |
| **GitHub Repository Link** | `Yes` | `https://github.com/petripaananen/Project-World-Model` |
| **GitHub Verification Confirmation** | `Yes` | `[x] Confirmed (Shared with testing@devpost.com and judging@hacker.fund)` |
| **Evidence of Running Product URL** | `Yes` | `https://github.com/petripaananen/Project-World-Model/blob/main/walkthrough.md` |
| **Evidence of Profit URL** | `Yes` | `https://github.com/petripaananen/Project-World-Model/blob/main/Docs/evidence_of_profit.md` |
| **Team Learning Level** | `Yes` | `Extremely High` |
| **Circle Agentic Economy Opt-In** | `Optional` | `Do not opt in` |

---

### Detailed Multi-Line Responses for Additional Info Fields

#### 🟢 Explanation of Revenue Shared Above
```text
$0 Total Revenue. Project World Model remained in a pre-launch / closed beta state during the Build with Gemini XPRIZE hackathon period (May–August 2026). No subscription fees, licensing fees, or transaction charges were collected (Price per customer: $0, Paying users: 0, Total transactions: 0). Tiered SaaS subscription pricing (Free Hobby $0/mo, Starter $9.99/mo, Pro $49.99/mo, Enterprise $99.99/mo) with included simulation compute quotas and a transparent Three-Gate overage policy will activate upon commercial V1.0 launch.
```

#### 🟢 AI Impact & Category Fit
```text
PWM acts as an L3 Causal Digital Twin in the Small Business Services category, resolving the "Paradox of Agility" for software development teams and tech startups. By using an Agent Verification Engine (Worker + Critic agents) to autonomously resolve integration debt before code merges hit production, it eliminates software release delays, prevents costly manual re-work, and empowers small engineering businesses to scale safely.
```

#### 🟢 Business Model
```text
SaaS subscription model targeting small-to-medium development teams and software engineering startups, offering four tiered plans: Free Hobby ($0/mo, 1M tokens), Starter ($9.99/mo, 5M tokens), Pro ($49.99/mo, 25M tokens), and Enterprise ($99.99/mo, 100M tokens). Tiers are differentiated by included compute quotas (simulation tokens/mo), repo count, and concurrent simulated branches. A Three-Gate overage model (soft warning → throttle/pay-as-you-go choice → hard cap) ensures transparent cost control.
```

#### 🟢 Business Model Sustainability & Viability
```text
(1) Five-Year Goal & Market Opportunity:
- Total Addressable Market (TAM): The global market for AI software development tools is projected to reach $240B by late 2026, with automated AI testing growing at a 30% CAGR.
- Target Market Share & Revenue (Year 5): Capturing 0.05% of the market ($120M ARR) across ~30,000 registered users (~18,000 paid: Starter $9.99/mo, Pro $49.99/mo, Enterprise $99.99/mo) with additional overage revenue from pay-as-you-go compute.

(2) Path to Profitability & P&L Projections:
- Year 1: $150K ARR by launching across small business software teams. Cash-flow positive status in Month 10.
- Year 2: $1.2M ARR with ~82% gross margins as CRR cost-optimization algorithms control LLM token spend.
- Year 3–5: Scaling to $15M (Y3) -> $50M (Y4) -> $120M (Y5) ARR with net operating margins >35%.

(3) Why It’s Achievable:
- Value Hypothesis: Addresses the "Agility Paradox" where rapid AI code generation creates massive integration debt. PWM's Agent Verification Engine automates QA/integration, delivering a 10x ROI for small businesses.
- Hackathon Traction: Our agents executed over 4.5M tokens across Gemini 3.6 Flash, 3.5 Flash, and 3.1 Pro with zero cash wasted, running live counterfactual simulations on Cloud Run with a July 2026 operational cost of only €34.92 ($38 USD).
```

#### 🟢 Sustainability Plan
```text
By acquiring initial paying customers across small software development businesses, tech startups, and engineering teams, bootstrapping operational costs via early subscriptions, and establishing cloud efficiency guidelines (such as the Compute-to-Rework Ratio, CRR) to strictly govern model API inference overhead.
```

---

## 📁 Related Submission Files in Repository
* **P&L File:** [PWM_Profit_and_Loss_Statement.csv](file:///c:/Users/petri/.gemini/antigravity/ProjectWorldModel/Docs/PWM_Profit_and_Loss_Statement.csv)
* **Evidence of Profit Doc:** [evidence_of_profit.md](file:///c:/Users/petri/.gemini/antigravity/ProjectWorldModel/Docs/evidence_of_profit.md)
* **Narrative Source Doc:** [XPRIZE_NARRATIVE.md](file:///c:/Users/petri/.gemini/antigravity/ProjectWorldModel/Docs/XPRIZE_NARRATIVE.md)
* **Demo Script Doc:** [XPRIZE_DEMO_SCRIPT.md](file:///c:/Users/petri/.gemini/antigravity/ProjectWorldModel/Docs/XPRIZE_DEMO_SCRIPT.md)
* **Instructions Doc:** [XPRIZE_INSTRUCTIONS.md](file:///c:/Users/petri/.gemini/antigravity/ProjectWorldModel/Docs/XPRIZE_INSTRUCTIONS.md)

