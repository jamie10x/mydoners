# Resolved Open Decisions

The execution roadmap flagged 8 open technical decisions to pin before/during Phase 0. Defaults were chosen below so Phase 0 could proceed without stalling. Each is revisitable — if any assumption turns out wrong once real usage/hardware is in hand, update this file and the affected contract docs together.

## 1. WebSocket implementation → **Socket.io**
Chosen for auto-reconnect and room/namespace conventions out of the box — the KDS tablet's persistent-connection requirement benefits most from not hand-rolling reconnect/heartbeat logic on both the Bun and Kotlin/OkHttp sides. Backend runs `socket.io` server; Android KDS and the Courier Bot both connect as Socket.io clients (see decision 5).

## 2. SMS OTP provider → **Eskiz.uz (placeholder)**
Chosen as the default candidate for Uzbekistan SMS delivery given local market presence and a documented REST API. **Not yet verified** — pricing/reliability for OTP specifically needs real vendor research before Phase 2 wiring. The OTP contract in `docs/openapi.yaml` is provider-agnostic so swapping providers later doesn't change the API surface.

## 3. Click vs Payme build order → **Click first, Payme second**
Click has more mature public API docs for merchant integration. Both require merchant registration/approval — **start both merchant applications now (Phase 0/1)** regardless of build order, since approval lead time is the likely bottleneck, not implementation time.

## 4. Thermal printer model/protocol → **Generic ESC/POS over Bluetooth SPP (placeholder)**
Assumed Bluetooth Serial Port Profile since it's the most common budget-printer connection type and avoids USB-OTG hardware constraints on a wall-mounted tablet. **Must be pinned to an actual purchased device** before `android-kds`'s printer driver is implemented — Bluetooth SPP and USB serial have different Android permission models and driver code paths, so this is a hard blocker for that specific piece of Track C, not the rest of the KDS app.

## 5. Courier Bot dispatch trigger → **Bot subscribes as a Socket.io client to the same event catalog as KDS**
Rather than the backend calling a bot-specific webhook on status change, the Courier Bot process opens its own authenticated Socket.io connection to the backend (like KDS does) and listens for `order.status_changed` where `data.status === "READY_FOR_DELIVERY"`. Chosen for architectural consistency — one event emission path, one auth pattern, no second delivery mechanism to keep in sync.

## 6. Mini App session strategy → **JWT (stateless)**
Telegram Mini Apps re-send fresh `initData` on every app launch, so there's no need for a long-lived refreshable session the way a traditional web app needs one. The backend verifies `initData` on each "login" and issues a short-lived JWT (see `docs/auth-contract.md`) scoped to that Mini App session; Redis is still used for OTP codes, rate limiting, and CoD risk-scoring lookups, just not for session storage.

## 7. Monorepo workspace tool → **Bun workspaces only (no Turborepo)**
Three JS/TS projects (`backend`, `mini-app`, `courier-bot`) is a small enough graph that Bun's built-in workspace support is sufficient. Adding Turborepo's task caching/orchestration now would be premature for this project's size — revisit if build times become a real pain point. `android-kds` stays a separate Gradle project outside this graph regardless.

## 8. Shared contract format → **Hand-written TypeScript types in `packages/shared-contracts`**
Backend, Mini App, and Courier Bot import shared types directly from this package. Android KDS manually mirrors the same shapes as Kotlin data classes, sourced from `docs/openapi.yaml` and `docs/websocket-events.md` (the two docs are the actual source of truth all four tracks code against). OpenAPI-to-Kotlin codegen was considered but rejected for now as unnecessary tooling overhead at this project's size — if payload-shape drift becomes a recurring problem once Track C is underway, revisit.
