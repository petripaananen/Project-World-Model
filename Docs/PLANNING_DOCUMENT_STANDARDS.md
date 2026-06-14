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

*By adhering to this standard, we guarantee a premium, "Executive-Ready" User Experience for all PWM strategic documentation and UI layouts.*
