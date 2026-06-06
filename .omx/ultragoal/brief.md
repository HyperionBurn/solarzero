Create and execute 100 production-quality refinements for SolarZero Atlas in C:\Users\wasif\OneDrive\Desktop\SolarZero\solarzero.

Scope categories must include UI, UX, bugs, performance, database, architecture, solar results accuracy, data quality, autonomous intelligence, serverless safety, and operational efficiency.

Constraints:
- Preserve all existing user work.
- Read AGENTS.md and relevant local Next.js docs before changing Next.js code.
- Inspect files before editing.
- Use apply_patch for manual edits.
- Commit and push every coherent fix to GitHub.
- Verify with npm run lint, npm run type-check, npm run test:run, and npm run build at appropriate milestones and final gate.
- Use Vercel CLI for production deployment/status when production verification is needed.
- Use Supabase CLI/MCP/envs already in repo for DB inspection if needed; do not use Supabase dashboard.
- Prioritize production safety and visible user value over speculative rewrites.
- Prefer small, coherent, testable batches. Avoid sweeping changes that destabilize auth, assessments, or production deploy.

Deliverables:
- Durable plan representing 100 refinements grouped into executable goals.
- Implement refinements story by story.
- Add/update tests for critical behavior.
- Maintain clear evidence in OMX ledger.
- Final cleanup and independent review gate before marking the overall goal complete.
