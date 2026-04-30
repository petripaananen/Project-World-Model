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

*By adhering to this standard, we guarantee a premium, "Executive-Ready" User Experience for all PWM strategic documentation.*