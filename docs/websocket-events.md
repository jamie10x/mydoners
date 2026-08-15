# WebSocket Event Catalog

Transport: [Socket.io](./decisions.md#1-websocket-implementation--socketio) server hosted by the backend, mounted at HTTP path `/realtime` (Socket.io's `path` option — this is the transport endpoint, distinct from a Socket.io "namespace"; all clients connect to the default `/` namespace at this path). All three real-time clients (Mini App, Android KDS, Courier Bot) connect as Socket.io clients this way.

This document is the frozen source of truth for event names and payload shapes. Any change here must be reflected in the backend emitter, the Mini App listener, the Kotlin KDS data classes, and the Courier Bot listener at the same time — treat it as a breaking-change surface, not a place for silent additions.

## Connection & auth

- Clients connect with `io(BACKEND_URL, { path: "/realtime", auth: { token } })`.
- `token` is:
  - Mini App: the JWT issued by `POST /auth/telegram` (see [auth-contract.md](./auth-contract.md)).
  - Android KDS: the long-lived device API key issued out-of-band for the single kitchen tablet.
  - Courier Bot: a shared backend↔bot secret (server-to-server, not a Telegram user token).
- Server rejects the connection (`connect_error`) if the token is invalid/expired. Clients must handle `connect_error` and `disconnect` with exponential-backoff reconnect (Socket.io does this by default; don't override it without reason).
- After connecting, KDS and Courier Bot join a single fixed room (`kitchen` and `courier` respectively) via an initial `join` acknowledgment from the server — this exists so future multi-tablet or multi-courier support doesn't require an event-shape change, only a room-assignment change.

## Envelope

Every event payload uses the same envelope:

```ts
interface RealtimeEvent<T> {
  event: string;        // matches the Socket.io event name, duplicated in-payload for logging/debugging
  orderId: number;       // orders.id — present on every event in this catalog
  timestamp: string;      // ISO 8601, server-generated at emission time
  data: T;
}
```

## Events

### `order.created`
**Direction:** server → KDS
Emitted the moment a customer's order is persisted (`orders` row inserted with `status = 'PENDING'`, or `'CONFIRMED'` if it passed anti-fraud checks — see Phase 2). This is what triggers the KDS's continuous audio alert loop.

```ts
interface OrderCreatedData {
  status: "PENDING" | "CONFIRMED";
  customerName: string;
  items: Array<{
    productName: string;
    selectedVariant: string | null;  // "Beef" | "Chicken" | null
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalAmount: number;
  paymentType: "CASH" | "CLICK" | "PAYME";
  paymentStatus: "UNPAID" | "PAID";
  landmarkAddress: string;
  courierNotes: string | null;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | null;   // null until Phase 2 risk scoring lands
}
```

### `order.status_changed`
**Direction:** server → KDS, Mini App, Courier Bot (all three; each filters for the statuses relevant to it)
Emitted on every write to `orders.status`. This single event covers the full lifecycle — clients distinguish behavior by inspecting `data.status`, not by listening for a different event per transition.

```ts
interface OrderStatusChangedData {
  status: "PENDING" | "CONFIRMED" | "COOKING" | "READY_FOR_DELIVERY" | "ON_THE_WAY" | "DELIVERED" | "CANCELLED";
  previousStatus: string;
  changedBy: "SYSTEM" | "KITCHEN" | "COURIER" | "USER";
}
```
- Courier Bot listens for `status === "READY_FOR_DELIVERY"` as its dispatch trigger (per [decision 5](./decisions.md#5-courier-bot-dispatch-trigger--bot-subscribes-as-a-socketio-client-to-the-same-event-catalog-as-kds)).
- Mini App uses every transition to drive the customer-facing progress tracker.
- KDS uses `CANCELLED` to remove a card and silence its alert if still ringing.

### `order.risk_flagged` *(Phase 2)*
**Direction:** server → KDS, Mini App
Emitted when the anti-fraud engine assigns a MEDIUM or HIGH risk level to a pending CoD order — see [decisions.md](./decisions.md) and the roadmap's Phase 2 section for the scoring rules this reacts to.

```ts
interface OrderRiskFlaggedData {
  riskLevel: "MEDIUM" | "HIGH";
  reason: "FIRST_ORDER_HIGH_VALUE" | "REPEAT_CANCELLATIONS";
  action: "OTP_REQUIRED" | "VERBAL_CONFIRMATION_REQUIRED" | "COD_BLOCKED";
}
```
- KDS renders the "Needs Verbal Confirmation" badge off `action === "VERBAL_CONFIRMATION_REQUIRED"`.
- Mini App shows the OTP entry screen off `action === "OTP_REQUIRED"`, or switches the payment selector off `action === "COD_BLOCKED"`.

### `order.cancelled`
**Direction:** server → KDS, Mini App, Courier Bot
A dedicated event (in addition to the generic `order.status_changed` with `status: "CANCELLED"`) so clients can react without inspecting the status field — mainly used to stop the KDS audio loop immediately and unconditionally.

```ts
interface OrderCancelledData {
  cancelledBy: "SYSTEM" | "KITCHEN" | "COURIER" | "USER";
  reason: string | null;
}
```

### `courier.assigned`
**Direction:** server → Courier Bot
Emitted alongside (not instead of) `order.status_changed` → `READY_FOR_DELIVERY`, carrying the delivery-specific fields the bot needs that aren't in the generic status payload.

```ts
interface CourierAssignedData {
  customerName: string;
  customerPhone: string;          // only populated once phone verification (Phase 2) exists; null before then
  latitude: number;
  longitude: number;
  landmarkAddress: string;
  paymentType: "CASH" | "CLICK" | "PAYME";
  paymentStatus: "UNPAID" | "PAID";
  amountToCollect: number;         // 0 if paymentStatus is already PAID
  courierNotes: string | null;
}
```

### `delivery.confirmed`
**Direction:** server → Mini App
Emitted when the courier taps "Delivered" in the bot (which calls `PATCH /orders/:id/status` — see [openapi.yaml](./openapi.yaml) — which in turn triggers this event alongside the generic `order.status_changed`). Kept as its own event because the Mini App's final tracker state may show delivery-proof details not present in the generic payload.

```ts
interface DeliveryConfirmedData {
  deliveredAt: string;   // ISO 8601
  proofPhotoUrl: string | null;   // Phase 2 — delivery-proof photo capture
}
```

### `courier.location`
**Direction:** server → Mini App
Emitted whenever the courier bot relays a position (Telegram `message:location` for the initial live share, then `edit:location` for each movement) while at least one order is `ON_THE_WAY`. Sent to the ordering customer's room only.

**Deliberately not delivered to KDS or the Courier Bot, and no listener should be added to either.** The kitchen has no use for a moving pin, and the courier bot is the producer. This is the one event in this catalog with a single recipient — the "reflect in all four clients" rule above does not apply to it, and a Kotlin data class for it would be dead code.

There is one courier, so position is shift-scoped: every in-flight order receives the same coordinates, with `distanceMeters` and `etaMinutes` computed against that order's own destination. `etaMinutes` is null when the share is a one-shot pin rather than a live one, or when more than one order is out for delivery at once (the courier may be visiting the other customer first, so any single number would be confidently wrong).

```ts
interface CourierLocationData {
  latitude: number;
  longitude: number;
  reportedAt: string;            // ISO 8601 — courier device time, not relay time
  isLive: boolean;
  distanceMeters: number | null;
  etaMinutes: number | null;
}
```

## Naming convention

- Event names: `<subject>.<past-tense-verb>` (`order.created`, not `order.create` or `orderCreated`).
- All payload field names: `camelCase`, matching the OpenAPI contract's JSON field naming — the REST and WebSocket APIs should never disagree on how the same concept is spelled.
