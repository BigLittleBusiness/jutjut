# ─────────────────────────────────────────────────────────────────────────────
# JutJut — Multi-stage Dockerfile
#
# Stage 1 (deps):   Install all dependencies (including devDeps needed for build)
# Stage 2 (build):  Compile the Vite frontend + esbuild server bundle
# Stage 3 (runner): Minimal production image — only runtime deps + dist/
#
# Build:  docker build -t jutjut:latest .
# Run:    docker run -p 3000:3000 --env-file .env jutjut:latest
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Copy lockfile and manifests first for layer-cache efficiency
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install all deps (dev + prod) needed for the build stage
RUN pnpm install --frozen-lockfile

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Bring in installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/patches ./patches

# Copy full source
COPY . .

# Build frontend (Vite → dist/public) and server bundle (esbuild → dist/index.js)
RUN pnpm run build

# ── Stage 3: production runner ────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Only install production dependencies in the final image
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output from build stage
COPY --from=build /app/dist ./dist

# Copy drizzle schema/migrations so db:push can run inside the container if needed
COPY drizzle/ ./drizzle/
COPY drizzle.config.ts ./

# Expose the application port (override with PORT env var at runtime)
EXPOSE 3000

# Health check — AWS ECS / ALB will use this
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3000}/api/trpc/system.health || exit 1

CMD ["node", "dist/index.js"]
