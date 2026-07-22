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
| [`admin-app/`](./admin-app) | React, TypeScript, Vite, Tailwind, Zustand | Password-protected menu (categories/products) management |
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

Phase 0 (contracts & foundations), Phase 1 (happy-path buildout), and Phase 2 (anti-fraud/CoD risk engine + payments) are done — every piece has been run and verified against the real backend, not just compiled:

- **Backend**: auth, catalog, order creation/pricing/modifier validation, the full order status state machine, Socket.io event emission, the three-tier CoD risk engine (LOW/MEDIUM/HIGH), phone verification, Redis-backed OTP, and the courier delivery-proof + cash-confirmation-code flow — all exercised end-to-end with real HTTP/WS calls, including synthetic user histories driving each risk tier.
- **Mini App**: menu → forced modifier choice → cart → checkout (GPS + landmark, all three payment methods, phone verification prompt) → order creation → live status tracker with optional OTP self-verification and cash-code display, verified in a browser against the real backend.
- **Android KDS**: built and run on an emulator against the live backend — device-key auth, work-queue recovery on launch, live WebSocket order updates, the continuous alarm starting/stopping correctly, Accept/Ready actions moving real orders through the backend, and the MEDIUM-risk "Needs Verbal Confirmation" badge.
- **Courier Bot**: the WebSocket dispatch trigger (`courier.assigned`), bot-authenticated status updates, and the delivery-proof photo + cash-code submission verified live against the backend. Telegram send/receive itself is untested — it needs a real `COURIER_BOT_TOKEN` and courier chat id, which are user-supplied secrets.

Two pieces are honest stubs, not fake integrations: SMS OTP delivery (`StubSmsProvider`, pending real Eskiz.uz credentials) and Click/Payme payment processing (`StubPaymentProvider`, pending real merchant accounts — registration/KYC approval is the actual bottleneck, not implementation). Both sit behind interfaces so swapping in real implementations doesn't touch the rest of the app. See `docs/decisions.md` for the full reasoning.

**Phase 3 (deployment) is live**, at `mydoners.uz` (Mini App), `api.mydoners.uz` (backend), and `admin.mydoners.uz` (menu admin panel) — see `docs/deployment.md` for how it's set up and kept isolated from the other projects sharing that server.
