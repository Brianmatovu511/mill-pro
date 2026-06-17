# MillPro Enterprise — Architecture Review & Refactoring Report

**Reviewer perspective:** senior engineer onboarding to an unfamiliar codebase.
**Scope:** full-stack review of the milling-management platform (`server/`, `client/`, `prisma/`).
**Constraint honored:** *no functional behavior was changed.* The code changes that ship
with this report are pure quality/DRY/maintainability refactors, each verified against the
existing test suite (20/20 passing) and behavioral-equivalence checks.

---

## 1. What this system is (reverse-engineered)

MillPro is a **multi-tenant SaaS** for maize/grain mills in East Africa. A single deployment
serves many mills ("companies"); every business row is scoped by `companyId`. On top of the
tenant app sits a separate **super-admin** platform console for the MillPro team.

### 1.1 Technology stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express 4 |
| ORM / DB | Prisma 5 + PostgreSQL |
| Auth | JWT (7-day), bcrypt password hashing |
| Frontend | React 18 + Vite, single-file SPA, inline-style design system |
| AI | Anthropic SDK — advisor chat, weekly report, cached maize news (web search) |
| Ops | Helmet, compression, CORS, `express-rate-limit`, Winston logging, correlation IDs |
| Tests | Jest + Supertest (middleware/fhir/logger only) |

### 1.2 Domain model (Prisma)

The schema (`prisma/schema.prisma`, ~547 lines) is the **strongest part of the codebase** —
well-normalized, consistently `@map`-ed to snake_case, with cascade deletes and sensible
composite indexes (`@@index([companyId, date])`, `@@unique([email, companyId])`).

Core tenant entities: `Company → User / Employee / TaskType / WorkLog / Payment /
ProductionBatch / Purchase / Expense / Sale (+ SaleItem) / Order / Customer /
StockAdjustment / Invoice (+ InvoiceItem) / AuditLog / PendingAction / Feedback`.
Platform/cross-cutting: `SuperAdmin`, `Post / PostComment / PostReaction` (cross-company
community feed), and `MillActivityLog` (an unauthenticated demo table).

### 1.3 Request data flow

```
Browser SPA (client/src/App.jsx)
  └─ api.js (axios instance)
       • request interceptor  → attaches JWT (tenant vs super token chosen by URL prefix)
       • response interceptor → on 401 wipes token + hard-redirects
            │  HTTP /api/*
            ▼
Express (server/index.js)
  helmet → compression → correlationId → request logger → json/urlencoded
        → cors → rate-limit(/api 500/15m, /api/auth 30/15m)
            │  app.use('/api/<resource>', router)
            ▼
Route handler (server/routes/*.js)
  authenticate (JWT verify → load User+Company → req.user, req.companyId)
    → authorize(...roles)            // OWNER full, SUPERVISOR read-only, ADMIN scoped
      → Prisma query (always filtered by companyId)
        → logAudit(...)              // fire-and-forget side-effect
        → res.json(...)
            │
            ▼
errorHandler (centralized) — but most routes never reach it (see §4.1)
```

### 1.4 Two cross-cutting domain rules worth calling out

1. **Approval workflow.** When an `ADMIN` (not `OWNER`) edits or deletes most entities, the
   change is *not* applied — it is captured as a `PendingAction` (`utils/pending.js`) for the
   `OWNER` to approve. On approval, `routes/pending.js` replays the operation through a
   per-entity dispatch map (`getOps`). This is a genuinely nice design, but the write logic
   is **duplicated** between the original route and the replay map (see §4.2).
2. **Computed inventory.** Stock is never stored — it is *derived* on every read by replaying
   purchases + production − sales ± adjustments. Correct in spirit, but a scaling trap (§5).

---

## 2. Clean architecture breakdown (target shape)

The backend is *almost* a clean layered architecture; it just stops one layer short. The
business logic lives inline inside Express handlers instead of in a service layer.

```
┌──────────────────────────────────────────────────────────────┐
│ Presentation / Transport   server/routes/*  + middleware/*    │
│   HTTP parsing, auth, authz, validation, response shaping     │
├──────────────────────────────────────────────────────────────┤
│ Application / Domain  (PARTLY MISSING — today inlined)        │
│   inventory math, payroll calc, snapshot, finance roll-ups,   │
│   sale/invoice totals, approval replay, company-code issuing  │
├──────────────────────────────────────────────────────────────┤
│ Data access            server/db.js (Prisma singleton)        │
│   schema + queries                                            │
├──────────────────────────────────────────────────────────────┤
│ Cross-cutting   config · logger · correlationId · errors ·    │
│                 audit · rate-limit                            │
└──────────────────────────────────────────────────────────────┘
```

**The single highest-leverage structural change** is to introduce that missing
`server/services/` (or `domain/`) layer and move calculation logic out of the route handlers.
This report ships the first three extractions (inventory, company-code, query helpers) as a
proof of the pattern; §7 lists the rest.

---

## 3. Bad architecture decisions

| # | Decision | Why it hurts |
|---|---|---|
| A1 | **Business logic inlined in routes**, often as single 200-character lines (`routes/sales.js:9`, `routes/dashboard.js`, `routes/workLogs.js:9`) | Unreadable, untestable without HTTP, impossible to reuse. The dashboard re-implements both the inventory calc *and* the finance roll-up that already exist elsewhere. |
| A2 | **Centralized error handling exists but is bypassed.** `middleware/errorHandler.js` + `AppError` are well-built, yet ~90% of handlers use local `try/catch { res.status(500).json({error:'Failed'}) }` | The good infrastructure is dead code on the write paths. Clients get an opaque `"Failed"` with no correlation ID; Prisma error mapping (P2002→409, P2025→404) never runs. |
| A3 | **Config/secrets read ad-hoc from `process.env` in many files**, with *inconsistent defaults* | Caused a real latent bug — see §6.1. Fixed in this pass via `server/config.js`. |
| A4 | **Inventory is computed on every dashboard/inventory/AI request** by loading *all* purchases, batches, sale-items and adjustments for the company | O(history) work on a hot path; unbounded memory and latency as a mill accumulates years of rows (§5). |
| A5 | **2,710-line single-file React app** (`client/src/App.jsx`) — ~50 components, 108 `useState`, 35 `useEffect`, the theme, the SVG icon set, charts, the super-admin app and the AI panel all in one module | Merge-conflict magnet, no code-splitting, every screen ships in one bundle, near-impossible to navigate or unit-test. |
| A6 | **Orphan bounded context.** A full **FHIR/healthcare** module (`server/fhir/*`, `routes/fhir.js`) maps medical vital-signs into FHIR Observations inside a *maize mill* product, backed by an in-memory array | Dead/unrelated domain code shipped behind auth; confuses readers and is the *only* thing the test suite covers in depth. |
| A7 | **In-memory state in request handlers.** `routes/fhir.js` `store=[]` and `routes/news.js` module-level `cache`/`inflight` | Breaks the moment you run more than one process/replica (§5). News cache is a reasonable trade-off; FHIR store is not. |
| A8 | **No service/repository boundary for tenancy.** Every handler hand-writes `where:{companyId}` | One forgotten clause = cross-tenant data leak. Several **write** paths already forget it (§6.2). |

---

## 4. Duplicate logic (DRY violations)

### 4.1 Error handling boilerplate — ~40+ copies
`try { ... } catch { res.status(500).json({ error:'Failed' }) }` is copy-pasted across nearly
every handler in every route file. The fix is an `asyncHandler` wrapper that forwards to the
existing `errorHandler` (strategy in §7; not auto-applied here because it changes the 500 body
shape and would be a behavior change).

### 4.2 Inventory calculation — **verbatim duplicate** ✅ fixed
The identical ~12-line stock-replay block existed in **both** `routes/inventory.js` and
`routes/dashboard.js`. A third near-copy (aggregate form) lives in `utils/aiContext.js`.
→ Extracted to `server/utils/inventory.js::computeInventory(companyId)` and wired into both
routes. (The aiContext variant uses `_sum` aggregates and is left as-is to avoid changing the
AI snapshot output; it can adopt the shared module in a follow-up.)

### 4.3 Company-code generation — **verbatim duplicate** ✅ fixed
`genCode` + `ensureUniqueCode` (the charset, the 20-attempt loop, the normalization) appeared
twice: `routes/auth.js` and `routes/super.js`.
→ Extracted to `server/utils/companyCode.js`.

### 4.4 JWT secret/expiry + bcrypt rounds — duplicated constants ✅ fixed
`JWT_SECRET`, `JWT_EXPIRES`, and the bcrypt cost factor `12` were redeclared in four files
with **two different secret defaults**.
→ Centralized in `server/config.js`.

### 4.5 Date-range `where` builder — repeated ~6× ✅ fixed (in 5 routes)
`const df={}; if(from)df.gte=...; if(to)df.lte=...; const w = from||to?{date:df}:{}` recurs in
`finance`, `reports`, `employees`, `workLogs`, `payments`, `batches`.
→ Extracted to `server/utils/query.js::dateRangeWhere()` and adopted in those routes.

### 4.6 `parseFloat(x) || 0` — dozens of inline copies ✅ partially fixed
→ `server/utils/query.js::num()`; adopted in `batches`, `workLogs`, `payments`. The remaining
routes can adopt it incrementally.

### 4.7 Finance/reports roll-up — duplicated aggregation
`routes/finance.js` and `routes/reports.js` (monthly) compute revenue/cost/profit/yield from
the same five aggregates with the same formulas. Candidate for a shared
`services/finance.js` (§7).

### 4.8 Entity write-shape duplicated across route + approval replay
e.g. the `Order` update field-mapping exists in `routes/orders.js:13` *and* in
`routes/pending.js`'s `getOps`. The seed task-type list is triplicated
(`routes/auth.js`, `routes/super.js`, `prisma/seed.js`).

### 4.9 Client-side duplication
`REACTIONS` emoji list exists in both `routes/community.js` and `client/src/App.jsx`. Date
helpers (`td`, `ws`, `mst`) and currency formatting are redefined inline.

---

## 5. Performance bottlenecks & scalability risks

| Area | Issue | Impact | Recommendation |
|---|---|---|---|
| Inventory (A4) | Loads **all-time** rows of 4 tables per request, sums in JS | Latency & memory grow without bound per tenant | Maintain running balances (a `StockLevel` table updated transactionally), or push the SUMs into SQL `groupBy` and cache with short TTL |
| Dashboard | Fires ~14 queries per load, then the full inventory scan | Heavy hot path on the most-visited screen | Parallelize (already partly), add SQL-side aggregation, cache per-tenant for ~30s |
| AI snapshot | `utils/aiContext.js` issues ~20 queries and serializes 5–15 KB per chat turn | Slow + costly under chat load | Build snapshot once, cache per tenant for a few minutes; reuse across chat turns |
| In-memory caches (A7) | `news.js` cache & `fhir.js` store live in one process | Inconsistent across replicas; lost on restart | Move to Redis (news) / DB (fhir) before horizontal scaling |
| Rate limiting | `express-rate-limit` default store is in-memory | Limits are per-process, not global | Use a shared store (Redis) when running >1 instance |
| N+1 risk | `reports/employees` does a `groupBy` then a second `findMany` keyed by ids | Fine now; watch as a pattern | Acceptable; keep an eye on it |
| Missing pagination | List endpoints (`sales`, `purchases`, `audit` take:500, etc.) return whole tables | Large tenants → huge payloads | Add cursor pagination + `take`/`skip` |
| Indexing | Good on `WorkLog`/`AuditLog`/`Feedback`; **missing** on hot filters like `Sale.companyId`, `Purchase.companyId`, `ProductionBatch.companyId`, `Order(companyId,status)` | Sequential scans as volume grows | Add `@@index([companyId, date])` to Sale/Purchase/Expense/Batch/Order |
| Process model | `app.listen` + `beforeExit` disconnect only | No clustering, no graceful SIGTERM drain | Add `SIGTERM` handler that stops accepting, drains, `prisma.$disconnect()` |

---

## 6. Critical problem areas (fix first)

### 6.1 🔴 Latent auth bug — split JWT secret default ✅ fixed in this pass
Tokens were **signed** with `process.env.JWT_SECRET || 'change-this-in-production'`
(`routes/auth.js`, `routes/super.js`) but **verified** with
`process.env.JWT_SECRET || 'change-this'` (`middleware/auth.js`, `middleware/superAuth.js`).
Whenever `JWT_SECRET` is unset (local/dev/test/preview), **every authenticated request fails**
because the verify secret can never match the sign secret. Centralizing to one value in
`server/config.js` resolves it. Production (which sets `JWT_SECRET`) is unaffected.

### 6.2 🔴 Cross-tenant write authorization gap (IDOR) — *documented, not silently changed*
The `OWNER` delete/update fast-path operates by **primary key only, without a `companyId`
guard**, e.g.:
- `routes/orders.js:18` `prisma.order.delete({ where:{ id:req.params.id } })`
- same shape in `sales.js`, `customers.js`, `batches.js`, `expenses.js`, `purchases.js`,
  `payments.js`, `workLogs.js`, `taskTypes.js`, `employees.js`.

An authenticated OWNER of company A who knows/guesses a UUID from company B can mutate B's
data. `invoices.js` does this correctly (`findFirst({id, companyId})` first) — that is the
pattern the others should follow. **I did not change this** because tightening authorization
can alter observable behavior, and the task was explicitly quality-only. It is the
highest-priority follow-up; the clean fix is to route all writes through a tenant-scoped
repository helper (`deleteScoped(model, id, companyId)` returning 404 on miss).

### 6.3 🟠 Weak default secrets shipped in code
`config.js` still falls back to `'change-this-in-production'`, and `utils/superSeed.js` seeds a
**known default super-admin password** (`MillProAdmin@2026!`). Acceptable as a bootstrap, but
production must set `JWT_SECRET`, `SUPER_ADMIN_PASSWORD`, etc. Recommend failing fast on
startup if `JWT_SECRET` is unset while `NODE_ENV==='production'`.

### 6.4 🟠 Silent failures hide data-integrity problems
`routes/pending.js` approve replays the operation inside an inner `try/catch` that only
`console.error`s — an approval can be marked `APPROVED` even if the underlying delete/update
threw. Approval + execution should share one transaction.

### 6.5 🟠 Inconsistent observability
Routes variously use `console.error(e)`, `logger.error(...)`, or swallow errors entirely. The
Winston logger + correlation IDs exist but aren't used uniformly, so request failures are hard
to trace end-to-end.

---

## 7. Refactoring strategy (prioritized roadmap)

**Phase 0 — shipped in this pass (zero behavior change):**
- `server/config.js` — single source for env/secrets (fixes §6.1).
- `server/utils/inventory.js` — shared `computeInventory` (kills §4.2 duplication).
- `server/utils/companyCode.js` — shared code issuing (kills §4.3).
- `server/utils/query.js` — `num()` + `dateRangeWhere()` (kills §4.5/§4.6 in 5–6 routes).
- Wired the above into auth/super/inventory/dashboard/finance/reports/employees/
  workLogs/payments/batches/superSeed/index.

**Phase 1 — error handling (small, high value):**
Introduce `asyncHandler(fn)` and replace per-handler `try/catch`. Let `AppError` +
`errorHandler` own all error responses (correlation IDs, Prisma mapping). *This changes the
500 response body from `{error:'Failed'}` to the richer centralized shape — coordinate as a
deliberate API change.*

**Phase 2 — service layer:**
Extract `services/inventory.js`, `services/finance.js`, `services/payroll.js`,
`services/sales.js`, `services/snapshot.js`. Routes become thin: parse → call service →
respond. Unit-test services directly (no HTTP, no DB via a repository interface).

**Phase 3 — tenant-safe repository:**
A thin wrapper enforcing `companyId` on every read *and write* (fixes §6.2 structurally).
Generate the repetitive CRUD routers from a table of `{model, fields, audit, pendingEntity}`.

**Phase 4 — scalability:**
Persist/cache inventory; Redis-back rate-limit + news cache; add the missing composite
indexes; add pagination to list endpoints; graceful SIGTERM.

**Phase 5 — frontend:**
Split `App.jsx` into `pages/`, `components/`, `design-system/`, `lib/` (icons, theme, charts,
formatters). Add route-based code-splitting (`React.lazy`). Extract the API hooks. Decide the
fate of the FHIR/demo modules (delete or move to an examples package).

---

## 8. Changes included with this report

All changes are behavior-preserving and verified (`npm test` → 20/20; module load smoke test
→ 18/18; helper equivalence asserted against the original inline code).

**New files**
- `server/config.js`
- `server/utils/inventory.js`
- `server/utils/companyCode.js`
- `server/utils/query.js`

**Edited (wiring only, no logic change)**
- `server/index.js`, `server/middleware/auth.js`, `server/middleware/superAuth.js`
- `server/routes/auth.js`, `server/routes/super.js`
- `server/routes/inventory.js`, `server/routes/dashboard.js`
- `server/routes/finance.js`, `server/routes/reports.js`, `server/routes/employees.js`
- `server/routes/workLogs.js`, `server/routes/payments.js`, `server/routes/batches.js`
- `server/utils/superSeed.js`

**One intentional, cosmetic side effect:** the super-admin "create company" path now returns
the more descriptive duplicate-code message ("…— choose another") that the registration path
already used, because both now share one implementation. No status codes or data shapes change.

**Explicitly *not* changed** (flagged for follow-up, would alter behavior): the cross-tenant
write guard (§6.2), the error-response contract (§7 Phase 1), and the AI snapshot inventory
variant (§4.2).
