# --- Stage 1: Build & Prune ---
FROM node:22-alpine AS builder

WORKDIR /app

# Enable corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace package manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/domain/package.json ./packages/domain/
COPY packages/policy/package.json ./packages/policy/
COPY packages/db/package.json ./packages/db/
COPY packages/test-fixtures/package.json ./packages/test-fixtures/
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY apps/web/package.json ./apps/web/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source trees
COPY packages/ ./packages/
COPY contracts/ ./contracts/
COPY apps/api/ ./apps/api/

# Build shared packages and apps/api
RUN pnpm --filter @e3-eos/api... build

# --- Stage 2: Production Runner ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Create non-root user
USER node

COPY --chown=node:node --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/packages ./packages
COPY --chown=node:node --from=builder /app/contracts ./contracts
COPY --chown=node:node --from=builder /app/apps/api ./apps/api

EXPOSE 4000

CMD ["node", "apps/api/dist/main.js"]
