# JutJut

**Verified skills, part-time jobs, perks, and university pathways — built for Australian students.**

JutJut is a full-stack web application that connects high-school students with part-time employment opportunities, verifies their skills through a digital "Kit", and provides employers with a trusted talent pipeline. The platform is free for students, always.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Tailwind CSS 4, shadcn/ui, Wouter |
| Backend | Node.js 22, Express 4, tRPC 11 |
| Database | MySQL 8 / TiDB (Drizzle ORM) |
| Auth | Manus OAuth (JWT session cookies) |
| Storage | S3-compatible object storage |
| Payments | PinPayments |
| Build | Vite 7, esbuild, TypeScript 5.9 |
| Testing | Vitest |
| CI/CD | GitHub Actions → AWS ECR + ECS Fargate |

---

## Quick Start

```bash
# Clone and install
git clone https://github.com/BigLittleBusiness/jutjut.git
cd jutjut
pnpm install

# Configure environment
cp .env.example .env
# Edit .env — at minimum: DATABASE_URL and JWT_SECRET

# Apply database schema
pnpm db:push

# Start the development server
pnpm dev
```

The app will be available at `http://localhost:3000`. See [CONTRIBUTING.md](./CONTRIBUTING.md) for a full local setup guide.

---

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server with hot-reload |
| `pnpm build` | Build frontend (Vite) + server bundle (esbuild) into `dist/` |
| `pnpm start` | Run the production build |
| `pnpm test` | Run all Vitest unit tests |
| `pnpm check` | TypeScript type-check (no emit) |
| `pnpm format` | Format all files with Prettier |
| `pnpm db:push` | Generate and apply database migrations |

---

## Project Structure

```
client/src/
  pages/          Page-level route components
  components/     Reusable UI (shadcn/ui + custom)
  hooks/          Custom React hooks
  lib/trpc.ts     tRPC client binding
server/
  routers/        Feature tRPC routers
  db.ts           Database query helpers
  storage.ts      S3 file storage helpers
drizzle/
  schema.ts       Database schema (source of truth)
infrastructure/
  Dockerfile      Multi-stage production image
  nginx.conf      Nginx reverse-proxy config
  DEPLOY.md       AWS deployment runbook
  ecs-task-definition.json  ECS Fargate task template
.github/workflows/
  ci.yml          Type-check + tests on every PR
  deploy.yml      Build → ECR → ECS on push to main
```

---

## Deployment

The application is containerised and deploys to AWS ECS Fargate via GitHub Actions. See [infrastructure/DEPLOY.md](./infrastructure/DEPLOY.md) for the complete step-by-step runbook covering:

- ECR repository setup
- AWS Secrets Manager configuration
- ECS cluster and service creation
- ALB + ACM TLS setup
- GitHub Actions secret configuration
- Database migration procedure
- Rollback instructions

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for code conventions, the development workflow, testing requirements, and the pull request process.

---

## Licence

MIT
