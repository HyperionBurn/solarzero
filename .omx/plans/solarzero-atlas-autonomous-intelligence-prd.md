# SolarZero Atlas Autonomous Intelligence PRD

## Document Purpose

This is the follow-on execution PRD for SolarZero Atlas. It does not replace the original winning PRD; it converts the current implementation state into a production-minded roadmap for:

1. Finishing the Atlas MVP properly.
2. Building Phase 2: an autonomous UAE solar intelligence system that can discover, verify, enrich, rank, and action rooftop opportunities.

The core product direction remains:

> SolarZero Atlas is UAE-first solar opportunity intelligence for commercial rooftops. It finds unsolarized buildings, scores their solar potential, explains the evidence, flags regulatory and deal risks, and turns the best targets into proposal-ready SolarZero assessments.

SolarZero assessment/proposal generation is now a subfeature inside the larger Atlas workflow. The main product is the intelligence system.

## Source Context

Primary prior plan:

- `C:\Users\wasif\OneDrive\Desktop\SolarZero\.omx\plans\solarzero-atlas-winning-prd.md`

Current implementation evidence:

- `src/app/page.tsx` redirects users into the opportunities product surface.
- `src/app/(app)/opportunities/page.tsx` provides the opportunity dashboard.
- `src/app/(app)/opportunities/[id]/page.tsx` provides the opportunity dossier.
- `src/app/(app)/map/page.tsx` calls `opportunity.scanArea` from the map.
- `src/server/api/routers/opportunity.ts` exposes opportunity list, scan, detail, status, notes, evidence, and stats procedures.
- `src/server/services/opportunity.ts` creates, scores, rescans, and assesses opportunities.
- `src/server/services/signalGraph.ts` runs the connector-backed intelligence layer.
- `src/lib/opportunity/scoring.ts` contains deterministic scoring.
- `prisma/schema.prisma` includes `Opportunity`, `OpportunityScore`, `SolarizationEvidence`, `InvestigationRun`, `InvestigationRunBuilding`, `OpportunityNote`, `DataConnector`, `ConnectorRun`, and `ConnectorSignal`.

Known production baseline from recent verification:

- Production deploy is Ready on Vercel.
- `npm run lint`, `npm run type-check`, `npm run test:run`, and `npm run build` passed after recent production fixes.
- Public smoke checks for `/`, `/login`, `/register`, `/map`, `/opportunities`, and `/api/auth/session` returned 200.

## Current Product State

### Completed Or Mostly Completed

- Opportunity-first IA: the product now opens into Atlas rather than only the map/calculator.
- Opportunity schema and migration foundation.
- Deterministic scoring engine with score bands, reasons, risks, confidence, and next action.
- Scan area workflow using OSM discovery and opportunity creation.
- SignalGraph connector layer for multi-source consensus.
- DataConnector, ConnectorRun, and ConnectorSignal persistence.
- Connectors/signals for OSM, regulatory/utility context, NASA/PVGIS-style irradiance/yield, Microsoft-style footprint signal, and Open-Meteo air quality dust/soiling.
- Opportunity dashboard with KPI cards, filters, ranked table, selection, CSV export, and bulk assessment affordances.
- Opportunity map overlay using scan workflow.
- Opportunity dossier with score breakdown, evidence, notes/status, building facts, assessment/proposal actions, and consensus details.
- Production build hardening around Next.js/Vercel/Prisma generation.

### Not Yet Done Enough To Call The MVP Fully Closed

These are the remaining MVP closure items before moving aggressively into autonomous Phase 2.

1. Auth flow e2e proof:
   - Verify register, email verification, first sign-in, failed sign-in, logout, and second sign-in in a production-like path.
   - If sign-in silently fails, capture client network logs, NextAuth route logs, user `emailVerified` state, and Prisma adapter/session behavior.
   - Acceptance: a newly verified user can sign in on first attempt and land in `/opportunities`.

2. Real production scan smoke:
   - With an authenticated session, scan a small Dubai area in production.
   - Open at least one resulting opportunity dossier.
   - Add evidence or note.
   - Run one assessment.
   - Export CSV.
   - Acceptance: the happy path completes without a 500, silent failure, or stale UI state.

3. Serverless safety review:
   - Audit Redis/cache/rate-limit/queue code for Vercel compatibility.
   - Avoid long-lived TCP Redis clients in serverless request paths unless using a serverless-safe provider/client.
   - Prefer Upstash Redis over HTTP or Vercel Runtime Cache for request-path caching/rate limiting.
   - Keep BullMQ/worker code out of Vercel serverless request execution unless there is a separate worker runtime.
   - Acceptance: production requests do not crash when Redis envs are absent, invalid, or unreachable.

4. SignalGraph to assessment alignment:
   - Dust/soiling risk is currently represented as intelligence/evidence.
   - The core assessment cost model still uses a static soiling assumption unless explicitly changed.
   - Acceptance: either wire SignalGraph soiling into assessment assumptions, or clearly label it as an advisory risk not yet used in financial output.

5. Test coverage gap closure:
   - Add or verify integration tests for `opportunity.scanArea`, `opportunity.list`, `opportunity.getById`, `addSolarizationEvidence`, `updateStatus`, `addNote`, CSV export behavior, and bulk assessment behavior.
   - Acceptance: tests cover the critical Atlas path, not only pure scoring.

6. Data-source honesty:
   - Clearly mark simulated/estimated sources as simulated or derived.
   - Do not present Microsoft-style footprint variation, UAE model, or fallback values as verified measurements.
   - Acceptance: every surfaced intelligence claim shows source, confidence, and whether it is measured, modeled, imported, or fallback.

7. Production observability:
   - Ensure Sentry or Vercel logs capture auth, scan, connector, assessment, and dossier failures with useful metadata.
   - Acceptance: failures in production can be traced to route/procedure/user/action without leaking secrets or PII.

## Phase 2 Vision

Phase 2 turns Atlas from a user-triggered scan tool into an autonomous market intelligence system.

The system should continuously ask:

1. Where are the best UAE commercial rooftops?
2. Which ones are probably not solarized?
3. Which ones have the best technical, financial, regulatory, and commercial profile?
4. Who owns or occupies them, if discoverable through legal and reliable sources?
5. What evidence supports the recommendation?
6. What should a sales or BD operator do next?

The product loop becomes:

```text
Discover -> Verify -> Enrich -> Rank -> Explain -> Act -> Learn
```

## Phase 2 Non-Goals

- Do not claim bankable engineering accuracy.
- Do not claim all UAE solar installations are detected until there is validated imagery/CV coverage.
- Do not scrape or store restricted personal data without a reviewed source policy.
- Do not build a giant unbounded crawler inside a Vercel request path.
- Do not add paid APIs until the free/free-tier stack has been exhausted and source licensing is clear.

## Requirements Summary

### R1: Autonomous Discovery

Atlas must discover candidate buildings without requiring a user to manually click every area.

Required capabilities:

- Define scan campaigns by emirate, city, zone, bounding box, radius, or imported list.
- Split large areas into bounded scan tiles.
- Queue scan tiles with clear states: `pending`, `running`, `complete`, `failed`, `paused`, `skipped`.
- Deduplicate buildings across scans by `osmId`, lat/lng tolerance, normalized footprint, and optional geohash.
- Persist candidate provenance so the system can explain where the candidate came from.
- Respect provider rate limits and retry policies.

Candidate models:

- `ScanCampaign`
- `ScanTile`
- `DiscoveryCandidate`
- Optional `SourceAttribution` if not folded into `DiscoveryCandidate`

Acceptance criteria:

- A user can start a Dubai Marina campaign without blocking the UI.
- The campaign can resume after process restart or deploy.
- Duplicate buildings are not repeatedly inserted.
- Every discovered candidate has source attribution and scan metadata.

### R2: Autonomous Ranking

Atlas must continuously rank opportunities, not only score them once.

Required capabilities:

- Introduce scoring version `v2`.
- Save rank snapshots so ranking changes are auditable.
- Separate score dimensions:
  - Technical fit
  - Financial value
  - Solarization confidence
  - Data completeness
  - Regulatory simplicity
  - Enrichment quality
  - Outreach readiness
  - Strategic fit
- Add campaign-relative rank, emirate-relative rank, and global rank.
- Explain every rank with top positive drivers and top blockers.
- Allow manual feedback to improve future scoring without silently rewriting history.

Candidate models:

- `OpportunityRankSnapshot`
- `OpportunityFeedback`
- Optional `ScoringModelVersion`

Acceptance criteria:

- Top 50 opportunities in a campaign are stable and explainable.
- A rejected building can be excluded from future top lists without deleting evidence.
- Score changes caused by new evidence create a new rank snapshot.

### R3: Verification Pipeline

Atlas must treat solarization status as an evidence-backed belief, not a binary guess.

Required capabilities:

- Create verification tasks for uncertain, high-value opportunities.
- Support multiple verification providers through a common interface.
- Store evidence conflicts instead of overwriting old evidence.
- Compute derived solarization status from evidence confidence.
- Show why the system believes a roof is `likely_unsolarized`, `unknown`, `likely_solarized`, or `verified_solarized`.

Provider interface:

```ts
interface SolarizationVerificationProvider {
  id: string;
  label: string;
  verify(input: VerificationInput): Promise<VerificationResult>;
}
```

Initial providers:

- `ManualEvidenceProvider`
- `OsmTagProvider`
- `ImportedEvidenceProvider`
- `ImageryReviewProvider` as a human-assisted placeholder

Future providers:

- `SatelliteVisionProvider`
- `GoogleSolarProvider` only if UAE coverage and terms support it
- `SentinelOrPlanetProvider` if imagery cadence/resolution works

Candidate models:

- `VerificationTask`
- `VerificationResult`
- `SolarizationEvidence` extension fields if needed

Acceptance criteria:

- A high-score unknown opportunity automatically gets a verification task.
- Manual evidence and automated evidence can disagree without data loss.
- The dossier shows confidence, source, observed date, and conflict state.

### R4: Enrichment Pipeline

Atlas must enrich opportunities with company, property, and contact signals only from legal/reliable sources.

Required capabilities:

- Add company/occupier signal records without requiring perfect ownership certainty.
- Add source attribution, confidence, observed date, and terms category to every enrichment.
- Support user-imported CRM CSV as the safest first enrichment path.
- Support manual entry and correction.
- Prepare for future business registry, commercial directory, Google Places, HubSpot, Salesforce, or paid B2B data integrations.
- Add opt-out/delete workflow before storing outreach contacts at scale.

Candidate models:

- `CompanySignal`
- `ContactSignal`
- `PropertySignal`
- `OutreachActivity`
- `SourcePolicy`

Acceptance criteria:

- A user can import a CSV of known companies/contacts and match rows to opportunities.
- An opportunity can show "possible occupier" without claiming confirmed owner.
- Contact fields remain nullable and confidence-scored.
- The system can export outreach-ready rows only when source policy allows it.

### R5: Autonomous Action Layer

Atlas must turn intelligence into an operator workflow.

Required capabilities:

- Add saved lists/campaign queues.
- Add assignment/status stages:
  - `new`
  - `needs_verification`
  - `needs_enrichment`
  - `qualified`
  - `contacted`
  - `meeting_booked`
  - `proposal_sent`
  - `won`
  - `lost`
  - `rejected`
- Add recommended next action and reason.
- Add exports by stage/campaign/source policy.
- Add a proposal-ready handoff to the existing SolarZero assessment/proposal module.

Acceptance criteria:

- A BD operator can work a ranked queue without returning to the map.
- Every top opportunity has a next action.
- The system can export qualified opportunities with evidence and economics.

### R6: Production Operations

Phase 2 must be production-safe.

Required capabilities:

- Background work must be resumable and idempotent.
- Provider calls must have timeouts, retries, and rate limits.
- Long scans must not run in normal request-response paths.
- Connector failures must degrade gracefully.
- Migrations must be additive unless explicitly approved.
- Deployments must run Prisma generation and migration deploy safely.

Acceptance criteria:

- A failed connector run does not break opportunity pages.
- A campaign can pause/resume after deployment.
- Production build and deployment remain green after every milestone.

## Data Sources And API Strategy

### Free Or Free-Tier First

Use these before paying for data.

1. OpenStreetMap / Overpass
   - Use for building footprints, tags, type hints, and geometry.
   - Strength: free, broad coverage, already integrated.
   - Weakness: incomplete, inconsistent, community maintained.
   - Product rule: source confidence should vary by tag richness and geometry quality.

2. NASA POWER
   - Use for irradiance and climate context.
   - Strength: free global climate data.
   - Weakness: coarse compared with site-specific engineering datasets.
   - Product rule: label as modeled climate data, not site measurement.

3. PVGIS
   - Use for solar production/yield sanity checks where applicable.
   - Strength: free and solar-specific.
   - Weakness: coverage/model details must be validated for UAE use.
   - Product rule: compare with UAE model rather than blindly replacing it.

4. Open-Meteo Air Quality
   - Use for particulate/dust signals and soiling risk.
   - Strength: free, simple API, already integrated.
   - Weakness: current air quality is not the same as long-term site soiling.
   - Product rule: advisory soiling risk unless calibrated against actual production/cleaning data.

5. UAE regulatory and utility public pages
   - Use for emirate, utility, tariff, net-metering/regulatory notes, and assumptions.
   - Strength: authoritative.
   - Weakness: rules change and may require human interpretation.
   - Product rule: cite source date and avoid legal guarantees.

6. User-imported CSV
   - Use for owner/company/contact enrichment.
   - Strength: safest first-party data path.
   - Weakness: user must provide data.
   - Product rule: preserve import source and user ownership.

7. MapLibre / open map tiles where licensed
   - Use for visualization.
   - Strength: flexible and low cost.
   - Weakness: tile hosting/source licensing must be checked.
   - Product rule: do not ship a tile provider without production terms review.

### Free But Needs Validation

1. Microsoft Global ML Building Footprints
   - Use for footprint cross-check if UAE coverage and license are acceptable.
   - Strength: can fill OSM gaps.
   - Weakness: coverage, freshness, and license need verification.
   - Product rule: do not simulate this as a measured source in production; either integrate the dataset or label derived fallback honestly.

2. Sentinel / Copernicus imagery
   - Use for broad imagery experiments.
   - Strength: open/free satellite data.
   - Weakness: resolution may be too low for reliable rooftop PV detection.
   - Product rule: research only until detection accuracy is validated.

3. UAE open data portals
   - Use for zones, land use, facilities, or commercial context if available.
   - Strength: official/public.
   - Weakness: coverage varies by emirate and dataset.
   - Product rule: record dataset version and terms.

### Paid Or Later

1. Google Maps / Places / Solar APIs
   - Use for business/place enrichment or solar detection only if UAE support and terms allow it.
   - Risk: cost, retention restrictions, and uncertain UAE Solar API coverage.

2. Mapbox
   - Use for high-quality maps/geocoding if open stack is insufficient.
   - Risk: recurring usage cost.

3. Planet / Maxar / Nearmap or other commercial imagery
   - Use for higher-resolution verification and CV.
   - Risk: expensive; likely not needed before strong customer pull.

4. Business/contact data providers
   - Use for enrichment after source policy is defined.
   - Risk: PII/compliance, quality, and export restrictions.

5. CRM integrations
   - HubSpot/Salesforce later, after the in-app queue proves useful.

## Proposed Data Model Additions

The executor should inspect the existing schema before editing. These are target concepts, not a command to blindly paste.

```prisma
model ScanCampaign {
  id              String   @id @default(cuid())
  name            String
  emirate         String?
  status          String   @default("draft")
  boundsJson      Json?
  filtersJson     Json?
  createdBy       String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  startedAt       DateTime?
  completedAt     DateTime?
  tiles           ScanTile[]
}

model ScanTile {
  id              String   @id @default(cuid())
  campaignId      String
  campaign        ScanCampaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  status          String   @default("pending")
  boundsJson      Json
  attemptCount    Int      @default(0)
  buildingsFound  Int      @default(0)
  error           String?
  lockedAt        DateTime?
  completedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model DiscoveryCandidate {
  id              String   @id @default(cuid())
  campaignId      String?
  scanTileId      String?
  buildingId      String?
  opportunityId   String?
  sourceId        String
  sourceKey       String?
  lat             Float
  lng             Float
  geometryJson    Json?
  payloadJson     Json?
  confidence      Float    @default(0.5)
  status          String   @default("new")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model VerificationTask {
  id              String   @id @default(cuid())
  opportunityId   String
  providerId      String
  status          String   @default("pending")
  priority        Int      @default(50)
  resultJson      Json?
  error           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  completedAt     DateTime?
}

model OpportunityRankSnapshot {
  id              String   @id @default(cuid())
  opportunityId   String
  campaignId      String?
  scoringVersion  String
  scoreTotal      Float
  rankGlobal      Int?
  rankCampaign    Int?
  driversJson     Json?
  blockersJson    Json?
  createdAt       DateTime @default(now())
}

model CompanySignal {
  id              String   @id @default(cuid())
  opportunityId   String
  companyName     String
  relationship    String?
  source          String
  sourceUrl       String?
  confidence      Float    @default(0.5)
  payloadJson     Json?
  observedAt      DateTime?
  createdAt       DateTime @default(now())
}

model ContactSignal {
  id              String   @id @default(cuid())
  opportunityId   String
  companySignalId String?
  name            String?
  role            String?
  email           String?
  phone           String?
  source          String
  sourcePolicy    String?
  confidence      Float    @default(0.5)
  createdAt       DateTime @default(now())
}

model OutreachActivity {
  id              String   @id @default(cuid())
  opportunityId   String
  type            String
  status          String
  notes           String?
  actor           String?
  createdAt       DateTime @default(now())
}
```

## Service Architecture

### New Services

1. `autonomousDiscoveryService`
   - Creates campaigns.
   - Tiles large areas.
   - Claims/executes scan tiles idempotently.
   - Persists candidates and creates/upserts buildings/opportunities.

2. `rankingService`
   - Runs scoring v2.
   - Produces rank snapshots.
   - Re-ranks campaign/global queues when evidence changes.

3. `verificationService`
   - Creates tasks for high-value uncertain opportunities.
   - Runs provider adapters.
   - Converts provider outputs into `SolarizationEvidence`.

4. `enrichmentService`
   - Imports CSVs.
   - Matches companies/contacts to opportunities.
   - Applies source policy.

5. `sourceRegistryService`
   - Tracks provider terms, source type, confidence defaults, timeout, retry, and rate-limit policies.

### Execution Runtime

Preferred near-term:

- Synchronous bounded user scans remain allowed for small areas.
- Campaign/tile execution runs via Vercel Cron invoking a safe API route, or through a separate worker if available.
- Avoid BullMQ inside serverless routes unless a real worker runtime is configured.
- Use Upstash Redis HTTP or equivalent serverless-safe store for locks/rate limits if needed.

Do not:

- Start an unbounded crawler from a button click.
- Use long-lived Redis TCP clients as required production dependencies in Vercel request handlers.
- Let one slow provider block the whole pipeline.

## Implementation Milestones

### M0: Finish Atlas MVP Definition Of Done

Goal:

- Close the remaining production and test gaps before adding more surface area.

Tasks:

- Run full local gates.
- Run authenticated production smoke.
- Audit auth first-login issue.
- Audit serverless Redis/cache/rate-limit paths.
- Add missing critical integration tests.
- Label simulated/fallback signals honestly.
- Decide whether SignalGraph soiling is advisory or fed into assessment assumptions.

Acceptance:

- Verified user can sign in on first try.
- Small production scan and dossier flow works.
- No known production 500s in auth/scan/dossier/assessment/export.
- Green lint/type/test/build.
- One clean commit and push.

### M1: Autonomous Campaign Data Foundation

Goal:

- Add durable campaign/tile/candidate state.

Tasks:

- Add additive Prisma migration for `ScanCampaign`, `ScanTile`, and `DiscoveryCandidate`.
- Add service methods for create campaign, tile campaign, claim tile, complete tile, fail tile.
- Add tests for idempotency and duplicate protection.

Acceptance:

- Campaign can be created without running.
- Tiles are persisted and resumable.
- Re-running the same tile does not duplicate buildings/opportunities.

### M2: Campaign Runner

Goal:

- Execute discovery in resumable chunks.

Tasks:

- Add protected API/server action to start/pause/resume campaign.
- Add cron-safe route for executing N pending tiles with strict time budget.
- Add per-provider timeouts and rate-limit guards.
- Add campaign progress UI.

Acceptance:

- A campaign can process tiles across multiple invocations.
- A failed tile records error and can retry.
- UI shows progress without long request hangs.

### M3: Ranking V2

Goal:

- Move from one-time scoring to continuous prioritization.

Tasks:

- Add scoring v2 inputs for enrichment quality, verification state, and outreach readiness.
- Add `OpportunityRankSnapshot`.
- Add top drivers/blockers to snapshots.
- Add campaign/global rank views.

Acceptance:

- Dashboard can sort by current rank.
- Dossier can show score history.
- Evidence changes create a new rank snapshot.

### M4: Verification Pipeline

Goal:

- Make solarization status trustable and reviewable.

Tasks:

- Add `VerificationTask`.
- Add provider interface.
- Add manual/imported/OSM verification providers.
- Add queue generation for high-value unknowns.
- Add conflict state to dossier.

Acceptance:

- High-score unknown opportunities generate verification tasks.
- Users can complete a manual verification task.
- Conflicting evidence is visible, not overwritten.

### M5: Enrichment Pipeline

Goal:

- Make top opportunities commercially actionable.

Tasks:

- Add `CompanySignal`, `ContactSignal`, `OutreachActivity`, and source policy fields.
- Add CSV import/mapping flow.
- Add company/contact matching logic.
- Add export guardrails based on source policy.

Acceptance:

- User can import company/contact CSV and match to opportunities.
- Dossier shows possible occupier/contact with confidence and source.
- Export includes enrichment only when policy allows.

### M6: Operator Queue And Outreach Workflow

Goal:

- Turn Atlas into daily BD operating software.

Tasks:

- Add saved lists or campaign queues.
- Add owner/assignee fields if needed.
- Add status transitions and activity history.
- Add filters for `qualified`, `needs verification`, `needs enrichment`, and `contacted`.

Acceptance:

- A user can work the top 50 campaign queue from one screen.
- Every row has next action, status, and reason.
- Outreach/activity events appear in dossier history.

### M7: Production Release And Evidence Pack

Goal:

- Ship Phase 2 safely with proof.

Tasks:

- Run local quality gates.
- Deploy using Vercel CLI.
- Run production smoke.
- Record known limitations in docs.
- Commit and push after each coherent milestone.

Acceptance:

- Vercel production deployment is Ready.
- Authenticated production flow passes.
- Campaign runner processes at least one tiny campaign.
- Dossier and dashboard remain stable.

## Test Plan

### Unit Tests

- Scoring v2 formula and bands.
- Tile generation from bounding boxes.
- Candidate dedupe logic.
- Evidence aggregation and conflict handling.
- Source policy export rules.

### Integration Tests

- Campaign create -> tile -> execute -> opportunity creation.
- Tile retry/failure/resume.
- Verification task creation and completion.
- CSV import to company/contact signals.
- Rank snapshot creation after evidence change.

### E2E / Production Smoke

- Register and verify email.
- Sign in on first attempt after verification.
- Start a tiny scan/campaign.
- Open dashboard.
- Open dossier.
- Add note/evidence.
- Run assessment.
- Export CSV.
- Confirm no production 500s in Vercel logs.

### Observability

- Capture structured errors for auth, scan, connector, assessment, and export failures.
- Include procedure/action IDs.
- Do not log tokens, passwords, API keys, or raw private contact data.

## Risks And Mitigations

### Risk: Phase 2 becomes a fake AI crawler

Mitigation:

- Every claim needs source, confidence, and timestamp.
- Start with bounded campaigns and durable queues.
- Keep "unknown" as an acceptable answer.

### Risk: Data licensing blocks enrichment

Mitigation:

- Start with user-imported CSV and manual enrichment.
- Add `SourcePolicy` before adding paid/scraped data.
- Do not store or export data that source terms prohibit.

### Risk: Satellite CV is expensive and unreliable

Mitigation:

- Treat CV as a provider, not the core architecture.
- Use manual/imported/OSM evidence first.
- Require accuracy benchmarking before using CV to auto-label.

### Risk: Serverless background work fails

Mitigation:

- Use resumable tile state.
- Strict time budgets.
- Cron/worker pattern, not long request handlers.
- Graceful provider failures.

### Risk: Scores look precise but are not trusted

Mitigation:

- Show drivers, blockers, source confidence, and missing data.
- Keep scoring deterministic and versioned.
- Store rank snapshots.

## Definition Of Done

### MVP Closure Done

- Auth flow verified in production.
- Interactive scan -> opportunity -> dossier -> assessment -> export verified.
- Serverless Redis/cache/rate-limit reviewed and safe.
- Current SignalGraph source honesty issues resolved.
- Critical tests added or documented if not feasible.
- Production deployment Ready.
- Commit pushed to GitHub.

### Phase 2 Done

- User can create a scan campaign.
- Campaign splits into resumable scan tiles.
- Runner processes tiles safely over multiple invocations.
- Opportunities are continuously ranked with snapshots.
- Unknown high-value opportunities generate verification tasks.
- Enrichment can be imported and matched.
- Operator queue supports daily BD workflow.
- Production verification evidence is captured.
- Commit pushed to GitHub after each coherent milestone.

## Execution Handoff For Sub-Agent

Requested executor:

- Model: `gpt-5.4-mini` or nearest available mini model.
- Reasoning: high.
- Role: autonomous implementation agent.
- Mode: execute milestone-by-milestone, starting with M0 only.

Hard rules:

- Work in `C:\Users\wasif\OneDrive\Desktop\SolarZero\solarzero`.
- Read `AGENTS.md` before source edits.
- Use existing repo envs, Supabase CLI/MCP/envs, and Vercel CLI. Do not use dashboards unless explicitly asked.
- Use Prisma Migrate for schema changes, not destructive `db push`.
- Keep changes additive and production-safe.
- Commit and push every coherent milestone.
- Do not break production auth, scan, dossier, assessment, or export.
- Run `npm run lint`, `npm run type-check`, `npm run test:run`, and `npm run build` before deployment.
- Deploy/verify with Vercel CLI before declaring production done.

Initial sub-agent prompt:

```text
You are the SolarZero Atlas Phase 2 executor. Work in:
C:\Users\wasif\OneDrive\Desktop\SolarZero\solarzero

Read this PRD first:
C:\Users\wasif\OneDrive\Desktop\SolarZero\solarzero\.omx\plans\solarzero-atlas-autonomous-intelligence-prd.md

Start with M0 only: Finish Atlas MVP Definition Of Done.

Your goals:
1. Verify the current app state locally.
2. Prove or fix the production auth flow, especially verified-user first sign-in.
3. Run an authenticated production smoke for opportunity scan, dossier, note/evidence, assessment, and CSV export where safely possible.
4. Audit serverless Redis/cache/rate-limit paths and fix any production-unsafe behavior.
5. Add missing critical tests only where they are clearly needed for M0.
6. Preserve all existing user work.
7. Commit and push every coherent fix.
8. Use Vercel CLI for production deploy/verification.
9. Use Supabase CLI/MCP/envs already in the repo if database inspection is needed. Do not use the Supabase dashboard.

Before editing:
- Read AGENTS.md.
- Inspect git status.
- Inspect relevant files before changing them.

Verification required before final:
- npm run lint
- npm run type-check
- npm run test:run
- npm run build
- Vercel deployment status Ready if you deploy
- Clear production smoke evidence or a precise blocker

Stop after M0 unless explicitly instructed to continue to M1.
```

## Launch Hints

Preferred:

```powershell
cd C:\Users\wasif\OneDrive\Desktop\SolarZero\solarzero
omx team --model gpt-5.4-mini --reasoning high --plan ".omx/plans/solarzero-atlas-autonomous-intelligence-prd.md" --start "M0 only"
```

Fallback if `omx team` is unavailable:

```powershell
cd C:\Users\wasif\OneDrive\Desktop\SolarZero\solarzero
codex --model gpt-5.4-mini --reasoning high "Read .omx/plans/solarzero-atlas-autonomous-intelligence-prd.md and execute M0 only. Commit and push coherent changes. Use Vercel CLI and Supabase CLI/envs."
```

If the exact model is unavailable, use the closest available mini executor with high reasoning.

