# SolarZero Atlas Winning PRD

## Product Decision

SolarZero should become a UAE solar opportunity intelligence system, with the current SolarZero assessment/proposal experience repositioned as one module inside the larger workflow.

The winning product is not another solar calculator. The winning product is:

> Find unsolarized UAE rooftops, rank which ones are worth pursuing, investigate every technical/commercial/regulatory angle, then generate the SolarZero assessment and proposal package for the best targets.

Working name: SolarZero Atlas.

## Executive Summary

SolarZero currently has strong proof-of-capability: map discovery, persisted building records, UAE-aware assessment, financing outputs, sensitivity analysis, proposal/3D presentation, auth, tests, and production hardening. The commit history shows the app moved from scaffold to production fixes to heavy 3D visual polish. That visual layer is valuable for demos and sales conversations, but the business wedge is upstream: opportunity discovery and lead qualification.

The product should pivot from "assess this building" to "show me the best buildings to solarize next." The assessment page remains critical, but it becomes the conversion proof after the system has already found and qualified a target.

This PRD is designed for an execution agent. It assumes the current Next.js/tRPC/Prisma app remains the foundation.

## Non-Blocking Assumptions

- Target buyer is a UAE/GCC commercial solar EPC, developer, ESCO, or asset owner, not residential homeowners.
- MVP geography is UAE, with Dubai as the best first proving ground because DEWA/Shams Dubai data and rules are the clearest.
- MVP focuses on commercial, industrial, warehouse, mall, logistics, school, healthcare, and large public/private building opportunities.
- MVP does not need perfect satellite computer vision on day one. It should represent solarization status as evidence with confidence, starting with manual/imported/OSM/evaluator signals and leaving CV as a Phase 2 data source.
- Existing SolarZero assessment, financing, sensitivity, proposal, and 3D code should be reused, not rebuilt.
- Production quality matters, but the first strategic win is a credible prioritized opportunity pipeline, not perfect visual realism.

## Evidence From Current Codebase

- Root route sends users directly to the map at `solarzero/src/app/page.tsx:4`.
- Map search currently triggers `building.discoverArea` with a 200m radius at `solarzero/src/app/(app)/map/page.tsx:24` and `solarzero/src/app/(app)/map/page.tsx:32`.
- The map reads viewport buildings through `api.building.list` at `solarzero/src/components/map/MapView.tsx:43` and renders marker popups with roof area, assessment summary, and a link to building detail at `solarzero/src/components/map/MapView.tsx:118`.
- `discoverArea` already validates UAE bounds, queries OSM, parses buildings, deduplicates existing `osmId`s, and persists new buildings at `solarzero/src/server/api/routers/building.ts:158`.
- `building.list` already returns buildings in a bounding box with assessment summary fields at `solarzero/src/server/api/routers/building.ts:224`.
- Current `Building` schema has `hasSolar Boolean @default(false)` but no opportunity score, evidence, lead ownership, owner/contact enrichment, data-source confidence, or workflow status at `solarzero/prisma/schema.prisma:10`.
- Current `Assessment` schema stores technical/financial outputs only at `solarzero/prisma/schema.prisma:31`.
- Current assessment router uses stored building footprint as source of truth and persists the assessment at `solarzero/src/server/api/routers/assessment.ts:16`.
- Assessment engine supports stored footprint, OSM fallback, Solcast/cache/UAE-model irradiance, temperature derating, and cost calculation at `solarzero/src/lib/engine/assessment.ts:81`.
- Cost engine calculates panel count, system size, production, capex, savings, payback, NPV, and CO2 at `solarzero/src/lib/engine/cost.ts:32`.
- Building detail page already displays Solar Assessment Results, Financing Options, Sensitivity Analysis, 3D Visualization, and building utility/tariff info at `solarzero/src/app/(app)/buildings/[id]/page.tsx:300`.
- Test infrastructure exists for engine, financing, sensitivity, regulatory config, and utilities under `solarzero/src/test`.
- Production scripts exist for `lint`, `type-check`, `test:run`, `test:coverage`, and `build` in `solarzero/package.json`.

## Market And Positioning Evidence

- DEWA Shams Dubai explicitly connects solar energy to buildings and encourages building owners to install PV, consume onsite electricity, and export surplus to DEWA's network: https://www.dewa.gov.ae/en/shamsdubai
- DEWA FAQ says installed capacity cannot exceed the applicable share of Total Connected Load and may be further limited by grid integration constraints: https://www.dewa.gov.ae/en/consumer/solar-community/shams-dubai/shams-dubai-faq
- DEWA FAQ says system size depends on electricity use, roof size, and investment level: https://www.dewa.gov.ae/en/consumer/solar-community/shams-dubai/shams-dubai-faq
- DEWA reported Hab Reeh processed over 1,700 solar connection requests in 2024, up more than 30% YoY, with Shams Dubai reaching 725 MW across more than 8,430 buildings by June 2025: https://dewa.gov.ae/en/about-us/media-publications/latest-news/2025/06/dewas-hab-reeh-platform-accelerates-adoption-of-solar-energy
- Planno already positions itself as AI-powered C&I solar prospecting and lists UAE coverage, so SolarZero should not claim "first ever solar prospecting software in UAE": https://planno.io/
- pv magazine reported Planno as a UAE-based C&I solar prospecting platform using geospatial AI, satellite data, imagery, ML, energy potential estimates, and business contacts: https://www.pv-magazine.com/2026/01/19/new-software-identifies-optimal-rooftops-for-ci-solar/
- DEWA already has a Shams Dubai calculator, so a basic calculator alone is not a durable moat: https://www.dewa.gov.ae/SolarCalculator/index.html

## Recommended Positioning

Primary positioning:

> SolarZero Atlas is UAE-first solar opportunity intelligence for commercial rooftops. It finds unsolarized buildings, scores their solar potential, explains the evidence, flags regulatory and deal risks, and turns the best targets into proposal-ready SolarZero assessments.

Avoid:

- "UAE's first solar intelligence system"
- "Guaranteed savings"
- "Fully automated bankable engineering assessment"
- "Detects all existing solar installations" until actual CV or verified data sources exist

Use instead:

- "UAE-first"
- "Opportunity intelligence"
- "Evidence-backed rooftop prioritization"
- "Assessment-ready commercial solar pipeline"
- "Confidence-scored solarization evidence"

## Product Principles

1. Lead with prioritization, not visualization.
2. Every score must explain why.
3. Every automated claim must carry a confidence level and evidence source.
4. Use the current assessment engine as a proof layer, not the whole product.
5. Prefer useful imperfect intelligence over fake precision.
6. Make the product valuable before paid satellite/CV integrations.
7. Preserve production stability while changing the information architecture.

## Primary User Personas

### Solar Developer / ESCO Sales Lead

Needs to identify high-probability commercial solar targets quickly. Wants a ranked list, map filters, reasons to call, and proposal-ready economics.

Success means finding 50 qualified leads in a target area without manually scanning Google Maps for days.

### Technical Pre-Sales Engineer

Needs to validate whether a sales opportunity is technically plausible. Wants roof area, usable area, system sizing, production, tariff assumptions, grid/regulatory flags, and confidence notes.

Success means knowing which targets deserve an actual site visit.

### Founder / BD Operator

Needs to prove the UAE market opportunity, show investor/customer traction, and build a repeatable outbound machine.

Success means turning geographic scans into a pipeline dashboard with clear business value.

## Jobs To Be Done

- When I enter a UAE area, I want the system to discover buildings and rank the best unsolarized solar opportunities so I can focus outreach.
- When I view an opportunity, I want to see why it scored highly or poorly so I trust the system.
- When solarization status is uncertain, I want to see evidence and confidence instead of a fake binary.
- When I pick a building, I want SolarZero to run the technical/financial assessment and generate a proposal-ready dossier.
- When I revisit an area, I want to see which opportunities are new, reviewed, rejected, contacted, or converted.

## MVP Scope

### P0: Opportunity Data Model

Add first-class opportunity intelligence tables while preserving existing Building and Assessment.

Required models:

- `Opportunity`
- `OpportunityScore`
- `SolarizationEvidence`
- `InvestigationRun`
- `InvestigationRunBuilding`
- `OpportunityNote`

Optional but recommended if time allows:

- `CompanySignal`
- `ContactSignal`
- `OutreachActivity`

MVP should avoid hard-coding business contacts unless there is a reliable source. Represent contact enrichment as future-compatible nullable data.

### P0: Opportunity Scoring Engine

Create a deterministic, testable scoring engine.

Inputs:

- Roof area
- Building type
- Emirate / utility / tariff
- Existing assessment if present
- Solarization evidence confidence
- Assessment economics
- Distance/location metadata if available
- Data completeness

Outputs:

- `scoreTotal` from 0 to 100
- `scoreBand`: `A`, `B`, `C`, `D`, `REJECT`
- `reasons`: structured list of reasons
- `risks`: structured list of risks
- `nextAction`: `ASSESS`, `VERIFY_SOLARIZATION`, `ENRICH_OWNER`, `CONTACT`, `REJECT`
- `confidence`: 0 to 1

Initial scoring formula:

```text
scoreTotal =
  roofFitScore * 0.30 +
  economicsScore * 0.25 +
  buildingTypeScore * 0.15 +
  unsolarizedConfidenceScore * 0.15 +
  dataCompletenessScore * 0.10 +
  regulatorySimplicityScore * 0.05
```

Initial gates:

- Reject if `roofAreaM2 < 250` for commercial MVP, unless manually overridden.
- Penalize if `hasSolar=true` or high-confidence evidence says solar already exists.
- Penalize if roof area is null or below confidence threshold.
- Penalize residential/villa by default for MVP.
- Prioritize warehouse, industrial, commercial, retail, school, hospital, logistics, and mall-like buildings.

### P0: Scan Area Workflow

Replace the current "search location then discover 200m" flow with an explicit opportunity scan.

Flow:

1. User searches/selects area.
2. User clicks "Scan Area".
3. System creates `InvestigationRun`.
4. System calls existing OSM discovery in bounded chunks.
5. System creates/updates `Building`.
6. System creates/updates `Opportunity`.
7. System scores each opportunity.
8. UI shows scan summary and ranked opportunities.

MVP scan limits:

- Default radius: 500m
- Max radius for interactive scan: 2km
- Max buildings per scan: 500
- Longer scans require background job support or a warning.

### P0: Opportunity Dashboard

Create a new default landing experience that shows the pipeline, not just the map.

Route:

- `/opportunities`

Dashboard components:

- KPI cards: total opportunities, A-grade, unassessed, needs verification, contacted, rejected.
- Ranked table with score, building type, roof area, system size if assessed, annual savings if assessed, solarization confidence, next action, status.
- Filters: score band, building type, emirate, utility, assessed/unassessed, has solar/unknown/no solar, min roof area, min NPV, status.
- Bulk actions: run assessments for selected, mark reviewed, mark rejected, export CSV.
- Link to map and building detail.

### P0: Opportunity Map Overlay

Keep the map, but make it an intelligence view.

Markers should encode:

- Score band by color
- Solarization status by marker outline
- Assessed status by marker icon/detail

Popup should show:

- Opportunity score
- Top 3 reasons
- Top risk
- Roof area
- Assessment summary if present
- "Open dossier" CTA

### P0: Opportunity Dossier

Create a page or section for each opportunity.

Route options:

- Preferred: `/opportunities/[id]`
- Acceptable: extend `/buildings/[id]` with an Opportunity tab

Dossier sections:

- Executive summary
- Score breakdown
- Evidence timeline
- Solarization status
- Building facts
- Assessment summary
- Financing summary
- Regulatory/utility notes
- Data confidence
- Recommended next action
- Notes and status

The existing building assessment UI should be embedded as the "SolarZero Assessment" tab/section.

### P0: Manual Evidence And Review Loop

The MVP needs a truth-maintenance loop because satellite/CV will not be perfect.

Users can add evidence:

- "Solar visible on imagery"
- "No solar visible on imagery"
- "Existing customer installation"
- "Manual site knowledge"
- "OSM/source tag"
- "Unknown"

Each evidence entry must include:

- `source`
- `sourceUrl` optional
- `observedAt` optional
- `confidence`
- `notes`
- `createdBy`

Building `hasSolar` may be derived from evidence, but raw evidence must remain auditable.

### P1: Background Job Friendly Scan Architecture

Interactive scanning can start synchronous if carefully bounded, but the architecture should allow migration to background jobs.

Because the repo already includes `bullmq` and Redis libraries, the executor should inspect existing queue usage before adding new infrastructure. If no production-safe queue exists, keep MVP synchronous and add a clear `scanStatus` model that can be wired to background workers later.

### P1: CSV Export

Export ranked opportunities with:

- Building ID
- Opportunity ID
- Address
- Lat/lng
- Building type
- Roof area
- Score
- Score band
- Next action
- Solarization status/confidence
- System size
- Annual production
- Annual savings
- NPV
- Payback
- Data confidence

### P1: Run Assessments In Bulk

Allow selected opportunities to run the existing assessment engine. Use concurrency limits and rate limiting to protect Solcast/OSM/cache.

Acceptance target:

- 25 selected buildings can be assessed without UI lockup or unhandled server errors.

### P1: Improved Regulatory Risk Flags

Use existing emirate config and DEWA FAQ constraints to produce early warnings:

- System may be constrained by Total Connected Load.
- Systems above 400 kW in Dubai may need dedicated equipment/connection considerations.
- Savings depend on consumption profile, not just roof potential.
- Multi-tenant buildings may only offset common-area consumption unless account structure allows otherwise.

These should be advisory, not legal/engineering guarantees.

### P2: Owner / Company / Contact Enrichment

Add once a reliable data source is selected. Do not fake this.

Possible sources:

- User-imported CRM CSV
- Manual entry
- Business registry/commercial directory if legally usable
- Google Places if terms and data retention are acceptable
- HubSpot/Salesforce integration later

### P2: Solarization CV

Add computer vision only when the team can access reliable imagery and has a validation loop.

Architecture:

- `SolarizationProvider` interface
- `ManualEvidenceProvider`
- `ImportedCsvProvider`
- `VisionProvider` later
- `GoogleSolarProvider` later if UAE coverage supports detected arrays

## Suggested Prisma Schema Additions

```prisma
model Opportunity {
  id                    String   @id @default(cuid())
  buildingId            String   @unique
  building              Building @relation(fields: [buildingId], references: [id], onDelete: Cascade)
  status                String   @default("new")
  priority              String   @default("unreviewed")
  scoreTotal            Float    @default(0)
  scoreBand             String   @default("D")
  confidence            Float    @default(0)
  nextAction            String   @default("ASSESS")
  reasonsJson           Json?
  risksJson             Json?
  lastScoredAt          DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  scores                OpportunityScore[]
  evidence              SolarizationEvidence[]
  notes                 OpportunityNote[]

  @@index([scoreBand, scoreTotal])
  @@index([status])
  @@index([nextAction])
}

model OpportunityScore {
  id                    String      @id @default(cuid())
  opportunityId          String
  opportunity            Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  version                String
  roofFitScore           Float
  economicsScore         Float
  buildingTypeScore      Float
  unsolarizedScore       Float
  dataCompletenessScore  Float
  regulatoryScore        Float
  totalScore             Float
  reasonsJson            Json?
  risksJson              Json?
  createdAt              DateTime    @default(now())

  @@index([opportunityId, createdAt])
}

model SolarizationEvidence {
  id             String      @id @default(cuid())
  opportunityId  String
  opportunity    Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  status         String
  source         String
  sourceUrl      String?
  confidence     Float
  notes          String?
  observedAt     DateTime?
  createdBy      String?
  createdAt      DateTime @default(now())

  @@index([opportunityId])
  @@index([status, confidence])
}

model InvestigationRun {
  id             String   @id @default(cuid())
  name           String?
  centerLat      Float
  centerLng      Float
  radiusMeters   Int
  status         String   @default("pending")
  buildingsFound Int      @default(0)
  opportunitiesCreated Int @default(0)
  error          String?
  createdBy      String?
  createdAt      DateTime @default(now())
  completedAt    DateTime?

  buildings      InvestigationRunBuilding[]

  @@index([status, createdAt])
}

model InvestigationRunBuilding {
  id                 String @id @default(cuid())
  investigationRunId  String
  buildingId          String
  opportunityId       String?
  action              String
  createdAt           DateTime @default(now())

  @@index([investigationRunId])
  @@index([buildingId])
}

model OpportunityNote {
  id             String      @id @default(cuid())
  opportunityId  String
  opportunity    Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  body           String
  createdBy      String?
  createdAt      DateTime @default(now())
}
```

The executor must update `Building` relation fields accordingly.

## Backend Implementation Plan

### Step 1: Read Required Docs And Verify Baseline

Before source edits, comply with `solarzero/AGENTS.md`: read relevant Next.js docs under `solarzero/node_modules/next/dist/docs/`.

Run:

```powershell
cd C:\Users\wasif\OneDrive\Desktop\SolarZero\solarzero
npm run lint
npm run type-check
npm run test:run
```

### Step 2: Add Prisma Models And Migration

Files:

- `solarzero/prisma/schema.prisma`

Tasks:

- Add models above.
- Add `Building.opportunity Opportunity?`.
- Generate migration using Prisma.
- Ensure existing data remains valid.

Acceptance:

- `npx prisma validate` passes.
- Migration applies locally against the configured database.
- Prisma client generation succeeds.

### Step 3: Add Opportunity Scoring Engine

Files:

- `solarzero/src/lib/opportunity/scoring.ts`
- `solarzero/src/lib/opportunity/types.ts`
- `solarzero/src/test/opportunity/scoring.test.ts`

Tasks:

- Implement pure deterministic scoring function.
- Version the scoring formula, e.g. `v1.0`.
- Return total score, band, reasons, risks, confidence, and next action.
- Cover edge cases: tiny roofs, null roof area, already solarized, assessed high NPV, assessed poor economics, warehouse prioritization, residential penalty.

Acceptance:

- Unit tests cover at least 12 cases.
- No network or DB calls inside scoring function.
- Score output is stable for identical input.

### Step 4: Add Opportunity Service

Files:

- `solarzero/src/server/services/opportunity.ts`

Tasks:

- `ensureOpportunityForBuilding(buildingId)`
- `scoreOpportunity(opportunityId)`
- `scoreBuildings(buildingIds)`
- `deriveSolarizationStatus(opportunityId)`
- Keep business logic outside tRPC router where possible.

Acceptance:

- Service can create and score opportunities for existing buildings.
- Existing buildings without opportunities can be backfilled.
- Solarization evidence is preserved and not overwritten.

### Step 5: Add Opportunity Router

Files:

- `solarzero/src/server/api/routers/opportunity.ts`
- `solarzero/src/server/api/root.ts`

Procedures:

- `list`
- `getById`
- `getByBuildingId`
- `scanArea`
- `rescore`
- `addSolarizationEvidence`
- `updateStatus`
- `addNote`
- `exportCsv` or server action/API route if easier

Acceptance:

- List supports pagination and filters.
- Scan area returns an investigation run summary.
- Add evidence updates opportunity confidence and derived status.
- Protected mutations require auth.
- Public reads remain limited if current product expects authenticated app.

### Step 6: Refactor Building Discovery For Reuse

Files:

- `solarzero/src/server/api/routers/building.ts`
- `solarzero/src/server/services/buildingDiscovery.ts`

Tasks:

- Extract OSM discovery/persist logic from router into service.
- Reuse it from both `building.discoverArea` and `opportunity.scanArea`.
- Preserve existing API behavior for map page.

Acceptance:

- Existing map discovery still works.
- New opportunity scan uses same dedupe behavior.
- Tests or integration checks cover duplicate OSM IDs.

### Step 7: Backfill Existing Buildings

Files:

- `solarzero/scripts/backfill-opportunities.ts` or npm script if repo already has script conventions

Tasks:

- Create opportunity records for existing buildings.
- Score all opportunities.
- Log counts.

Acceptance:

- Script can be run safely more than once.
- Does not duplicate opportunities.

## Frontend Implementation Plan

### Step 8: Create Opportunity Dashboard

Files:

- `solarzero/src/app/(app)/opportunities/page.tsx`
- `solarzero/src/components/opportunities/OpportunityTable.tsx`
- `solarzero/src/components/opportunities/OpportunityFilters.tsx`
- `solarzero/src/components/opportunities/OpportunityKpis.tsx`

Tasks:

- Build filterable ranked table.
- Add KPI summary.
- Add loading/error/empty states.
- Link rows to opportunity dossier.

Acceptance:

- User can filter by score band, building type, status, assessment status, min roof area.
- Table shows at least score, band, building type, roof area, solar status/confidence, annual savings if assessed, next action, status.
- Empty state explains how to run a scan.

### Step 9: Make Opportunities The Default Product Surface

Files:

- `solarzero/src/app/page.tsx`
- Navigation/sidebar component, wherever current app nav is defined

Tasks:

- Redirect root to `/opportunities` instead of `/map`.
- Add nav item: Opportunities.
- Keep Map and Assessments accessible.

Acceptance:

- New users land on opportunity intelligence, not just the map.
- Existing map route still works.

### Step 10: Upgrade Map Into Opportunity Overlay

Files:

- `solarzero/src/components/map/MapView.tsx`
- `solarzero/src/app/(app)/map/page.tsx`

Tasks:

- Fetch opportunities by viewport instead of or in addition to bare buildings.
- Color markers by score band.
- Show solarization status/confidence.
- Popup links to opportunity dossier.
- Add "Scan Area" CTA and scan status summary.

Acceptance:

- Map visually distinguishes A/B/C/D/rejected opportunities.
- Popup top line says opportunity score and next action.
- User can initiate scan without leaving map.

### Step 11: Create Opportunity Dossier

Files:

- `solarzero/src/app/(app)/opportunities/[id]/page.tsx`
- `solarzero/src/components/opportunities/ScoreBreakdown.tsx`
- `solarzero/src/components/opportunities/EvidenceTimeline.tsx`
- `solarzero/src/components/opportunities/OpportunityActions.tsx`

Tasks:

- Show executive summary, score breakdown, reasons, risks, evidence, building facts, assessment summary, and next actions.
- Add buttons for run assessment, add evidence, update status, add note.
- Link to existing building page or embed existing assessment sections.

Acceptance:

- A sales/technical user can understand why an opportunity is worth pursuing in under 60 seconds.
- The page never implies confidence is higher than evidence supports.
- User can add evidence and see score/confidence update.

### Step 12: Bulk Assessment And CSV Export

Files:

- Opportunity dashboard components
- Opportunity router/service

Tasks:

- Add row selection.
- Add bulk "Run assessment" for selected unassessed opportunities.
- Add CSV export respecting current filters.

Acceptance:

- 25 selected opportunities can run assessments with progress/error feedback.
- CSV opens in Excel/Google Sheets with expected columns.

## UX Requirements

### Information Architecture

Primary nav:

- Opportunities
- Map
- Assessments
- Proposals

Recommended user flow:

```text
Opportunities -> Scan Area -> Ranked Results -> Dossier -> Run SolarZero Assessment -> Proposal/Outreach
```

### Visual Language

Keep the existing premium solar brand, but make the opportunity product feel more like an intelligence terminal than a calculator.

Design cues:

- Score bands as clear operational signals.
- Evidence confidence as badges/progress bars.
- Dossier sections that feel like an investigation file.
- Map markers optimized for scanning many targets.
- Avoid overusing 3D on list/dashboard views.

### Empty States

Opportunity dashboard empty state:

> No opportunities yet. Scan a UAE area to discover buildings, score rooftop potential, and build your first solar prospecting pipeline.

### Score Reason Examples

Good reasons:

- "Large 4,820 m2 roof suitable for C&I solar."
- "Warehouse building type is high-priority for flat-roof solar."
- "No high-confidence solar evidence recorded."
- "Assessment estimates AED 84,000 annual savings."

Bad reasons:

- "AI says good."
- "High potential."
- "Looks promising."

## Acceptance Criteria

### Product Acceptance

- User can scan a UAE area and receive a ranked list of opportunities.
- Every opportunity has a score, score band, confidence, top reasons, risks, and next action.
- User can open an opportunity dossier and understand technical, commercial, solarization, and regulatory context.
- User can run the existing SolarZero assessment from the opportunity workflow.
- User can manually add solarization evidence and see opportunity confidence/status update.
- User can filter and export opportunities.

### Technical Acceptance

- Existing building discovery continues to work.
- Existing building assessment continues to use stored building footprint.
- Existing assessment, financing, sensitivity, proposal, and 3D pages are not regressed.
- Prisma migration is additive and safe for existing data.
- Opportunity scoring has deterministic unit tests.
- tRPC procedures validate inputs with zod.
- Scan workflow handles duplicate OSM buildings idempotently.
- Scan workflow has limits to avoid production timeouts.
- Protected mutations require authenticated sessions.

### Quality Gates

Before committing:

```powershell
cd C:\Users\wasif\OneDrive\Desktop\SolarZero\solarzero
npm run lint
npm run type-check
npm run test:run
npm run build
```

Before production deploy:

```powershell
vercel pull --yes --environment=production
vercel build --prod
vercel deploy --prebuilt --prod
```

Use the repo's existing GitHub workflow expectations. Commit and push after each coherent production-safe milestone.

## Suggested Milestones

### Milestone 1: Data Foundation

Deliverables:

- Prisma models
- Migration
- Scoring engine
- Unit tests
- Backfill script

Definition of done:

- Existing buildings can be backfilled into scored opportunities.

### Milestone 2: API And Scan Workflow

Deliverables:

- Opportunity service
- Opportunity router
- Extracted building discovery service
- `scanArea`
- Evidence mutation
- Status/note mutation

Definition of done:

- A frontend or tRPC caller can scan an area and receive scored opportunities.

### Milestone 3: Opportunity Dashboard

Deliverables:

- `/opportunities`
- KPI cards
- Ranked table
- Filters
- CSV export
- Root redirect changed to `/opportunities`

Definition of done:

- User can operate the product from the dashboard without touching the map.

### Milestone 4: Map Intelligence Overlay

Deliverables:

- Score-colored markers
- Opportunity popups
- Scan CTA
- Map-to-dossier navigation

Definition of done:

- Map becomes a prioritization surface, not just building display.

### Milestone 5: Dossier And Assessment Integration

Deliverables:

- `/opportunities/[id]`
- Score breakdown
- Evidence timeline
- Run assessment action
- Assessment summary
- Notes/status actions

Definition of done:

- User can move from opportunity to SolarZero assessment/proposal.

### Milestone 6: Production Verification

Deliverables:

- Full local test suite passing
- Vercel production build passing
- Production deploy
- Smoke test registration/login/map/opportunities/scan/assessment
- GitHub commit and push

Definition of done:

- Production URL supports the full core workflow without internal server errors.

## Risks And Mitigations

### Risk: Claiming "first" is challenged by Planno

Mitigation:

- Use "UAE-first" and "SolarZero Atlas" positioning.
- Differentiate around UAE regulatory/dossier/proposal workflow rather than claiming no competitors exist.

### Risk: Solarization detection is weak without satellite CV

Mitigation:

- Model solarization as evidence plus confidence.
- Build manual/import/imported evidence first.
- Add CV as a provider later.

### Risk: Scanning large areas times out on serverless

Mitigation:

- Limit synchronous scans.
- Store `InvestigationRun` records.
- Design for background processing.
- Use chunking/concurrency limits.

### Risk: Scores create false precision

Mitigation:

- Show score breakdown and confidence.
- Use bands and next actions instead of pretending exact decimal scores are truth.

### Risk: Financial estimates are wrong for multi-tenant/low-consumption buildings

Mitigation:

- Flag savings dependency on consumption.
- Add risk notes for account structure and Total Connected Load.
- Keep the assessment estimate clearly non-bankable until validated.

### Risk: Product gets bogged down in 3D polish again

Mitigation:

- No new 3D features in P0.
- Existing 3D remains inside dossier/proposal only.
- P0 success is ranked qualified opportunities.

## Metrics

### Activation

- User scans first area.
- User opens first opportunity dossier.
- User runs first assessment from opportunity.

### Core Product

- Opportunities discovered per scan.
- Percent of scanned buildings scored A/B.
- Percent of opportunities with assessment.
- Percent of opportunities with reviewed solarization evidence.
- Time from area search to ranked list.

### Business

- Qualified opportunities exported per week.
- Opportunities moved to contacted.
- Opportunities converted to proposal.
- Proposal conversion rate once tracked.

## Verification Plan

### Unit Tests

- Scoring formula.
- Score bands.
- Evidence-derived solarization status.
- Scan deduplication utilities if extracted as pure helpers.

### Integration Tests

- `scanArea` creates an investigation run and opportunities.
- `addSolarizationEvidence` updates confidence and status.
- `rescore` updates score history.
- `list` filters by score band/status/roof area.

### E2E / Manual Smoke

- Register/login.
- Open `/opportunities`.
- Run scan in Dubai coordinates.
- Open dossier.
- Add no-solar evidence.
- Run assessment.
- Verify assessment metrics appear.
- Export CSV.
- Open map and confirm marker score styling.

### Production Smoke

- `GET /api/health` if configured.
- Login existing user.
- Visit `/opportunities`.
- Run a small scan only.
- Open one opportunity.
- Run assessment on one known building.
- Confirm no 500s in Vercel logs.

## Handoff Prompt For Execution AI

Use this prompt to offload implementation:

```text
You are implementing the SolarZero Atlas PRD at C:\Users\wasif\OneDrive\Desktop\SolarZero\.omx\plans\solarzero-atlas-winning-prd.md.

Rules:
- Work in C:\Users\wasif\OneDrive\Desktop\SolarZero\solarzero.
- Read AGENTS.md first.
- Before editing Next.js code, read relevant docs in node_modules/next/dist/docs/ as required by AGENTS.md.
- Preserve existing auth, assessment, proposal, map, and 3D behavior.
- Do not rewrite the app. Add the opportunity intelligence layer around the existing product.
- Use Prisma/tRPC/Next.js patterns already present in the repo.
- Keep migrations additive.
- Add tests for opportunity scoring and critical services.
- Run npm run lint, npm run type-check, npm run test:run, and npm run build before declaring done.
- Commit and push every coherent milestone.

Start with Milestone 1 from the PRD, then proceed milestone by milestone.
```

## ADR

### Decision

Reposition SolarZero as SolarZero Atlas: a UAE solar opportunity intelligence platform. Keep the existing SolarZero assessment/proposal/3D experience as a subfeature used after an opportunity is discovered and prioritized.

### Drivers

- Existing code already supports building discovery and assessment.
- Competitors and DEWA tools make a standalone calculator less defensible.
- The highest-value workflow is finding and qualifying targets, not only assessing a user-selected building.
- The product must be executable quickly by reusing current architecture.

### Alternatives Considered

- Keep polishing the 3D assessment product.
- Build a pure satellite/CV platform first.
- Build a generic global solar calculator.
- Build a CRM/outreach tool first.

### Why Chosen

Opportunity intelligence is the strongest wedge because it turns SolarZero from reactive calculator into proactive pipeline generation. It also allows gradual data-source improvement: manual/evidence-based solarization now, CV and enrichment later.

### Consequences

- New schema and product surface are required.
- Existing map and building detail pages need repositioning.
- Scoring quality and explainability become core product quality.
- Some claims must be confidence-scored rather than definitive.

### Follow-Ups

- Validate buyer preference with 3 to 5 UAE solar operators.
- Decide whether to brand as SolarZero Atlas, SolarZero Scout, or SolarZero Intelligence.
- Identify first reliable enrichment source for owner/company/contact data.
- Decide if Planno is competitor, benchmark, or possible integration/partnership angle.

## Goal-Mode Follow-Up Suggestions

- Recommended: use `$ultragoal` with this PRD as the durable implementation ledger.
- Recommended for speed: use `$team` alongside `$ultragoal` with separate lanes for schema/backend, scoring/tests, dashboard UI, map/dossier UI, and verification/deploy.
- Use `$autoresearch-goal` only if the next task is market/data-source research rather than implementation.
- Use `$performance-goal` only after the feature exists and scan/query performance needs measurable optimization.
- Use `$ralph` only if a single persistent executor is explicitly preferred over parallel team execution.

## Team Launch Hints

Suggested parallel lanes:

- Data/backend lead: Prisma models, migrations, services, routers.
- Scoring/test lead: pure scoring engine, unit tests, service integration tests.
- Dashboard frontend lead: `/opportunities`, table, filters, CSV UX.
- Map/dossier frontend lead: map overlay and opportunity detail.
- Verification/release lead: lint/type/test/build, Vercel deploy, production smoke.

Suggested commands:

```text
$ultragoal implement SolarZero Atlas using C:\Users\wasif\OneDrive\Desktop\SolarZero\.omx\plans\solarzero-atlas-winning-prd.md
$team implement SolarZero Atlas using C:\Users\wasif\OneDrive\Desktop\SolarZero\.omx\plans\solarzero-atlas-winning-prd.md with lanes: data-backend, scoring-tests, dashboard-ui, map-dossier-ui, verification-release
```

Team verification path:

- Each lane reports files changed, tests added, commands run, and unresolved risks.
- Verification lane must run final quality gates after all lanes merge.
- Ultragoal owner checkpoints each milestone only after evidence is attached.

## Changelog

- Created initial PRD for SolarZero Atlas opportunity intelligence pivot.
- Grounded plan in current repo files, commit trajectory, and current UAE/competitor market evidence.
- Added execution handoff prompt, ADR, scoring model, schema proposal, frontend/backend milestones, and verification gates.
