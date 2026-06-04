# Handoff to Codex — SolarZero Production Fix

**Date:** 2026-06-04
**Repo:** `https://github.com/HyperionBurn/solarzero`
**Working dir:** `C:\Users\wasif\OneDrive\Desktop\SolarZero\solarzero`
**Branch:** `master` (up to date with `origin/master`)
**Production URL:** `https://solarzero.vercel.app`

---

## TL;DR — What's Broken

**Auth doesn't work in production.** Users hitting "Internal server error" on sign-in. Two root causes identified:

1. **DATABASE_URL corrupted with trailing newlines** — Every time we run `vercel env add DATABASE_URL production` via the CLI, it appends a newline character. Prisma then throws `the URL must start with the protocol postgresql://` because the actual value stored is `\npostgresql://...`. The Vercel CLI itself warns `WARNING! Value contains newlines` but STILL saves the corrupted value.

2. **Redis (ioredis) ETIMEDOUT** — Upstash Redis via `rediss://` protocol times out from Vercel's serverless. Non-blocking (redis.ts has a mock fallback), but means rate limiting, caching, and BullMQ queues all silently fail to the mock.

**Secondary issues (non-blocking but should be fixed):**
- `SENTRY_PROJECT` env var likely has trailing newline too (slug error on source map upload)
- `NEXT_PUBLIC_MAPBOX_TOKEN` and `SOLCAST_API_KEY` are empty strings on Vercel

---

## Architecture Overview

```
Next.js 16.2.6 (App Router, standalone output)
├── Auth: NextAuth v5 beta.31 (credentials provider, JWT strategy)
├── DB: Supabase PostgreSQL via Prisma 6.19
├── Cache/Queue: Upstash Redis via ioredis + BullMQ + @upstash/ratelimit
├── tRPC: v11 (superjson transformer, protectedProcedure middleware)
├── Storage: Supabase Storage (replaced Cloudflare R2)
├── Email: Resend (free tier, onboarding@resend.dev)
├── Error tracking: Sentry v10.56 (client + server, no edge)
├── PDF: pdfmake (Roboto font extracted from VFS bundle)
├── Map: MapLibre GL + CARTO tiles (free, no Mapbox token needed)
├── Solar data: Overpass API (OSM buildings) + Solcast (pending API key) + custom UAE model (fallback)
└── Logging: Pino (console in prod, file in dev)
```

### Database Schema (Prisma)
- **Building** — OSM footprint, lat/lng, roofAreaM2, buildingType
- **Assessment** — 1:1 with Building, solar sizing + financials
- **Proposal** — PDF generation status + URL
- **User** — email/password (bcrypt), role, emailVerified
- **Account / Session / VerificationToken** — NextAuth adapter tables

### Key Files
```
src/
├── app/
│   ├── layout.tsx              # Root layout (ThemeProvider > SessionProvider > TRPCProvider)
│   ├── page.tsx                # Landing page
│   ├── global-error.tsx        # Sentry error boundary
│   ├── (auth)/
│   │   ├── login/page.tsx      # signIn("credentials", { redirect: false })
│   │   └── register/page.tsx   # POST /api/auth/register → auto signIn
│   ├── (app)/
│   │   ├── map/page.tsx        # Main map view
│   │   ├── buildings/[id]/page.tsx
│   │   ├── assessments/page.tsx
│   │   └── proposals/[id]/page.tsx
│   ├── p/[id]/page.tsx         # Public proposal (no auth)
│   └── api/
│       ├── auth/[...nextauth]/route.ts  # NextAuth handler
│       ├── auth/register/route.ts       # Registration + email verification
│       └── trpc/[trpc]/route.ts         # tRPC handler
├── lib/
│   ├── auth.ts                 # NextAuth({ ...authConfig, callbacks: { jwt, session } })
│   ├── auth.config.ts          # Pages, authorized callback, Credentials provider
│   ├── db.ts                   # Prisma singleton
│   ├── redis.ts                # ioredis with mock fallback (eslint-disable for `any`)
│   ├── rate-limit.ts           # @upstash/ratelimit (login 5/60s, register 3/60s, api 100/60s)
│   ├── logger.ts               # Pino
│   ├── queue.ts                # BullMQ (pdf-generation, assessment)
│   ├── storage/r2.ts           # Supabase Storage upload/download
│   ├── email/send.ts           # Nodemailer via Resend SMTP
│   ├── email/verify.ts         # Token generation + URL builder
│   ├── engine/assessment.ts    # 5-step hybrid engine
│   ├── engine/cost.ts          # Financial calculations (NPV, payback, CO2)
│   ├── engine/cache.ts         # Redis cache wrappers (OSM, Solcast, Assessment)
│   ├── osm/client.ts           # Overpass API query
│   ├── osm/parser.ts           # OSM response → building data
│   ├── irradiance/solcast.ts   # Solcast API (needs API key)
│   ├── irradiance/uae-model.ts # Custom UAE irradiance model (primary fallback)
│   ├── irradiance/temperature.ts # Temperature derating
│   └── regulatory/emirates.ts  # UAE emirate configs
├── server/
│   ├── api/trpc.ts             # tRPC init, publicProcedure, protectedProcedure
│   └── api/routers/
│       ├── building.ts         # createFromOSM, discoverArea, list, search, getByCoords
│       ├── assessment.ts       # run (protected), getByBuilding, getHistory
│       ├── proposal.ts         # generate (protected), getById, getByBuilding
│       └── health.ts           # status, deep (db + redis check)
└── components/                 # UI components (shadcn/ui, map, providers)
```

### Config Files
```
├── next.config.ts              # withSentryConfig wrapper, tunnelRoute: "/monitoring", standalone
├── instrumentation.ts          # Server Sentry init + onRequestError
├── instrumentation-client.ts   # Client Sentry init + replay + onRouterTransitionStart
├── sentry.server.config.ts     # Sentry server config
├── sentry.edge.config.ts       # Sentry edge config
├── .npmrc                      # legacy-peer-deps=true (fixes nodemailer peer dep)
├── .env.sentry-build-plugin    # SENTRY_AUTH_TOKEN for source maps
├── prisma/schema.prisma        # 6 models
└── tsconfig.json               # strict, paths: @/* → ./src/*
```

---

## The #1 Problem: Vercel Env Vars Have Newlines

### What's happening
When you run `echo "value" | vercel env add VAR_NAME production`, the `echo` command adds a trailing `\n`. The Vercel CLI reads stdin and stores the value WITH the newline. It warns you but saves anyway.

This means `DATABASE_URL` is stored as:
```
\npostgresql://postgres:JYqsJrbAzM9cext1@db.jlqgkxyjtqxeyzhrdyax.supabase.co:5432/postgres\n
```
Prisma then fails because the URL doesn't start with `postgresql://`.

### How to fix
**Option A (Recommended):** Set env vars through the Vercel Dashboard UI.
1. Go to `https://vercel.com/wasifartsinfo-9617s-projects/solarzero/settings/environment-variables`
2. Manually edit each env var, paste the value, and save
3. Redeploy

**Option B:** Use `vercel env add` but pipe WITHOUT echo:
```bash
# This works — reads from stdin without echo adding newlines
vercel env add DATABASE_URL production
# Then paste the value directly and press Enter, then Ctrl+D
```

**Option C:** Use the Vercel REST API:
```bash
curl -X POST "https://api.vercel.com/v10/projects/solarzero/env" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"DATABASE_URL","value":"postgresql://...","target":["production"]}'
```

### Critical: ALL env vars need verification
After fixing, run `vercel env pull .env.vercel-local --environment=production` and check that NO value starts/ends with whitespace or newlines.

---

## Complete Environment Variables (Correct Values)

Set these in Vercel Dashboard for **Production** environment:

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:JYqsJrbAzM9cext1@db.jlqgkxyjtqxeyzhrdyax.supabase.co:5432/postgres` | Must NOT have newlines |
| `DIRECT_URL` | Same as DATABASE_URL | Prisma direct connection |
| `NEXTAUTH_URL` | `https://solarzero.vercel.app` | Must match production URL exactly |
| `NEXTAUTH_SECRET` | `d0197e5202d364faa1d741c1b763fe4a` | JWT signing secret |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://jlqgkxyjtqxeyzhrdyax.supabase.co` | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_aE23Q7S2KhM2zv95ErjSYA_syiPI2ow` | |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (full JWT) | Server-side, bypasses RLS |
| `UPSTASH_REDIS_URL` | `rediss://default:gQAAAAAAAcB7AAIgcDIzZmExMzBmYmFiYjU0NDA5YTMyZDAyZGE4YzAzODdkOQ@moral-chamois-114811.upstash.io:6379` | TLS required |
| `UPSTASH_REDIS_TOKEN` | `gQAAAAAAAcB7AAIgcDIzZmExMzBmYmFiYjU0NDA5YTMyZDAyZGE4YzAzODdkOQ` | |
| `SMTP_HOST` | `smtp.resend.com` | |
| `SMTP_PORT` | `587` | |
| `SMTP_USER` | `resend` | |
| `SMTP_PASSWORD` | `re_QbVCecjU_LoqaTFoJkx7PpbJdhe6SDtfY` | Same as RESEND_API_KEY |
| `EMAIL_FROM` | `SolarZero <onboarding@resend.dev>` | Free tier, no custom domain |
| `RESEND_API_KEY` | `re_QbVCecjU_LoqaTFoJkx7PpbJdhe6SDtfY` | |
| `NEXT_PUBLIC_APP_NAME` | `SolarZero` | |
| `NEXT_PUBLIC_APP_URL` | `https://solarzero.vercel.app` | |
| `NEXT_PUBLIC_SENTRY_DSN` | `https://a01c96e3255129b995d76eebd8c0191b@o4511507472711680.ingest.de.sentry.io/4511507502661712` | |
| `SENTRY_ORG` | `test-370` | |
| `SENTRY_PROJECT` | `javascript-nextjs` | Must NOT have trailing newline |
| `SENTRY_AUTH_TOKEN` | `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` | |
| `OVERPASS_API_URL` | `https://overpass-api.de/api/interpreter` | Public, no key needed |
| `SOLCAST_API_KEY` | (empty — pending researcher application) | Falls back to UAE_MODEL |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | (empty — not needed, using CARTO tiles) | |

---

## Auth Flow (How It Works)

### Login Flow
1. User fills form → `src/app/(auth)/login/page.tsx`
2. Calls `signIn("credentials", { email, password, redirect: false })`
3. NextAuth POSTs to `/api/auth/callback/credentials`
4. `src/app/api/auth/[...nextauth]/route.ts` handles GET/POST
5. `src/lib/auth.config.ts` → Credentials provider `authorize()`:
   - Looks up user by email via Prisma
   - Compares password with bcrypt
   - Returns user object or null
6. `src/lib/auth.ts` → JWT callbacks: `jwt()` adds `token.id`, `session()` maps to `session.user.id`
7. On success → `window.location.href = "/map"`
8. Middleware (`src/middleware.ts`) checks cookie on every non-auth request

### Registration Flow
1. Form POSTs to `/api/auth/register` (`src/app/api/auth/register/route.ts`)
2. Validates input, rate limits (3/60s per IP via Redis)
3. Creates user with `bcrypt.hash(password, 12)`
4. Generates verification token, sends email via Resend
5. Client auto-signs in after registration

### Middleware
- Simple cookie check (no NextAuth import — keeps bundle < 1MB)
- Excludes: `/api/auth/*`, `/p/*`, `/_next/*`, `/monitoring/*`
- Redirects unauthenticated users to `/login`
- Redirects authenticated users away from auth pages to `/map`

### ⚠️ Known Issue: `InvalidProvider` Error
The logs show: `InvalidProvider: Callback for provider type (credentials) is not supported`

This error occurs when the browser does a **GET** request to `/api/auth/callback/credentials`. The credentials provider only supports **POST**. This specific error in the logs was from a manual browser test trigger, NOT from the actual login form (which correctly uses POST via `signIn()`). **If auth still fails after fixing the DB URL, this error is a red herring — focus on the DB connection.**

---

## Redis Issue

### Problem
`ioredis` uses TCP socket connections. Upstash Redis uses TLS (`rediss://`). In Vercel's serverless environment, TCP connections to external hosts frequently timeout.

### Current Behavior
- `redis.ts` creates an ioredis instance with `lazyConnect: true`
- On timeout, logs `Redis connection error` and falls back to mock
- Mock returns null/OK for all operations
- **Effect:** Rate limiting is disabled (register/login endpoints), assessment caching disabled, BullMQ jobs silently fail

### Options to Fix
1. **Use `@upstash/redis` HTTP client** instead of ioredis — HTTP works reliably in serverless
2. **Keep as-is** — mock fallback means the app works, just without rate limiting and caching
3. **Use Redis for rate limiting only** — switch rate-limit.ts to use `@upstash/ratelimit`'s built-in HTTP client

**Recommended:** Option 1 or 3. `@upstash/ratelimit` already works over HTTP if you create the ratelimit instance differently. The `redis.ts` module is used by `queue.ts` (BullMQ) and `cache.ts`, so BullMQ would also need `@upstash/redis` adapter.

---

## Deployment

### Git
- Repo: `https://github.com/HyperionBurn/solarzero`
- Branch: `master` (clean, only `.gitignore` modified + `add-envs.ps1` untracked)
- Last commit: `5d4a49f fix: strip middleware to cookie-only check, remove edge Sentry to fit 1MB limit`

### Vercel
- Project: `solarzero` (alias: `solarzero-wasifartsinfo-9617s-projects`)
- Team: `wasifartsinfo-9617s-projects`
- Deployed: auto from `master` branch
- Build: `next build` (standalone output)
- Framework: Next.js 16.2.6

### Build Health
- `tsc --noEmit` → **0 errors**
- `vitest run` → **26/26 passing**
- `next build` → **succeeds** (Vercel builds pass)

### Sentry Source Map Upload
- Configured via `withSentryConfig` in `next.config.ts`
- Auth token in `.env.sentry-build-plugin`
- May fail with slug error if `SENTRY_PROJECT` has newline (non-blocking)

---

## What's Working
- ✅ Code compiles (0 TS errors)
- ✅ All 26 tests pass
- ✅ Vercel deployment succeeds
- ✅ Landing page loads at `https://solarzero.vercel.app`
- ✅ Middleware redirects work (unauthenticated → /login)
- ✅ Sentry client + server initialized
- ✅ Pino logging in place
- ✅ Supabase Storage configured for PDFs
- ✅ tRPC protectedProcedure middleware in place
- ✅ All tRPC mutations use `protectedProcedure` (except health.status)

## What's Broken
- ❌ **Auth sign-in** — "Internal server error" (DATABASE_URL newline corruption)
- ❌ **Redis** — ETIMEDOUT (ioredis TCP can't reach Upstash from Vercel serverless)
- ❌ **Rate limiting** — falls back to mock (no Redis)
- ❌ **Assessment caching** — falls back to no-cache (no Redis)
- ❌ **BullMQ PDF queue** — silently fails (no Redis)

## What's Pending
- ⏳ Solcast API key (researcher application submitted, awaiting approval)
- ⏳ Custom domain setup (optional)
- ⏳ Resend custom domain verification (optional, free tier works with onboarding@resend.dev)

---

## Fix Priority Order

1. **Fix DATABASE_URL on Vercel** — Set it through the Vercel Dashboard UI (not CLI). This single fix should unblock auth.
2. **Verify auth works** — Test sign-in at `https://solarzero.vercel.app/login`
3. **Fix Redis** — Either switch to `@upstash/redis` HTTP client or accept mock fallback
4. **Fix SENTRY_PROJECT** — Remove trailing newline (cosmetic, non-blocking)
5. **Verify full flow** — Register → email verification → login → map → select building → assess → generate proposal

---

## User Context
- User is low on OpenCode credits — DO NOT spawn background agents
- User prefers direct, efficient fixes over explanations
- Student project (university email for Solcast researcher tier)
- Free-tier everything (Supabase, Vercel, Resend, Sentry)
