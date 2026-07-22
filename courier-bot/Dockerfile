FROM oven/bun:1.3-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY backend/package.json backend/package.json
COPY packages/shared-contracts/package.json packages/shared-contracts/package.json
COPY mini-app/package.json mini-app/package.json
COPY admin-app/package.json admin-app/package.json
COPY courier-bot/package.json courier-bot/package.json
COPY customer-bot/package.json customer-bot/package.json
RUN bun install --frozen-lockfile

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/courier-bot/node_modules ./courier-bot/node_modules
COPY packages/shared-contracts packages/shared-contracts
COPY courier-bot courier-bot

WORKDIR /app/courier-bot
EXPOSE 3001
CMD ["bun", "run", "src/index.ts"]
