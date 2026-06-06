# SolarZero Atlas 100 Refinements Backlog

Created: 2026-06-06

## Purpose

This backlog converts the broad "100 refinements" request into implementation-ready batches for SolarZero Atlas.

The north star is not cosmetic polish alone. Each refinement should make Atlas more production-safe, more credible, faster to operate, easier to trust, or more useful for UAE commercial solar opportunity intelligence.

## Execution Rules

- Preserve existing user work and committed production fixes.
- Keep changes small and coherent.
- Commit and push each coherent batch.
- Run targeted tests while developing.
- Run `npm run lint`, `npm run type-check`, `npm run test:run`, and `npm run build` before production deployment or final completion.
- Use Vercel CLI for production deployment/status checks.
- Use Supabase CLI/MCP/envs already in the repo if database inspection is needed.
- Do not use the Supabase dashboard.
- Prefer truthful labels over fake precision.
- Keep SolarZero assessment/proposal generation as a subfeature inside Atlas intelligence.

## Batch A: Production Trust, Auth, And Core Flow

1. Add a clear post-verification login success path that explains when the user should sign in.
2. Add defensive login error copy for email-not-verified, invalid credentials, and server failures.
3. Ensure login/register forms never submit duplicate requests while a request is pending.
4. Ensure authenticated layout handles missing session data without blank rendering.
5. Add a user-facing toast or inline success state when an assessment completes from an opportunity.
6. Add a user-facing error state when an assessment request fails or times out.
7. Confirm sign-out returns users to a predictable public route.
8. Add a lightweight authenticated health smoke path for critical app readiness if absent.
9. Ensure auth route errors are logged with action metadata but no secrets.
10. Add focused tests for credentials normalization and verified-user sign-in behavior.

## Batch B: Opportunity Dashboard UX

11. Replace vague table labels with building display name plus secondary location/context.
12. Add a visible "source quality" indicator to every opportunity row.
13. Add a "why this rank" preview on hover or expand.
14. Add sort affordances for score, roof area, savings, confidence, and updated date.
15. Add saved quick filters for A-grade, needs verification, needs enrichment, and unassessed.
16. Persist dashboard filter state in the URL.
17. Add a table density toggle for compact versus detailed BD workflow.
18. Add row-level status transition shortcuts with optimistic feedback.
19. Add a stale-data indicator when an opportunity has not been rescored recently.
20. Improve empty states with concrete next actions based on active filters.

## Batch C: Dossier Explainability And Actionability

21. Add a compact executive summary card at the top of each opportunity dossier.
22. Add score dimension tooltips explaining roof fit, economics, regulatory, and data completeness.
23. Show top positive drivers and top blockers separately.
24. Show source/confidence/timestamp beside each intelligence claim.
25. Distinguish measured, modeled, derived, manual, and fallback values in the UI.
26. Add a "missing data" checklist to explain confidence gaps.
27. Add next-action rationale with a one-sentence operator instruction.
28. Add a dossier activity timeline combining notes, evidence, status changes, and assessments.
29. Add a copyable dossier summary for sales handoff.
30. Add print-friendly or export-friendly dossier layout refinements.

## Batch D: Map, Discovery, And Scan UX

31. Show scan radius, estimated area, and expected workload before starting a scan.
32. Add scan progress messaging that separates discovery, scoring, and assessment steps.
33. Add clear bounds/radius warnings for scans that are too broad for interactive execution.
34. Add retry guidance for OSM/Overpass provider failures.
35. Add map legend for score bands, assessed status, and solarization confidence.
36. Add marker clustering or simplified rendering for dense opportunity areas.
37. Improve search result naming so zones and landmarks do not become fake building names.
38. Add "scan this visible map area" affordance with safe limits.
39. Add "open ranked results" CTA after a scan completes.
40. Preserve the last scan location and state across navigation.

## Batch E: Assessment Results And Solar Accuracy

41. Cap system sizing by realistic usable roof area and flag low-confidence roof area.
42. Prevent impossible kWp density when roof area is tiny or geometry is suspect.
43. Show the assumptions used for panel wattage, spacing, losses, and tariff.
44. Wire SignalGraph soiling into assessment assumptions or label soiling as advisory only.
45. Add a sensitivity row for soiling/losses where applicable.
46. Add warning copy when annual savings assumes full retail offset/net metering.
47. Add DEWA/utility-specific advisory warnings for connection and consumption constraints.
48. Add range outputs for production and savings when source confidence is low.
49. Add tests for unrealistic roof area/system size edge cases.
50. Add tests for advisory versus applied soiling behavior.

## Batch F: Data Honesty, Sources, And SignalGraph

51. Ensure every connector signal stores access model, license/source note, and fetched timestamp.
52. Label Open-Meteo dust as free-tier/commercial-caution in production copy.
53. Label UAE model irradiance as modeled data, not measured site data.
54. Label PVGIS/NASA outputs as external modeled estimates.
55. Remove or relabel simulated Microsoft footprint signals unless backed by real imported data.
56. Add a source quality score derived from recency, confidence, and source type.
57. Add a stale source warning for old or fallback connector signals.
58. Add connector run failure summaries that do not break dossier rendering.
59. Add a central source/access-model legend for UI reuse.
60. Add tests for source legend and signal classification utilities.

## Batch G: Database, Query, And Performance

61. Audit indexes for opportunity filters and dashboard sorting paths.
62. Add missing indexes only through additive Prisma migrations.
63. Avoid loading heavy JSON payloads in list views unless needed.
64. Move expensive dashboard counts into efficient grouped queries.
65. Paginate opportunity lists consistently server-side.
66. Add defensive limits for CSV exports.
67. Add dedupe safeguards for buildings with missing OSM IDs using coordinate tolerance.
68. Add a backfill strategy for existing unnamed buildings without blocking requests.
69. Add query timing logs around scan, list, dossier, and assessment procedures.
70. Add tests or query-level assertions for pagination and export limits.

## Batch H: Architecture And Serverless Safety

71. Keep long-running scans out of normal Vercel request paths unless bounded.
72. Ensure Redis/cache/rate-limit paths degrade safely when envs are missing.
73. Prefer Upstash HTTP clients for request-path rate limiting and cache metadata.
74. Ensure BullMQ/ioredis code is not imported by serverless request handlers accidentally.
75. Add provider timeout helpers with AbortController where network fetches can hang.
76. Add retry policy helpers with jitter for connector calls where safe.
77. Add idempotency keys to scan/campaign operations.
78. Add clearer separation between pure scoring, data access, and UI formatting.
79. Add server-only boundaries to DB/service modules that must not enter client bundles.
80. Add tests for Redis disabled/unreachable behavior and provider timeout fallbacks.

## Batch I: Testing, Observability, And Release Confidence

81. Add integration coverage for opportunity scan -> list -> dossier.
82. Add integration coverage for note and evidence mutations.
83. Add integration coverage for assessment creation from opportunity.
84. Add integration coverage for CSV export formatting and limits.
85. Add tests for ranking snapshot creation after evidence or assessment updates.
86. Add tests for verification task creation for high-value unknown opportunities.
87. Add tests for enrichment import/match helpers when implemented.
88. Add structured error logging for auth, scan, connector, assessment, and export.
89. Add a production smoke checklist script or documented command set.
90. Add CI parity notes so local gates match GitHub checks.

## Batch J: UI Polish, Accessibility, And Operator Efficiency

91. Improve keyboard navigation on dashboard filters and table actions.
92. Add accessible labels and aria-live updates for scan and assessment status.
93. Improve mobile layout for opportunity table, dossier, and map actions.
94. Add loading skeletons that match final layout dimensions.
95. Add visual hierarchy refinements to make A-grade opportunities feel obvious.
96. Add consistent badges for score band, confidence, source type, and workflow status.
97. Add inline microcopy for UAE-specific assumptions instead of burying them in raw tables.
98. Add "copy coordinates" and "open in maps" actions on dossiers.
99. Add a recent activity or "continue where you left off" module.
100. Add final release notes summarizing shipped refinements, verification evidence, and known limits.

## Suggested Implementation Order

1. Batch A and H first because they protect production.
2. Batch E and F next because they protect trust in the results.
3. Batch B, C, D, and J next because they improve daily operator workflow.
4. Batch G and I run throughout, attached to the features they support.

## Completion Evidence Template

For each batch, record:

- Files changed.
- Refinements completed by number.
- Tests added or updated.
- Commands run.
- Commit hash.
- Push status.
- Production deploy/status if applicable.
- Known limitations.
