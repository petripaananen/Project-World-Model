# Project World Model (PWM) - Layered Architecture Diagram Description

This file describes the structure, layer division, and information flows of the `pwm_architecture_layer_model.png` diagram in text format (designed for RAG systems like NotebookLM and accessibility).

## Overview
The diagram illustrates the vertical 5-layer architecture of the Project World Model (PWM) framework. The model consists of a bottom-up data processing pipeline (Layers 1–4) and a human-in-the-loop executive layer at the top (Layer 5).

---

## 1. Layer Structure (Layers 1–5)

### Layer 1: Observation & Spatial Understanding
- **Location:** Bottom-most box in the diagram.
- **Identifier:** "Layer 1" in the top-left corner.
- **Color:** Light blue background with dark blue borders.
- **Technical References:** [LingBot-World, V-JEPA 2.1].
- **Special Feature:** "Immutable Event Log" (inside a sub-box at the bottom).
- **Inputs:** Three long grey telemetry streams entering from below:
    - Jira/Git telemetry
    - Game engine telemetry (Unreal/Unity)
    - Asset pipeline telemetry

### Layer 2: Latent Core & Simulation Engine
- **Location:** Second box from the bottom.
- **Identifier:** "Layer 2" in the top-left corner.
- **Color:** Yellow background with dashed orange borders.
- **Features:** [Action-Conditioned Simulation / LingBot-World, AMI, Cosmos].
- **Outputs:** "Produces: Causal Risk Forecast".
- **Connection:** A thick grey arrow from Layer 1 feeds observations into the simulation core.

### Layer 3: Agentic Orchestration & Negotiation
- **Location:** Middle layer of the diagram.
- **Identifier:** "Layer 3" in the top-left corner.
- **Color:** Yellow background with solid orange borders. Contains three white sub-boxes:
    - QA Agent
    - Build Agent
    - Art Integration Agent
- **Activity:** "Asynchronous Negotiation" between agents (represented by dashed arrows and description text).
- **Technical References:** [Muse Spark, AsyncThink].

### Layer 4: Validation & Auditor Firewall (Agent Verification Engine)
- **Location:** Top-most technical layer.
- **Identifier:** "Layer 4" in the top-left corner.
- **Color:** Light green background with dark green borders.
- **Technical References:** [Claude Mythos + Internal Audit Probes].
- **Special Feature:** "Action: Strategic Dishonesty Detection".

### Layer 5: Scenario Strategist
- **Location:** Highest level of the diagram.
- **Identifier:** "Layer 5" in the top-left corner.
- **Color:** Light pink background with red borders.
- **Role:** Human-in-the-loop control and "Reward Architect".

---

## 2. Dynamic Control Flows (Side Feedback Loops)

Three critical feedback loops run along the sides of the diagram:

1. **Strategic Guidance & Creative Compromises:** A blue dashed arrow pointing down from Layer 5 to Layer 3.
2. **Reward & Permission Protocol:** A long blue dashed arrow pointing down from Layer 5 to Layer 2.
3. **Proactive Alerts & Scenarios:** A green dashed arrow pointing up from Layer 4 to Layer 5.

---

## 3. Grouping: Self-Directed Workflows

A grey curly bracket on the right side of the diagram groups **Layers 2, 3, and 4**. The text beside the bracket reads:
> **Self-Directed Workflows = Artifacts + Causal Evidence**
