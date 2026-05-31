# Contributing to JutJut

Thank you for taking the time to contribute. This document covers everything a new developer needs to get the project running locally, understand the codebase conventions, and submit changes confidently.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Setup](#local-setup)
3. [Project Structure](#project-structure)
4. [Development Workflow](#development-workflow)
5. [Code Conventions](#code-conventions)
6. [Testing](#testing)
7. [Database Changes](#database-changes)
8. [Submitting a Pull Request](#submitting-a-pull-request)
9. [Environment Variables](#environment-variables)

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 22 LTS | [nodejs.org](https://nodejs.org) |
| pnpm | 10.4.1 | `npm install -g pnpm@10.4.1` |
| MySQL | 8.0+ | [mysql.com](https://dev.mysql.com/downloads/) or Docker |
| Git | any | [git-scm.com](https://git-scm.com) |

---

## Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/BigLittleBusiness/jutjut.git
cd jutjut

# 2. Install dependencies
pnpm install

# 3. Copy the environment template and fill in your values
cp .env.example .env
# Edit .env — at minimum you need DATABASE_URL and JWT_SECRET

# 4. Push the database schema
pnpm db:push

# 5. Start the development server (hot-reload enabled)
pnpm dev
```

The app will be available at `http://localhost:3000`.

Alternatively, use Docker Compose to spin up both the database and the app in one command:

```bash
docker compose up
```

---

## Project Structure

```
.
├── client/                  React 19 frontend (Vite + Tailwind 4)
│   └── src/
│       ├── _core/           Auth hooks (useAuth) — do not edit
│       ├── components/      Reusable UI components and shadcn/ui primitives
│       ├── contexts/        React context providers
│       ├── hooks/           Custom React hooks
│       ├── lib/             tRPC client binding and utilities
│       └── pages/           Page-level route components
├── drizzle/                 Database schema, migrations, and relations
├── infrastructure/          AWS deployment files (Dockerfile, nginx, ECS)
├── server/
│   ├── _core/               Framework plumbing — OAuth, context, env (do not edit)
│   ├── cron/                Scheduled background jobs
│   ├── routers/             Feature-specific tRPC routers
│   ├── webhooks/            Inbound webhook handlers
│   ├── db.ts                Database query helpers
│   ├── routers.ts           Root tRPC router (imports feature routers)
│   └── storage.ts           S3 file storage helpers
├── shared/                  Types and constants shared by client and server
├── .github/workflows/       GitHub Actions CI and deploy pipelines
├── .env.example             Environment variable reference
├── Dockerfile               Multi-stage production Docker image
├── docker-compose.yml       Local development environment
└── vitest.config.ts         Test runner configuration
```

The `server/_core/` directory contains framework-level plumbing (OAuth, tRPC context, environment parsing). **Do not edit files in `_core/`** unless you are intentionally extending the infrastructure.

---

## Development Workflow

The project follows a **schema-first, procedure-first** approach:

1. **Schema** — Add or modify tables in `drizzle/schema.ts`, then run `pnpm db:push` to apply the migration.
2. **DB helpers** — Add query functions in `server/db.ts`. Keep them pure (no business logic).
3. **tRPC procedures** — Add or extend procedures in `server/routers/<feature>.ts`. Use `publicProcedure` for unauthenticated endpoints and `protectedProcedure` for authenticated ones.
4. **Frontend** — Build the UI in `client/src/pages/`. Call procedures with `trpc.<feature>.<procedure>.useQuery/useMutation`.
5. **Tests** — Write Vitest tests in `server/<feature>.test.ts` before marking the feature as done.

---

## Code Conventions

**TypeScript** — strict mode is enabled. All new code must be fully typed; avoid `any`.

**Naming** — use camelCase for variables and functions, PascalCase for components and types, kebab-case for file names in `pages/` and `components/`.

**Formatting** — Prettier is configured at `.prettierrc`. Run `pnpm format` before committing. The CI pipeline will fail if formatting is inconsistent.

**Imports** — use the `@/` alias for `client/src/` and `@shared/` for `shared/`. Never use relative paths that traverse more than one directory level.

**tRPC** — never introduce `axios` or raw `fetch` wrappers for backend calls. All client–server communication goes through tRPC procedures.

**Styling** — use Tailwind utility classes and shadcn/ui components. Avoid inline styles except where dynamic values are required (e.g., chart colours). Do not add new CSS frameworks.

---

## Testing

Tests live alongside the server code in `server/*.test.ts`. Run the full suite with:

```bash
pnpm test
```

Every new feature or bug fix must be accompanied by at least one test. The CI pipeline runs `pnpm test` on every pull request and will block merging if any test fails.

Mocking pattern: import the DB helper module, then use `vi.mock(...)` to replace it. See `server/waitlist.test.ts` for a complete example.

---

## Database Changes

JutJut uses [Drizzle ORM](https://orm.drizzle.team) with a MySQL dialect.

1. Edit `drizzle/schema.ts` to add or modify tables.
2. Run `pnpm db:push` — this generates a migration file and applies it to the connected database.
3. Commit both the schema change and the generated migration file.

**Never edit migration files manually.** Always regenerate them via `pnpm db:push`.

---

## Submitting a Pull Request

1. Create a feature branch from `main`: `git checkout -b feat/my-feature`.
2. Make your changes, following the conventions above.
3. Run `pnpm check` (TypeScript) and `pnpm test` (Vitest) locally — both must pass.
4. Run `pnpm format` to apply Prettier formatting.
5. Open a pull request against `main` with a clear title and description of what changed and why.
6. The CI pipeline will run automatically. Address any failures before requesting review.

---

## Environment Variables

All required variables are documented in `.env.example`. Copy it to `.env` and fill in the values for your environment. The `.env` file is listed in `.gitignore` and must never be committed.

For production deployments on AWS, secrets are stored in AWS Secrets Manager and injected into the ECS task at runtime. See `infrastructure/DEPLOY.md` for the full deployment runbook.
