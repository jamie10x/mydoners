FROM oven/bun:1.3-slim AS base
WORKDIR /app

# Install workspace deps at the monorepo root so the workspace: protocol
# resolves packages/shared-contracts correctly.
FROM base AS deps
COPY package.json bun.lock ./
COPY backend/package.json backend/package.json
COPY packages/shared-contracts/package.json packages/shared-contracts/package.json
COPY mini-app/package.json mini-app/package.json
COPY admin-app/package.json admin-app/package.json
COPY courier-bot/package.json courier-bot/package.json
RUN bun install --frozen-lockfile

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY packages/shared-contracts packages/shared-contracts
COPY backend backend

WORKDIR /app/backend
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
