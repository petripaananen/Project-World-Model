# Project World Model (PWM) - Prototype Blueprint

## 1. Core Product Vision
The PWM framework addresses the **"Agility Paradox"**—the crushing integration debt caused by GenAI's exponential asset generation colliding with linear Agile methodologies. 

By operating as an **L3 Causal Digital Twin**, PWM shifts project management from reactive tracking (Kanban) to predictive, latent-space simulation. It elevates the human from a micro-managing Producer to a **Scenario Strategist** who manages intelligence budgets and creative boundaries.

## 2. The 5-Layer Architecture (PoC Implementation)

### Layer 1: Observation & Ingestion (The Senses)
*   **Goal**: Ground the AI in absolute organizational truth.
*   **Implementation**: Leverage **Model Context Protocol (MCP)**.
    *   *Current State*: We have access to the GitHub MCP. We can configure Jira/Linear and Slack MCPs via `mcp_config.json` to ingest real-time project state and team sentiment.

### Layer 2: Latent Simulation Core (The Brain)
*   **Goal**: Causal reasoning and "what-if" counterfactuals without heavy pixel rendering.
*   **Implementation**: For the MVP, we simulate the V-JEPA/LingBot-World semantic abstractions by using Gemini 3.1 Pro's massive context window to map code/asset dependencies and calculate the **Compute-to-Rework Ratio (CRR)**.

### Layer 3: Agentic Orchestration (The Workforce)
*   **Goal**: Asynchronous execution of parallel resolution streams.
*   **Implementation**: Utilize Google Agent Development Kit (ADK) and the `AsyncThink` protocol. We will spawn specialized worker agents (e.g., Code Refactor Agent, Dependency Resolver).

### Layer 4: Validation / "Team of Rivals" (The Immune System)
*   **Goal**: Prevent *Algorithmic Value Capture* and *Strategic Dishonesty*.
*   **Implementation**: We will build independent **Critic Agents** that audit the Worker Agents. If a worker degrades code quality to hit a deadline, the Critic unilaterally vetoes the action. 

### Layer 5: The Scenario Strategist (The Human Veto)
*   **Goal**: Human-in-the-loop oversight and intelligence budget management.
*   **Implementation**: This is **YOU** (the user) interacting via Google Antigravity, setting objective functions, and providing asynchronous approvals on the proposed scenarios.

---

## 3. Immediate Prototyping Steps in Google Antigravity

**Phase 1: MCP Grounding (Layer 1)**
*   Initialize the core repository structure.
*   Set up a mock environment mapping (simulating GitHub, Slack, and Jira inputs) to test data ingestion.

**Phase 2: Baseline "Team of Rivals" Prompting (Layer 3 & 4)**
*   Draft the system prompts for our first two agents:
    1.  `Worker_Agent_Alpha`: Tasked with resolving a simulated code integration conflict.
    2.  `Critic_Agent_Beta`: Tasked with auditing Alpha's solution for architectural integrity and "strategic dishonesty".
*   Run adversarial tests to ensure Beta successfully vetoes bad compromises.

**Phase 3: Causal Simulation Logic (Layer 2)**
*   Write a Python-based state engine that calculates the **CRR metric** (Compute Token Cost vs. Human Rework Hours Saved).
*   Create a CLI dashboard for the Scenario Strategist to visualize the latent timeline and make veto decisions.
