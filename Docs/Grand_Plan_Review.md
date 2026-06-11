# 🌍 Project World Model — Grand Plan Review

**Date**: June 10, 2026  
**Status**: Phase 1 ✅ → Phase 2 ✅ → Phase 3 🟡 (Gemini-only prototype; thesis model stack NOT YET deployed) → Phase 4 🟡 (Prompt-based sandbox only; NemoClaw NOT YET deployed) → Phase 5 ✅ → Phase 6 🟡 (Cloud Run deployed; GPU instances NOT YET provisioned)

**Canonical Source of Truth**: [Petri_Paananen_thesis.md](./Petri_Paananen_thesis.md) — Paananen, P. (2026). *Itseohjautuvat työnkulut videopeliteollisuudessa: tekoälyn maailmanmallit tuotannon johtamisen viitekehyksenä.* JAMK University of Applied Sciences.

---

## 1. The Big Picture

PWM is a **Causal Digital Twin (CDT)** (Thesis §5.2) that solves the **"Paradox of Agility"** (Thesis §1.1) — where AI-generated assets overwhelm human-driven Agile pipelines. It uses an **Agent Verification Engine** (Thesis §5.5) with specialized Worker + Critic agents to autonomously detect and resolve integration debt *before* it reaches production.

The system targets **Causal Counterfactual Reasoning** (Thesis §2.2), enabling "what if?" scenario analysis in latent space — beyond the Level 1 (Association) capabilities of traditional Agile dashboards.

**Target**: [Gemini XPRIZE Hackathon](./XPRIZE_INSTRUCTIONS.md) — Small Business Services & Entrepreneurship categories.

---

## 2. The 7-Phase Roadmap — Honest Status Assessment

> [!WARNING]
> **Phase 3 is NOT truly completed.** The prototype uses the Gemini API as a unified backend for ALL layers. The thesis (Taulukko 4) requires federated open-source models: V-JEPA 2.1 (L1), LeWM (L2), LMMs-Engine (L3), NemoClaw (L4). Until these are deployed, PWM operates as a Gemini-powered approximation of the thesis architecture, not the actual architecture itself.

| Phase | Name | Status | Thesis Alignment |
|-------|------|--------|-----------------|
| **1** | Conceptualization & Architecture | ✅ **DONE** | Concepts validated through Master's Thesis research (Thesis §3, §4) |
| **2** | Proof of Concept (PoC) | ✅ **DONE** | L1 observation via MCP (Thesis §5.2 — two of three input streams implemented) |
| **3** | Prototype & OSS Orchestration | 🟡 **PARTIAL** | Worker+Critic deployed (Thesis Kuvio 7), but using Gemini API instead of thesis model stack (Taulukko 4). |
| **4** | Security & Compliance (SAIF) | 🟡 **PARTIAL** | Prompt-based sandboxing ≠ NemoClaw/OpenShell air-gapped enclaves (Thesis §6.3.2). No pseudo-alignment detection. |
| **5** | Simulation Sandbox & Visualization | ✅ **DONE** | Dashboard shows CRR, What-If Sandbox, conflict cards. Needs L2 latent simulation outputs and Agent Verification Engine debate logs. |
| **6** | MVP & GCP Deployment | 🟡 **PARTIAL** | Cloud Run deployed. No GPU instances for V-JEPA/LeWM. CRR tracks token costs only, not GPU/electricity costs (Thesis §5.8.2). |
| **7** | Commercial V1.0 & XPRIZE | ⏳ **PENDING** | Demo video and narrative not started. Deadline: August 17, 2026. |

---

## 3. Architecture Gap Analysis — Thesis vs. Implementation

### Layer 1: Observation & Spatial Understanding (Thesis §5.2)

| Thesis Requirement | Implementation | Gap |
|--------------------|-----------------|----|
| Three input streams: version control, task management, team communication (Thesis §5.2) | GitHub MCP ✅, Linear MCP ✅ | ❌ Team communication (Slack/Discord) not connected |
| V-JEPA 2.1 encoding of telemetry into latent embeddings | Raw data passed to Gemini API as text | ❌ No V-JEPA encoder |
| Immutable event log as "muuttumaton liikkuja" (Thesis §5.2) | JSON Lines event logger with SHA-256 Merkle chain | ✅ Done |
| LingBot-World for local edge inference | Not implemented | ❌ Future phase |

### Layer 2: Latent Simulation Core (Thesis §5.2)

| Thesis Requirement | Implementation | Gap |
|--------------------|-----------------|----|
| LeWM action-conditioned latent simulation | Gemini API semantic analysis in `debt_detector.py` | ❌ No latent-space model |
| SIGReg regularization preventing representation collapse | Not applicable (no latent model) | ❌ Requires LeWM/LeJEPA |
| Causal evidence with probability distributions (Thesis §5.2) | Probabilistic counterfactuals and chains | ✅ Done |
| CRR tracking GPU + electricity costs | Token, GPU, and electricity cost tracking | ✅ Done |
| Jevons Paradox detection (Thesis §5.8.1) | Dashboard threshold alerts | ✅ Done |

### Layer 3: Agentic Orchestration (Thesis §2.3, §5.2)

| Thesis Requirement | Implementation | Gap |
|--------------------|-----------------|----|
| AsyncThink Fork-Delegate-Join | Single Worker agent + asyncio.Queue | 🟡 Queue-based, but not true fork-delegate-join |
| Specialized workers: QA, Build, Art Integration (Thesis Kuvio 7) | WorkerAgentFactory with domain specialists | ✅ Done |
| LMMs-Engine visual pipeline parsing | Not implemented | ❌ Future phase |
| Muse Spark multimodal orchestration | Not implemented | ❌ Future phase |

### Layer 4: Validation & Agent Verification Engine (Thesis §5.5)

| Thesis Requirement | Implementation | Gap |
|--------------------|-----------------|----|
| NemoClaw/OpenShell sandboxed critics | Prompt-based sandbox instructions | ❌ Not an air-gapped enclave |
| Strategic dishonesty detection (Thesis §5.2.1) | String-similarity loop detection | 🟡 Detects repetition, not intentional deception |
| Pseudo-alignment detection | Not implemented | ❌ |
| Hierarchical debate with veto | Single Worker↔Critic loop | 🟡 Iterative but not hierarchical |

### Layer 5: Scenario Strategist (Thesis §5.3, §5.7)

| Thesis Requirement | Implementation | Gap |
|--------------------|-----------------|----|
| Dashboard with CRR intelligence budget gauge | CRR display with Compute Runaway alerts | ✅ Done |
| 24h async cycle visualization (Thesis Kuvio 8) | Day/night phase indicator via /api/cycle | ✅ Done |
| Agent Verification Engine debate log (Thesis Kuvio 7) | Negotiation tree with specialist agent verdicts | ✅ Done |
| Causal evidence cards with probability distributions | Conflict cards with Causal Risk Forecast probability bars | ✅ Done |
| Qualitative objective function editor (Thesis §5.3) | Not implemented | ❌ Future phase |

---

## 4. What's Been Built So Far

### 📁 Repository Structure
```
Project World Model/
├── README.md                    ← Project overview & XPRIZE framing
├── Dockerfile                   ← Docker container configuration for Cloud Run
├── deploy.sh                    ← GCP Cloud Run deployment script
├── Docs/                        ← Design documents & thesis
│   ├── Grand_Plan.md            ← Master blueprint (thesis-grounded)
│   ├── Grand_Plan_Review.md     ← This document (thesis-grounded status review)
│   ├── Petri_Paananen_thesis.md ← Master's thesis (canonical source of truth)
│   ├── GCP_SETUP.md             ← GCP configurations, IAM, Firestore
│   ├── PWM_Prototype_Blueprint  ← Concrete prototyping steps
│   ├── xprize_additional_info.md ← XPRIZE additional questions draft
│   └── Production World Model...Roadmap.md ← Layer-to-model mapping
├── pwm/                         ← Active codebase
│   ├── main.py                  ← Main entry with web/orchestration modes
│   ├── config.py                ← Project configuration (GCP, models, CRR)
│   ├── requirements.txt         ← Python dependencies
│   ├── agents/                  ← Worker, Critic, Base agents (Gemini-powered)
│   ├── ingestion/               ← GitHub & Linear MCP ingestion (L1)
│   ├── logging/                 ← Event logger (L1 immutable log)
│   ├── simulation/              ← CRR engine & debt detector (L2 approximation)
│   └── dashboard/               ← FastAPI Web dashboard (L5)
├── tests/                       ← Test suite
│   └── test_security_adversarial.py ← Security hardening tests
└── papervizagent/               ← Reference implementation (forked)
```

### ✅ Completed & Thesis-Aligned
- **Theoretical framework** — fully validated via Master's Thesis (§3–§6).
- **5-Layer Architecture documentation** — diagrammed and mapped to thesis Kuvio 3, 4, 7, 8.
- **Layer 1 partial**: GitHub + Linear MCP ingestion, JSON Lines event logger.
- **Layer 2 approximation**: Gemini-powered semantic conflict detection, CRR token cost tracking.
- **Layer 3 partial**: Worker agent with queue-based async orchestration.
- **Layer 4 partial**: Critic agent with prompt-based safety, adversarial test suite.
- **Layer 5**: FastAPI glassmorphic web dashboard, What-If Sandbox, WebSocket telemetry.
- **GCP deployment**: Cloud Run + Firestore + Vertex AI endpoints deployed.
- **SAIF compliance**: Safety filters, input sanitizer, sandbox instructions, red-team tests.

### ❌ Not Yet Implemented (Required by Thesis)
- V-JEPA 2.1 encoder (L1) — Thesis Taulukko 4
- LeWM latent simulation engine (L2) — Thesis Taulukko 4; Maes et al. (2026)
- LMMs-Engine visual pipeline parsing (L3) — Thesis Taulukko 4
- NemoClaw/OpenShell sandboxed critics (L4) — Thesis §6.3.2; NVIDIA (2026b)
- Specialized worker agents: QA, Build, Art Integration (L3) — Thesis Kuvio 7
- Pseudo-alignment detection (L4) — Anthropic (2026)
- Cryptographic event log chaining (L1) — Thesis §5.2 "muuttumaton liikkuja"
- GPU cost tracking in CRR (L2) — Thesis §5.8.2 "tokens per watt"
- 24h async cycle visualization (L5) — Thesis §5.7, Kuvio 8
- GCP GPU instance provisioning — Required for V-JEPA/LeWM

---

## 5. XPRIZE Deliverable Readiness

The [XPRIZE submission checklist](./XPRIZE_INSTRUCTIONS.md) requires:

| Deliverable | Status | Notes |
|-------------|--------|-------|
| GitHub Repo (shared w/ Devpost judges) | ✅ DONE | [petripaananen/Project-World-Model](https://github.com/petripaananen/Project-World-Model) |
| 3-Minute Demo Video | ❌ Not started | Needs dashboard recording showing 5-layer architecture |
| Written Narrative (500–1000 words) | ❌ Not started | Must reference thesis concepts (CRR, Agent Verification Engine, Paradox of Agility) |
| Revenue Evidence (Stripe/P&L) | ❌ Not started | Zero-dollar declaration is acceptable |
| Expense Evidence | ❌ Not started | GCP costs to document |
| Product Evidence (agent logs, API usage) | ✅ DONE | Events generated by pipeline sessions |
| Customer Evidence (testimonials) | ❌ Not started | — |
| Additional Info Responses | 🟡 In Draft | [xprize_additional_info.md](./xprize_additional_info.md) |

---

## 6. Strategic Assessment

### 🎯 Strengths
- **Academic credibility**: The Master's Thesis provides a peer-reviewed conceptual foundation most hackathon entries lack (Thesis §4.2, §5).
- **Clear 5-layer architecture**: Well-separated concerns mapping to the thesis framework.
- **Production dashboard**: Modern glassmorphic UI with real-time data, conflict cards, and What-If sandbox.
- **CRR metric**: A novel KPI backed by the thesis (§5.8.2) with concrete cost/benefit calculation.
- **SAIF security posture**: Safety filters, sanitizers, and adversarial tests implemented.

### ⚠️ Critical Gaps (Thesis Alignment)
1. **Gemini monolith vs. federated OSS stack**: The thesis (Taulukko 4) specifies V-JEPA 2.1, LeWM, LMMs-Engine, NemoClaw as distinct components. Currently everything runs through a single Gemini API. This means the prototype demonstrates the *concept* but not the *architecture* the thesis defines.
2. **No GPU compute**: The thesis emphasizes local single-GPU execution capability (LeWM) and digital sovereignty (Thesis §6.3.2). Without GPU instances, the latent simulation core (L2) cannot run.
3. **No sandboxed validation**: Prompt-based sandbox ≠ NemoClaw air-gapped enclave. Without this, L4 cannot detect strategic dishonesty as the thesis requires (Thesis §5.2.1).
4. **CRR incomplete**: Tracks only token costs, not GPU/electricity (Thesis §5.8.2).

### 🚀 Recommended Priority Order

> [!IMPORTANT]
> **Dual track**: Build the thesis-faithful architecture AND prepare the XPRIZE deliverables in parallel.

1. **Architecture Track** (implements thesis Taulukko 4):
   - Deploy `pwm/layers/` package implementing the 5-layer pipeline (Kuvio 4)
   - Add cryptographic event log chaining (L1 "muuttumaton liikkuja")
   - Implement specialized worker agents (L3 Kuvio 7)
   - Add causal evidence with probability distributions (L2)
   - Provision GCP GPU instance for V-JEPA/LeWM (when ready)

2. **XPRIZE Track** (deadline: August 17, 2026):
   - Record 3-minute demo video from running dashboard
   - Write 500–1000 word narrative grounded in thesis concepts
   - Finalize financial declarations and expense evidence
   - Ensure GitHub repo is submission-ready

---

## 7. Open Questions & Resolutions

### 🏁 Resolved Questions
- **Dashboard framework**: FastAPI with WebSockets, Warm Minimalism + Glassmorphic themes
- **Security approach**: SAIF + AIDEFEND, verified via adversarial tests
- **Deployment**: Docker → Cloud Run, project `project-world-model`, region `us-central1`
- **Audit logging**: Firestore for cloud, JSON Lines for local
- **Agent API routing**: Vertex AI endpoints with IAM service credentials
- **Financial declarations**: Zero-dollar revenue is acceptable for XPRIZE

### ❓ Remaining Open Questions
1. **GCP GPU quota**: What GPU type is available (T4, L4, A100)? Budget?
2. **Model priority**: Deploy all thesis models (V-JEPA, LeWM, LMMs-Engine, NemoClaw) or start with core (V-JEPA + LeWM)?
3. **Deployment topology**: Cloud Run dashboard + GCE GPU models (hybrid), or everything on GCE?
4. **Game engine telemetry**: Thesis L1 requires three input streams. What provides stream 3 (game engine data)?
5. **XPRIZE demo video**: When to record? Wait for architecture changes, or record current state?
