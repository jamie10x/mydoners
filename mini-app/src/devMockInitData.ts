// Dev-only helper (see main.tsx) — generates a freshly-signed, valid initData
// string client-side so the full auth -> menu -> order -> tracking flow can
// be exercised in a regular browser without a real Telegram client. Uses the
// same HMAC-SHA256 algorithm as backend/src/middleware/auth.ts. Never bundled
// into production (only reached behind `import.meta.env.DEV` in main.tsx).
//
// VITE_DEV_BOT_TOKEN must match the backend's TELEGRAM_BOT_TOKEN for local
// verification to succeed — see .env.example.

async function hmacSha256(key: BufferSource, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function buildSignedInitData(botToken: string): Promise<string> {
  const user = JSON.stringify({ id: 123456789, first_name: "Dev", last_name: "Tester", username: "dev_tester" });
  const authDate = String(Math.floor(Date.now() / 1000));

  const params = new URLSearchParams();
  params.set("query_id", "AADevMock");
  params.set("user", user);
  params.set("auth_date", authDate);

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = await hmacSha256(new TextEncoder().encode("WebAppData"), botToken);
  const hash = toHex(await hmacSha256(secretKey, dataCheckString));

  params.set("hash", hash);
  // Real Telegram initData also carries an Ed25519 "signature" field
  // (separate from "hash", excluded from the HMAC data-check-string, and not
  // checked by our backend's verifyTelegramInitData) — the SDK's client-side
  // InitData parser requires the field to be present, so the mock needs a
  // placeholder value even though nothing validates its contents here.
  params.set("signature", "dev-mock-signature");
  return params.toString();
}

const devBotToken = import.meta.env.VITE_DEV_BOT_TOKEN ?? "test-bot-token-12345";
const initDataRaw = await buildSignedInitData(devBotToken);

// Raw query-string format mockTelegramEnv/retrieveLaunchParams actually parse
// (tgWebApp* keys) — passing a plain {initDataRaw, platform, ...} object
// silently produces a broken internal string, so build this format directly.
const launchParams = new URLSearchParams();
launchParams.set("tgWebAppData", initDataRaw);
launchParams.set("tgWebAppVersion", "8");
launchParams.set("tgWebAppPlatform", "tdesktop");
launchParams.set("tgWebAppThemeParams", JSON.stringify({}));

export const launchParamsRaw = launchParams.toString();
