# Gemini XPRIZE Development & Submission Guidelines

**AI Assistant Directive:**
All design decisions, code implementations, and roadmap updates in this repository must strictly adhere to the Google Gemini XPRIZE rules and evaluation criteria.

---

## 1. Technical Stack Requirements
*   **Gemini API**: At least one LLM call in the deployed application must be powered by the Gemini API (via Vertex AI or Google AI Studio).
*   **Google Cloud Platform**: The infrastructure must utilize at least one GCP product (e.g., Cloud Run, AlloyDB, BigQuery, or Google Vertex AI Agent Engine).

## 2. Judging Criteria Alignment
All features must be built to optimize for these three equally-weighted criteria:
1.  **Business Viability**: Real business launch, real users, and real revenue generation. All pricing models and monetization strategies must be production-ready.
2.  **AI-Native Operations**: The business must be run *through* AI. We must show that agents (worker/critic) are executing key operational decisions in production.
3.  **Category Impact**: Meaningfully moving the needle in **Small Business Services** (empowering small dev teams to operate at AAA scale) and **Entrepreneurship & Job Creation**.

## 3. Submission Deliverables Checklist
All of the following must be ready for the final submission on Devpost:
*   **GitHub Repository**: Shared with `testing@devpost.com` and `judging@hacker.fund`.
*   **3-Minute Demo Video**: Showcases the working product and clearly demonstrates the extent to which AI is live in production and executing key decisions.
*   **Written Narrative (500–1000 words)**:
    - How the team uses AI day-to-day.
    - What humans do versus what AI does.
    - The jobs/economic opportunities created or enabled for others beyond the founding team (actual & potential).
    - The story of building the business this way.
*   **Revenue Evidence**: Stripe dashboard export, bank statement, or a simple P&L (and corporate ID if available).
*   **Expense Evidence**: Month-by-month expenses incurred, specifically detailing Marketing and Customer Acquisition Cost (CAC) spend.
*   **Product Evidence**: Agent execution logs, API usage records, and screenshots of dashboards proving playbooks are running continuously in production.
*   **Customer Evidence**: Contact information of real customers (name, email, phone) and their testimonials or feedback.