<div align="center">

# MillPro Enterprise

### The Complete Management System for Modern Milling Companies

[![CI/CD](https://github.com/Brianmatovu511/millpro-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/Brianmatovu511/millpro-v2/actions)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://reactjs.org)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-BF8C1A?style=flat-square)](LICENSE)

**Track production. Manage payroll. Record sales. Gain financial clarity.**  
Purpose-built for grain and maize milling companies across East Africa.

</div>

---

## Features

| Module | Description |
|--------|-------------|
| **Production Tracking** | Log batches — maize in, flour out, bran yield, waste per shift |
| **Payroll Management** | Auto-calculate wages by task (per unit / hour / shift), track payments |
| **Inventory Control** | Real-time flour, bran & raw maize stock with low-stock alerts |
| **Financial Reports** | 6-month revenue trends, cost breakdowns, profit & expense analytics |
| **Orders & Sales** | Customer orders from pending to dispatch, itemised sales receipts |
| **Customer CRM** | Named customer records linked to sales and order history |
| **Role-based Access** | Owner / Admin / Supervisor with approval workflows |
| **Approval Queue** | Admin edits & deletes require owner approval before executing |
| **CSV & Print Export** | Export any table — work logs, finance, payroll, sales, inventory |
| **Company Codes** | Private login — companies identified by unique 6-char code |
| **Audit Log** | Full trail of every action taken in the system |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 20 + Express — REST API |
| Database | PostgreSQL 15 via Prisma ORM |
| Frontend | React 18 + Vite — custom components, no UI library |
| Auth | JWT + bcrypt + role-based access control |
| Logging | Winston — structured JSON with correlation IDs |
| Testing | Jest + Supertest — 96% coverage on core modules |
| CI/CD | GitHub Actions — lint → test → Docker build |
| Container | Docker multi-stage build + Docker Compose |
| Security | Helmet, rate limiting, express-validator |

---

## Quick Start — Docker (One Command)

```bash
git clone https://github.com/Brianmatovu511/millpro-v2.git
cd millpro-v2
docker compose up --build
```

Open [http://localhost:5000](http://localhost:5000)

> Docker Desktop must be running. Compose starts PostgreSQL and the app together — no `.env` needed.

---

## Run in GitHub Codespaces

1. Open this repo on GitHub
2. Click **Code → Codespaces → Create codespace on main**
3. Wait ~2 minutes for Docker Compose to build and start
4. Codespaces forwards port `5000` and opens a browser tab automatically
5. The full MillPro app is ready — or visit `/demo.html` for the one-button DB write demo

---

## One-Button Demo (INCO Course Requirement)

A self-contained demo page that requires no login and proves the full stack works end-to-end.

```
http://localhost:5000/demo.html
```

Press **Log Production Activity** — a simulated milling run (maize in, flour out, efficiency %) is written to the PostgreSQL database via the backend, and the last 10 entries appear instantly in the table. This satisfies the INCO "one button → backend → database" verification requirement.

---

## Local Development (Without Docker)

### Prerequisites
- Node.js ≥ 18
- A PostgreSQL database (local or [Neon](https://neon.tech) free tier)

```bash
# 1. Install all dependencies
npm run setup

# 2. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET

# 3. Set up database
npm run db:push     # push schema
npm run db:seed     # load demo data

# 4. Start dev server
npm run dev         # backend :5000 + frontend :5173
```

Open [http://localhost:5173](http://localhost:5173) and sign in with code `JGM001`.

---

## Project Structure

```
millpro-v2/
├── .devcontainer/
│   └── devcontainer.json        # GitHub Codespaces auto-config
├── .github/workflows/
│   └── ci.yml                   # CI/CD: lint → test → Docker build
├── .husky/
│   └── pre-commit               # Lint + tests run before every commit
├── client/
│   ├── public/
│   │   └── demo.html            # One-button demo page (no login)
│   └── src/
│       ├── App.jsx              # Full management dashboard
│       ├── api.js               # Axios API client
│       └── hooks/useAuth.jsx    # Auth context & JWT management
├── server/
│   ├── fhir/                    # FHIR R4 mapper & validator (INCO)
│   ├── middleware/
│   │   ├── auth.js              # JWT authenticate + role authorize
│   │   ├── correlationId.js     # UUID per request for log tracing
│   │   ├── errorHandler.js      # Centralized error handling
│   │   └── validate.js          # Input validation result handler
│   ├── routes/
│   │   ├── demo.js              # Public one-button demo endpoint
│   │   ├── fhir.js              # FHIR R4 Observation API (INCO)
│   │   └── ...                  # All business routes
│   └── utils/
│       └── logger.js            # Winston structured logging
├── tests/                       # Jest test suites (96% line coverage)
├── prisma/schema.prisma         # Full database schema
├── docker-compose.yml           # One-command startup
└── Dockerfile                   # Multi-stage production build
```

---

## User Roles

| Role | Permissions |
|------|-------------|
| **OWNER** | Full access — all CRUD, reports, finance, user management, approvals |
| **ADMIN** | Create records freely; edits & deletes require owner approval |
| **SUPERVISOR** | Read-only — sees operations but cannot modify anything |

### Demo Credentials (after seeding)

| Company Code | User | Password | Role |
|---|---|---|---|
| `JGM001` | Owner | `owner1234` | OWNER |
| `JGM001` | Admin | `admin1234` | ADMIN |
| `JGM001` | Supervisor | `super1234` | SUPERVISOR |

---

## Available Scripts

```bash
npm run dev          # Start dev server (backend + frontend concurrently)
npm run build        # Build React frontend for production
npm start            # Start production server
npm test             # Run Jest test suite with coverage
npm run lint         # ESLint check
npm run lint:fix     # Auto-fix lint issues
npm run db:push      # Push Prisma schema to database
npm run db:seed      # Seed demo data
npm run db:studio    # Open Prisma Studio (database GUI)
npm run setup        # Full install: deps + Prisma generate
```

---

## INCO Course — Development Checklist

This project was built as part of the Innovation and Complexity Management (INCO) course at TH Deggendorf. The table below maps each evaluation criterion to its implementation.

| Criterion | Implementation | Level |
|-----------|---------------|-------|
| Dev Environment | Git + husky pre-commit hooks, GitHub Actions CI/CD, Docker multi-stage | Excellent |
| Testing | Jest, 20 tests, 96% line coverage, automated in CI with artifact upload | Excellent |
| Configuration | Per-environment `.env` templates, no hardcoded secrets, env-based switching | Advanced |
| Logging | Winston structured JSON, correlation IDs, severity levels, request tracing | Advanced |
| Deployment | Docker Compose, multi-stage Dockerfile, GitHub Codespaces devcontainer | Excellent |
| Input Validation | express-validator on all endpoints, FHIR schema validation | Advanced |
| Error Handling | Centralized handler, Prisma/JWT error categorization, AppError class | Advanced |
| Auth & Encryption | JWT, bcrypt, RBAC, helmet security headers, rate limiting | Advanced |
| Fault Tolerance | Operational vs system error separation, Express error boundary | Basic |
| FHIR Compliance | R4 Observation, CapabilityStatement, LOINC codes, bundle output | Advanced |

---

## Optimization Dimensions

The system is designed and evaluated against nine quality dimensions used throughout the INCO course.

| Dimension | Design Decision | Where |
|-----------|----------------|-------|
| **Performance** | Multi-stage Docker build keeps the production image lean; `.dockerignore` excludes tests, docs, and dev tooling from the build context; DB indexes on `companyId`, `date`, and `createdAt` on the highest-traffic tables | `Dockerfile`, `.dockerignore`, `prisma/schema.prisma` |
| **Development Time** | Husky pre-commit hooks catch errors before push; GitHub Actions CI catches regressions automatically; Vite proxy lets frontend call the backend in dev without config changes; one-command Docker Compose start | `.husky/`, `.github/workflows/ci.yml`, `client/vite.config.js`, `docker-compose.yml` |
| **Cost** | `.dockerignore` reduces Docker build context by ~60% (excludes `node_modules`, `coverage`, docs); multi-stage build discards the builder layer; Prisma graceful disconnect avoids leaked idle connections | `.dockerignore`, `Dockerfile`, `server/db.js` |
| **Accuracy** | express-validator enforces type, format, and range on every API input; FHIR R4 schema validation rejects malformed Observation resources before they reach the DB; Prisma's type-safe queries eliminate SQL typos | `server/middleware/validate.js`, `server/fhir/validator.js` |
| **Usability** | "Try Live Demo" button on the landing page links directly to `/demo.html` — one click, no login; demo page shows real DB results immediately; role-based UI hides controls the current user cannot use | `client/src/App.jsx`, `client/public/demo.html` |
| **Security** | Helmet sets 12 HTTP security headers; bcrypt (cost 10) hashes all passwords; JWT with short expiry; express-rate-limit blocks brute-force on auth endpoints; `.dockerignore` prevents `.env` files entering the image | `server/index.js`, `server/middleware/auth.js`, `.dockerignore` |
| **Scalability** | DB indexes on all multi-tenant filter columns (`companyId`); Prisma connection pool managed by the driver; Docker Compose `healthcheck` prevents the app starting before Postgres is ready; stateless JWT means any number of app replicas can run behind a load balancer | `prisma/schema.prisma`, `server/db.js`, `docker-compose.yml` |
| **Extensibility / Maintainability** | One file per resource in `server/routes/`; FHIR mapper and validator are isolated modules with no business-logic coupling; centralized `AppError` class means new error types need one line; Jest coverage gate (80%) enforced in CI prevents coverage regression | `server/routes/`, `server/fhir/`, `server/middleware/errorHandler.js` |
| **Traceability** | Every HTTP request gets a UUID correlation ID (returned as `x-correlation-id` header); Winston logs method, path, status, latency, and correlationId on every response; audit log table records every user action with userId, entity, and IP; FHIR Observation IDs link sensor records back to the originating request | `server/middleware/correlationId.js`, `server/utils/logger.js`, `prisma/schema.prisma` (AuditLog) |

---

## How Our Team Collaborates with AI Agents

### Team Composition

| Member | Role | Responsibilities |
|--------|------|-----------------|
| **Brian** | Backend Engineer | API design, database schema, server infrastructure, DevOps, CI/CD pipeline, Docker, FHIR integration, security middleware |
| **Rebecca** | Frontend Engineer | React components, UI/UX design, demo page, Vite build pipeline, frontend data visualisation |
| **Aamna** | Business Analyst | Requirements analysis, use-case definition, FHIR standards research, mapping professor rubric to acceptance criteria, stakeholder documentation |
| **Pious** | Product Manager | Project roadmap, feature prioritisation, team coordination, presentation preparation, final sign-off on each milestone |

### Human vs AI Responsibilities

**What humans own:**
- **Brian** defines the backend architecture and reviews every server-side pull request before it merges. He decides what the AI scaffolds are allowed to generate and where the boundaries are.
- **Rebecca** owns all frontend merges. She uses AI to accelerate component generation but manually reviews every rendered result for design consistency and correctness.
- **Aamna** translates the professor's rubric and FHIR standards into concrete acceptance criteria. She ensures the team builds the right thing — not just something that runs.
- **Pious** tracks progress against the INCO evaluation table above, coordinates across the IT and business sides, and runs the final check before any feature is marked done.

**What AI agents do:**
- Generate boilerplate code (route scaffolding, test stubs, Docker configs, middleware) so Brian and Rebecca spend time on logic, not repetition.
- Perform a first-pass code review — flagging security issues (hardcoded secrets, missing validation, SQL injection patterns) and ESLint violations before a human reviews.
- Write and run test suites autonomously, then report coverage gaps back to the engineer for prioritisation.
- Produce structured documentation drafts (README sections, API tables, FHIR capability statements) that Aamna edits for accuracy and Pious approves for presentation quality.

### Running AI Agents Asynchronously (Unattended)

1. **On every push**, GitHub Actions runs lint and tests automatically — no human needs to be at a keyboard. The CI badge in this README is the team's live status board.
2. **Pre-commit hooks** (husky) run lint checks locally before code ever reaches GitHub, catching issues at the earliest possible point.
3. **Brian uses Claude Code CLI** in the terminal to scaffold new backend routes: he describes the endpoint in plain English, the agent writes the route + middleware + test file, then Brian reviews the diff before committing.
4. **Rebecca uses Claude Code** to generate React components from a design brief, then refines the output for visual consistency with the existing theme.
5. **Aamna runs document-generation prompts** against the professor's rubric to produce a requirement traceability matrix — identifying which evaluation criteria are met and which are still gaps.

### Keeping the Whole Team Moving in the Right Direction

- **The professor's rubric is the single source of truth.** Aamna maintains the "Development Checklist" table above, mapping every rubric point to a specific file or test. No feature is "done" until that row is green.
- **GitHub is the coordination layer.** Every change goes through a pull request. Brian, Rebecca, Aamna, and Pious all receive PR notifications. If the CI badge is red, the whole team stops and fixes it before adding anything new.
- **AI agents are given scope, not autonomy.** Agents scaffold and suggest; humans approve and merge. If an agent generates code that technically runs but violates the FHIR schema or the professor's architecture requirements, the human reviewer catches it at PR time.
- **Weekly 15-minute sync:** Pious chairs a standup where each person reports what the CI pipeline and the checklist table show — not what they think is done. This grounds the meeting in observable facts rather than assumptions.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built by Team Mavericks — TH Deggendorf

</div>
