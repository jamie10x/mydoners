# MyDoners — Automated Order & Delivery Management System

Digital ordering and dispatch platform for MyDoners fast food (Uzbekistan), replacing phone/Telegram-DM ordering with a Telegram Mini App, a native Kotlin Android Kitchen Display System (KDS), a Telegram courier dispatch bot, and a Bun/Express/PostgreSQL backend.

See [`docs/`](./docs) for the full system contracts and the execution roadmap this repo follows.

## Subprojects

| Path | Stack | Purpose |
|---|---|---|
| [`backend/`](./backend) | Bun, Express, TypeScript, PostgreSQL, Redis, Socket.io | Central API, WebSocket event bus, anti-fraud engine |
| [`mini-app/`](./mini-app) | React, TypeScript, Vite, Tailwind, Zustand, `@telegram-apps/sdk` | Customer ordering Telegram Mini App |
| [`android-kds/`](./android-kds) | Kotlin, Jetpack Compose, Coroutines, OkHttp/Ktor | Kitchen Display System (wall-mounted tablet) |
| [`courier-bot/`](./courier-bot) | Bun, grammY, TypeScript | Telegram bot for the dedicated courier |
| [`packages/shared-contracts/`](./packages/shared-contracts) | TypeScript | Hand-written types shared by backend, mini-app, courier-bot |
| [`docs/`](./docs) | — | OpenAPI spec, WebSocket event catalog, auth contract, resolved open decisions |

`android-kds/` is a standalone Gradle project — it is **not** part of the Bun/npm workspace graph and is built independently via Android Studio / Gradle.

## Local development

Requires [Bun](https://bun.sh) and Docker.

```bash
# 1. Start local Postgres + Redis
bun run infra:up

# 2. Install JS/TS workspace dependencies
bun install

# 3. Apply database migrations
bun run backend:migrate

# 4. Run the backend
bun run backend:dev
```

Each subproject has its own `.env.example` — copy to `.env` and fill in secrets before running.

## Status

Phase 0 (contracts & foundations) is in progress. See the execution roadmap in `docs/` (or the plan file this repo was scaffolded from) for the full phased build sequence: Phase 0 (contracts) → Phase 1 (parallel happy-path buildout across all four tracks) → Phase 2 (anti-fraud/CoD risk engine + Click/Payme) → Phase 3 (deployment).
