# XPRIZE Submission: Additional Info Questions

This document serves as a checklist and draft space for the **Additional Info** section of the Build with Gemini XPRIZE Devpost submission page. 

---

## 📅 General Project Info

- [x] **Project Start Date** `*`
  *Question*: When did you start working on this project?
  *Draft*: 
  ```text
  May 1, 2026 (Repo initialized April 29, 2026)
  ```

---

## 📈 Financials & Revenue

- [x] **Revenue by Month** `*`
  *Question*: Revenue broken out by calendar month, in USD (even if $0): May, June, July, and August 2026.
  *Example*: "May: $0, June: $3, July: $10, August: $10"
  *Draft*: 
  ```text
  May: $0, June: $0, July: $0, August: $0
  ```

- [x] **Related-Party Revenue** `*`
  *Question*: Any revenue earned during the Hackathon period from team members, family, related entities, or pre-existing customer relationships, in USD (even if $0).
  *Note*: Reported separately from Total Revenue so judges can assess whether the underlying business serves arms-length third-party customers.
  *Draft*: 
  ```text
  $0. No revenue was earned from team members, family, related entities, or pre-existing relationships during the hackathon period.
  ```

- [x] **Total Revenue** `*`
  *Question*: Total revenue earned during the Hackathon period, in USD (even if $0).
  *Draft*: 
  ```text
  $0
  ```

- [x] **Explanation of Revenue Shared Above** `*`
  *Question*: Explain the revenue shared above. Ideally include 1) Price per customer, 2) What period each payment covers (e.g., monthly, one-time), and 3) The number of paying users or transactions represented.
  *Draft*: 
  ```text
  $0 Total Revenue. Project World Model remained in a pre-launch/closed beta state during the hackathon period (May–August 2026). No subscription fees or transaction charges were collected (Price per customer: $0, Paying users: 0, Total transactions: 0). Tiered subscription pricing ($19.99/mo Basic, $49.99/mo Pro, $99.99/mo Enterprise) will activate upon commercial V1.0 launch.
  ```

- [x] **Upload Profit Evidence (P&L)** `*`
  *Question*: Upload your Profit evidence (P&L). Revenue and Expenses evidence in a form of a simple P&L (pdf, csv, png, xlsx allowed).
  *File to Upload*: 
  ```text
  Upload file: Docs/PWM_Profit_and_Loss_Statement.csv
  (File generated in repository: Docs/PWM_Profit_and_Loss_Statement.csv)
  ```

- [x] **Total Expenses** `*`
  *Question*: Total costs incurred during the Hackathon period, in USD (even if $0).
  *Draft*: 
  ```text
  $38.00 USD (€34.92)
  ```

- [x] **Total Cost of Goods Sold (COGS)** `*`
  *Question*: Total Cost of Goods Sold during the Hackathon period, in USD (even if $0). Costs directly tied to production of goods and services sold including labor and materials.
  *Constraint*: Include a one-sentence description of Costs directly tied to production of goods and services sold including labor and materials.
  *Draft*: 
  ```text
  $38.00 USD (€34.92) covering Gemini API inference tokens (Gemini 3.5/3.6 Flash and 2.5 Pro) and Google Cloud container/storage hosting.
  ```

- [x] **Total Marketing & Customer Acquisition Expense** `*`
  *Question*: Total marketing and customer acquisition expense, in USD (even if $0). This includes advertising and any promotion activities.
  *Constraint*: Include a one-sentence description of any expenses associated with advertising and any promotion activities.
  *Draft*: 
  ```text
  $0.
  ```

- [x] **Explanation of Marketing Expenses**
  *Question*: Please explain the marketing expenses you incurred during the hackathon period, if any.
  *Draft*: 
  ```text
  None.
  ```

- [x] **Additional Expenses**
  *Question*: Please share any missing expenses not covered in the previous expense questions.
  *Constraint*: Include a one-sentence description of what these costs cover.
  *Draft*: 
  ```text
  None. All infrastructure costs are detailed under COGS above.
  ```

---

## 👥 Users & Traction

- [x] **Number of Users Acquired** `*`
  *Question*: Number of users acquired during the hackathon (even if 0).
  *Draft*: 
  ```text
  0
  ```

- [x] **Number of Paying Users** `*`
  *Question*: Number of those users paying for your services or product during the hackathon (even if 0).
  *Draft*: 
  ```text
  0
  ```

- [x] **Testimonial**
  *Question*: Share a verifiable testimonial by a customer or user that is available publicly via a post online.
  *Draft*: 
  ```text
  Not yet available.
  ```

- [x] **Customer Concentration Confirmation** `*`
  *Confirmation*: I confirm that no single customer represents more than 40% of revenue acquired during the hackathon.
  *Status*: [x] Confirmed

---

## 🤖 AI & Technology Integration

- [x] **AI Impact & Category Fit** `*`
  *Question*: Explain how your project uses AI to impact the world, specifically in the category you have chosen.
  *Draft*: 
  ```text
  PWM acts as an L3 Causal Digital Twin in the Small Business Services category, resolving the "Paradox of Agility" for software development teams and tech startups. By using an Agent Verification Engine (Worker + Critic agents) to autonomously resolve integration debt before code merges hit production, it eliminates software release delays, prevents costly manual re-work, and empowers small engineering businesses to scale safely.
  ```

- [x] **Business Model** `*`
  *Question*: Explain the underlying business model of your submission.
  *Draft*: 
  ```text
  SaaS subscription model targeting small-to-medium development teams and software engineering startups, offering tiered pricing ($19.99/mo Basic, $49.99/mo Pro, $99.99/mo Enterprise) based on repo sizes, API transaction volume, and number of concurrent simulated branches.
  ```

- [x] **Business Model Sustainability & Viability** `*`
  *Question*: Explain how your business model shared above is sustainable and viable. (Address five-year goal, path to profitability, and why it's achievable based on hackathon traction).
  *Draft*: 
  ```text
  (1) Five-Year Goal & Market Opportunity:
  - Total Addressable Market (TAM): The global market for AI software development tools is projected to reach $240B by late 2026, with automated AI testing growing at a 30% CAGR.
  - Target Market Share & Revenue (Year 5): Capturing 0.05% of the market ($120M ARR) across ~15,000 active engineering subscriptions (Basic $19.99/mo, Pro $49.99/mo, Enterprise $99.99/mo).

  (2) Path to Profitability & P&L Projections:
  - Year 1: $150K ARR by launching across small business software teams. Cash-flow positive status in Month 10.
  - Year 2: $1.2M ARR with ~82% gross margins as CRR cost-optimization algorithms control LLM token spend.
  - Year 3–5: Scaling to $15M (Y3) -> $50M (Y4) -> $120M (Y5) ARR with net operating margins >35%.

  (3) Why It’s Achievable:
  - Value Hypothesis: Addresses the "Agility Paradox" where rapid AI code generation creates massive integration debt. PWM's Agent Verification Engine automates QA/integration, delivering a 10x ROI for small businesses.
  - Hackathon Traction: Our agents executed over 4.5M tokens across Gemini 3.6 Flash, 3.5 Flash, and 3.1 Pro with zero cash wasted, running live counterfactual simulations on Cloud Run with a July 2026 operational cost of only €34.92 ($38 USD).
  ```

- [x] **Sustainability Plan** `*`
  *Question*: How will you sustain business operations in the future?
  *Draft*: 
  ```text
  By acquiring initial paying customers in the Finnish game development ecosystem (our target launching pad), bootstrapping operational costs via early subscriptions, and establishing cloud efficiency guidelines to control model API overhead.
  ```

- [x] **AI Tools Leveraged** `*`
  *Question*: Which AI tools have you leveraged while working on this project?
  *Draft*: 
  ```text
  Gemini 3.6 Flash, Gemini 3.5 Flash, Gemini 3.1 Pro, Google Antigravity IDE (Agent Manager), and the Model Context Protocol (MCP) server ecosystem.
  ```

- [x] **Business Operations with AI** `*`
  *Question*: Please explain how your business operates with AI.
  *Draft*: 
  ```text
  AI orchestrators coordinate git commit monitoring, issue tracking via Linear/GitHub MCPs, debt risk analysis, and propose code changes. This keeps internal operational costs low, running a fully automated pipeline with minimal human intervention.
  ```

- [x] **AI Live in Production Decision-Making** `*`
  *Question*: Please explain the extent to which AI is live in production and executes key decisions.
  *Draft*: 
  ```text
  Our agents monitor the development branch, generate pull request merge proposals, and flag architectural conflicts. The Scenario Strategist (human) retains ultimate veto power over major merge decisions, while routine conflict checks and resolution validations are automated by the Critic agent.
  ```

- [x] **Google Cloud Product Usage** `*`
  *Question*: Please explain which product from Google Cloud you used during the hackathon and how.
  *Draft*: 
  ```text
  - Google Cloud Run: Hosts the async orchestrator loop and background agents.
  - Vertex AI API: Serves LLM requests (Gemini) with low-latency access and token metrics.
  - AlloyDB/BigQuery: To record execution logs and event histories securely.
  ```

- [x] **Gemini API & LLM Call Details** `*`
  *Question*: If your project uses an LLM, it must use Gemini API for at least one LLM call. Please explain which LLMs are used in the project and specifically how the Gemini API is used.
  *Draft*: 
  ```text
  The project utilizes Gemini 3.6 Flash (for default agent reasoning and high-speed telemetry ingestion), Gemini 3.1 Pro (for deep causal reasoning and complex Worker agent conflict resolutions), and Gemini 3.5 Flash (for fast validation checks by the Critic agent). The Gemini API is called via the google-genai SDK inside the BaseAgent class.
  ```

---

## 🔗 Repository & Evidence URLs

- [x] **GitHub Repository Link** `*`
  *Question*: URL to your GitHub repo code repository shared with testing@devpost.com and judging@hacker.fund
  *Note*: The repository must contain all necessary source code. The repository must be either public (with relevant licensing) or private and shared with testing@devpost.com and judging@hacker.fund.
  *Draft*: 
  ```text
  https://github.com/petripaananen/Project-World-Model
  ```

- [x] **GitHub Verification Confirmation** `*`
  *Confirmation*: I confirm that my GitHub repo linked above is shared with testing@devpost.com and judging@hacker.fund.
  *Status*: [x] Confirmed

- [x] **Evidence of Running Product URL** `*`
  *Question*: Provide a URL to a file in your repository that shows evidence of your product running.
  *Note*: Includes agent execution logs, API usage records, screenshots of dashboards. Anything that strengthens the case that playbooks are running in production continuously.
  *Draft*: 
  ```text
  https://github.com/petripaananen/Project-World-Model/blob/main/walkthrough.md
  ```

- [x] **Evidence of Profit URL** `*`
  *Question*: Provide a URL to a file in your repository that shows evidence of profit.
  *Note*: Stripe dashboard export, bank statement, or simple P&L.
  *Draft*: 
  ```text
  https://github.com/petripaananen/Project-World-Model/blob/main/Docs/evidence_of_profit.md
  ```

---

## 🎓 Learning

- [x] **Team Learning Level** `*`
  *Question*: Describe the level of learning you/your team derived from the project.
  *Selection Options*: [Extremely High / High / Moderate / Basic]
  *Draft*: 
  ```text
  Extremely High
  ```

---

## 🌐 External Prizes (Optional)

- [x] **Agentic Economy Prize - Opt-In**
  *Question*: Are you opting into the external $50K Agentic Economy Prize (administered by Circle)?
  *Selection*: `Do not opt in` *(Select "I confirm" if submitting a Circle wallet integration)*

- [x] **Agentic Economy Prize - GitHub Integration Link**
  *Question*: A link to a public GitHub repo verifying the integration.
  *Draft*: 
  ```text
  https://github.com/petripaananen/Project-World-Model
  ```

- [x] **Agentic Economy Prize - Circle Wallet Address**
  *Question*: The agent's Circle wallet address as proof of the transaction.
  *Draft*: 
  ```text
  N/A
  ```

- [x] **Agentic Economy Prize - Block-Explorer URL**
  *Question*: The agent's clickable block-explorer URL as proof of the transaction.
  *Draft*: 
  ```text
  https://
  ```
