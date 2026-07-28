# Workspace Customization Rules — Project World Model

## Deployment & Quality Assurance Rules

### Pre-Deployment Test Rule
- **MUST** run local tests (`pytest` backend suite and `npm run build` frontend build) before executing any deployment command (`deploy.ps1` / `deploy.sh`) or pushing release commits.
- Deployment scripts **MUST** automatically fail fast if any local test or build step fails.

### Cloud Resource & Cost Optimization Rule
- Production container deployments to Google Cloud Run **MUST** use `--min-instances=0` to enable scale-to-zero when idle.
- Background simulation loops (`--loop`) **MUST NOT** be enabled by default in production container images to prevent unthrottled API token generation and unexpected billing charges. Gemini AI agent runs should only execute on-demand when requested by active user interactions.
