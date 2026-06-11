# XPRIZE Submission: Additional Info Questions

This document serves as a checklist and draft space for the **Additional Info** section of the Build with Gemini XPRIZE Devpost submission page. 

---

## 📈 Financials & Revenue

- [ ] **Revenue by Month** `*`
  *Question*: Revenue broken out by calendar month, in USD (even if $0): May, June, July, and August 2026.
  *Example*: "May: $0, June: $3, July: $10, August: $10"
  *Draft*: 
  ```text
  May: $0, June: $0, July: $0, August: $0
  ```

- [ ] **Related-Party Revenue** `*`
  *Question*: Any revenue earned during the Hackathon period from team members, family, related entities, or pre-existing customer relationships, in USD (even if $0).
  *Note*: Reported separately from Total Revenue so judges can assess whether the underlying business serves arms-length third-party customers.
  *Draft*: 
  ```text
  $0
  ```

- [ ] **Total Revenue** `*`
  *Question*: Total revenue earned during the Hackathon period, in USD (even if $0).
  *Draft*: 
  ```text
  $0
  ```

- [ ] **Total Expenses** `*`
  *Question*: Total costs incurred during the Hackathon period, in USD (even if $0).
  *Draft*: 
  ```text
  $0
  ```

- [ ] **Total Cost of Goods Sold (COGS)** `*`
  *Question*: Total Cost of Goods Sold during the Hackathon period, in USD (even if $0). Costs directly tied to production of goods and services sold including labor and materials.
  *Constraint*: Include a one-sentence description of Costs directly tied to production of goods and services sold including labor and materials.
  *Draft*: 
  ```text
  $0.
  ```

- [ ] **Total Marketing & Customer Acquisition Expense** `*`
  *Question*: Total marketing and customer acquisition expense, in USD (even if $0). This includes advertising and any promotion activities.
  *Constraint*: Include a one-sentence description of any expenses associated with advertising and any promotion activities.
  *Draft*: 
  ```text
  $0.
  ```

- [ ] **Explanation of Marketing Expenses**
  *Question*: Please explain the marketing expenses you incurred during the hackathon period, if any.
  *Draft*: 
  ```text
  None.
  ```

- [ ] **Additional Expenses**
  *Question*: Please share any missing expenses not covered in the previous expense questions.
  *Constraint*: Include a one-sentence description of what these costs cover.
  *Draft*: 
  ```text
  None.
  ```

---

## 👥 Users & Traction

- [ ] **Number of Users Acquired** `*`
  *Question*: Number of users acquired during the hackathon (even if 0).
  *Draft*: 
  ```text
  0
  ```

- [ ] **Number of Paying Users** `*`
  *Question*: Number of those users paying for your services or product during the hackathon (even if 0).
  *Draft*: 
  ```text
  0
  ```

- [ ] **Testimonial**
  *Question*: Share a verifiable testimonial by a customer or user that is available publicly via a post online.
  *Draft*: 
  ```text
  Not yet available.
  ```

- [ ] **Customer Concentration Confirmation** `*`
  *Confirmation*: I confirm that no single customer represents more than 40% of revenue acquired during the hackathon.
  *Status*: [ ] Confirmed

---

## 🤖 AI & Technology Integration

- [ ] **AI Impact & Category Fit** `*`
  *Question*: Explain how your project uses AI to impact the world, specifically in the category you have chosen.
  *Draft*: 
  ```text
  PWM acts as an L3 Causal Digital Twin, addressing the "Paradox of Agility" for developers and small business teams. By using an Agent Verification Engine (Worker + Critic agents) to autonomously resolve integration debt before it hits production, it reduces software release delays, prevents costly manual re-work, and empowers entrepreneurs to leverage rapid AI generation safely and sustainably.
  ```

- [ ] **Business Model** `*`
  *Question*: Explain the underlying business model of your submission.
  *Draft*: 
  ```text
  SaaS subscription model targeting small-to-medium development teams and game studios, offering tiered pricing ($19.99/mo Basic, $49.99/mo Pro, $99.99/mo Enterprise) based on repo sizes, API transaction volume, and number of concurrent simulated branches.
  ```

- [ ] **Sustainability Plan** `*`
  *Question*: How will you sustain business operations in the future?
  *Draft*: 
  ```text
  By acquiring initial paying customers in the Finnish game development ecosystem (our target launching pad), bootstrapping operational costs via early subscriptions, and establishing cloud efficiency guidelines to control model API overhead.
  ```

- [ ] **AI Tools Leveraged** `*`
  *Question*: Which AI tools have you leveraged while working on this project?
  *Draft*: 
  ```text
  Gemini 3.5 Flash, Gemini 3.1 Pro, Google Antigravity IDE (Agent Manager), and the Model Context Protocol (MCP) server ecosystem.
  ```

- [ ] **Business Operations with AI** `*`
  *Question*: Please explain how your business operates with AI.
  *Draft*: 
  ```text
  AI orchestrators coordinate git commit monitoring, issue tracking via Linear/GitHub MCPs, debt risk analysis, and propose code changes. This keeps internal operational costs low, running a fully automated pipeline with minimal human intervention.
  ```

- [ ] **AI Live in Production Decision-Making** `*`
  *Question*: Please explain the extent to which AI is live in production and executes key decisions.
  *Draft*: 
  ```text
  Our agents monitor the development branch, generate pull request merge proposals, and flag architectural conflicts. The Scenario Strategist (human) retains ultimate veto power over major merge decisions, while routine conflict checks and resolution validations are automated by the Critic agent.
  ```

- [ ] **Google Cloud Product Usage** `*`
  *Question*: Please explain which product from Google Cloud you used during the hackathon and how.
  *Draft*: 
  ```text
  - Google Cloud Run: Hosts the async orchestrator loop and background agents.
  - Vertex AI API: Serves LLM requests (Gemini) with low-latency access and token metrics.
  - AlloyDB/BigQuery: To record execution logs and event histories securely.
  ```

- [ ] **Gemini API & LLM Call Details** `*`
  *Question*: If your project uses an LLM, it must use Gemini API for at least one LLM call. Please explain which LLMs are used in the project and specifically how the Gemini API is used.
  *Draft*: 
  ```text
  The project utilizes Gemini 3.1 Pro (for deep causal reasoning and complex Worker agent conflict resolutions) and Gemini 3.5 Flash (for fast validation checks by the Critic agent). The Gemini API is called via the google-genai SDK inside the BaseAgent class.
  ```

---

## 🔗 Repository & Evidence URLs

- [ ] **GitHub Repository Link** `*`
  *Question*: URL to your GitHub repo code repository shared with testing@devpost.com and judging@hacker.fund
  *Note*: The repository must contain all necessary source code. The repository must be either public (with relevant licensing) or private and shared with testing@devpost.com and judging@hacker.fund.
  *Draft*: 
  ```text
  https://github.com/petripaananen/Project-World-Model
  ```

- [ ] **GitHub Verification Confirmation** `*`
  *Confirmation*: I confirm that my GitHub repo linked above is shared with testing@devpost.com and judging@hacker.fund.
  *Status*: [ ] Confirmed

- [ ] **Evidence of Running Product URL** `*`
  *Question*: Provide a URL to a file in your repository that shows evidence of your product running.
  *Note*: Includes agent execution logs, API usage records, screenshots of dashboards. Anything that strengthens the case that playbooks are running in production continuously.
  *Draft*: 
  ```text
  https://github.com/petripaananen/Project-World-Model/blob/main/walkthrough.md
  ```

- [ ] **Evidence of Profit URL** `*`
  *Question*: Provide a URL to a file in your repository that shows evidence of profit.
  *Note*: Stripe dashboard export, bank statement, or simple P&L.
  *Draft*: 
  ```text
  https://github.com/petripaananen/Project-World-Model/blob/main/Docs/evidence_of_profit.pdf
  ```

---

## 🎓 Learning

- [ ] **Team Learning Level** `*`
  *Question*: Describe the level of learning you/your team derived from the project.
  *Selection Options*: [Extremely High / High / Moderate / Basic]
  *Draft*: 
  ```text
  Extremely High
  ```
