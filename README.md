# Aurelis — AI Outcome Assurance v1.1.0

A deployable Cloudflare Pages/Workers application for independently verifying whether an AI agent's claimed business outcome is supported by its execution evidence.

## What it solves
AI agents can return success while the underlying business workflow is wrong, incomplete, duplicated, or applied to the wrong entity. Aurelis evaluates a workflow contract against the supplied execution trace instead of trusting the agent's final message.

## Verification capabilities
- Required and forbidden actions
- Duplicate side-effect detection
- Workflow ordering
- Execution-error detection
- Expected final-state verification
- Required outcome evidence checks
- Cross-step identity/data lineage consistency
- Claimed-success contradiction detection
- PASS / PARTIAL / FAIL verdict
- Risk and verification score
- Automatic regression-case generation
- Four interactive failure scenarios

## Commercial wedge
The product is intentionally positioned as a bounded assurance engagement rather than generic observability. A customer can supply one high-risk agent workflow and receive an evidence-backed verdict plus a reproducible regression case.

## Run locally
```bash
npm install
npm test
npx wrangler pages dev .
```
Open the local URL printed by Wrangler.

## Deploy
```bash
npx wrangler pages deploy . --project-name <your-cloudflare-pages-project>
```

## Scope boundary
Aurelis verifies the contract and evidence supplied to it. It is not a certification, does not guarantee universal agent safety, and does not replace production controls. Production integrations, authentication, persistence, and billing are outside this standalone v1 core.
