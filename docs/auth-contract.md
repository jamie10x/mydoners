# Auth Contract

## 1. Telegram Mini App — `initData` verification

Telegram signs every Mini App launch with an `initData` query string. The Mini App forwards this raw string to the backend; **verification happens only in the backend**, never trusted client-side.

### Verification algorithm (Telegram's documented method)

1. Parse `initData` as a URL query string into key/value pairs.
2. Extract and remove the `hash` field — this is the signature to verify against.
3. Build the `data-check-string`: sort all remaining key/value pairs alphabetically by key, join as `key=value` lines with `\n`.
4. Compute `secret_key = HMAC_SHA256(bot_token, "WebAppData")` — i.e. HMAC-SHA256 with key `"WebAppData"` and message `bot_token`.
5. Compute `computed_hash = HMAC_SHA256(data-check-string, secret_key)` (hex-encoded).
6. Verify `computed_hash === hash` (constant-time comparison — do not use `===` on raw strings for this step; use a timing-safe compare).
7. Reject if `auth_date` is older than an acceptable window (recommended: 24 hours) to prevent replay of a captured `initData` string.

### Reference implementation shape (backend middleware)

```ts
// backend/src/core/auth/verifyTelegramInitData.ts
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyTelegramInitData(initData: string, botToken: string): TelegramInitDataPayload {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const valid =
    hash !== null &&
    computedHash.length === hash.length &&
    timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash));

  if (!valid) throw new UnauthorizedError("Invalid Telegram initData signature");

  const authDate = Number(params.get("auth_date"));
  if (Date.now() / 1000 - authDate > 86400) throw new UnauthorizedError("initData expired");

  return parseTelegramUser(params); // extracts telegram_id, first_name, username, etc. from the `user` field
}
```

### Session issued back to the Mini App

Per [decision 6](./decisions.md#6-mini-app-session-strategy--jwt-stateless): a stateless JWT.

- **Endpoint:** `POST /auth/telegram` — body `{ initData: string }`. See [openapi.yaml](./openapi.yaml).
- On success, backend issues `{ token: string, user: PublicUser }` where `token` is a JWT signed with `JWT_SECRET`, containing `{ sub: telegram_id, iat, exp }`.
- **Expiry:** 24 hours — matches the `initData` freshness window above, and Telegram re-launches the Mini App with fresh `initData` often enough that re-authenticating daily is unobtrusive.
- **No refresh token.** When the JWT expires, the Mini App calls `POST /auth/telegram` again with the current `initData` (which Telegram's SDK can always re-supply on demand) rather than maintaining a separate refresh flow — justified by decision 6's reasoning that Mini Apps don't need traditional web-session refresh semantics.
- Subsequent REST requests send `Authorization: Bearer <token>`. The Socket.io connection sends the same token via `auth: { token }` (see [websocket-events.md](./websocket-events.md)).

## 2. Android KDS authentication

Single fixed kitchen tablet — no per-user login flow needed.

- A long-lived **device API key** is generated out-of-band (e.g. via an admin CLI script or manual DB insert during setup) and stored in the tablet's app config (not hardcoded in source — set via a build-time config value or first-run setup screen).
- Sent as `Authorization: Bearer <device_api_key>` on REST calls and `auth: { token: device_api_key }` on the Socket.io connection.
- Backend validates this against a `device_keys` table (not yet in the core schema — add during Track A's Phase 1 auth middleware work) rather than the `users` table, since it isn't a Telegram identity.
- **Rotation:** if the key is ever compromised, generate a new one and update the tablet's config manually — acceptable given there's exactly one device.

## 3. Courier Bot authentication

The bot is a trusted backend-to-backend peer, not an end-user client.

- **Telegram → Bot:** Telegram's own webhook/long-polling delivery already authenticates that updates come from Telegram (standard Telegram Bot API webhook secret token, `X-Telegram-Bot-Api-Secret-Token` header, if webhook mode is used).
- **Bot → Backend (REST calls, e.g. status updates):** shared secret set via `COURIER_BOT_API_KEY` env var on both sides, sent as `Authorization: Bearer <key>`.
- **Bot → Backend (Socket.io):** same shared secret sent as `auth: { token: courier_bot_api_key }`, per [decision 5](./decisions.md#5-courier-bot-dispatch-trigger--bot-subscribes-as-a-socketio-client-to-the-same-event-catalog-as-kds).

## Worked example

Given `botToken = "123456:ABC-DEF..."` and a raw `initData` string from Telegram:

```
initData = "query_id=AAH...&user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Aziz%22%7D&auth_date=1753000000&hash=abc123..."
```

1. Parsed params (excluding `hash`): `query_id`, `user`, `auth_date`.
2. `data-check-string` (sorted, `\n`-joined):
   ```
   auth_date=1753000000
   query_id=AAH...
   user={"id":123456789,"first_name":"Aziz"}
   ```
3. `secret_key = HMAC_SHA256("123456:ABC-DEF...", "WebAppData")`
4. `computed_hash = HMAC_SHA256(data-check-string, secret_key)` → compare to the `hash` param.
5. If valid and `auth_date` is recent: extract `telegram_id = 123456789`, upsert into `users`, issue JWT.

This example is illustrative (values truncated) — the actual verification must be exercised against a real Telegram-issued `initData` string during Track A's Phase 1 implementation, not just unit-tested against synthetic fixtures.
