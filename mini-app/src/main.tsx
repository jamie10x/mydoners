import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { init } from "@telegram-apps/sdk";
import { App } from "./App";
import "./index.css";

if (import.meta.env.DEV) {
  // Only for local development in a regular browser, where there's no real
  // Telegram client to supply launch params. Never runs in production —
  // mockTelegramEnv is dev-tooling from @telegram-apps/sdk itself. Racing
  // this against an isTMA() detection call is unreliable (telegram-web-app.js's
  // own browser polyfill can answer isTMA's probe), so dev builds mock
  // unconditionally instead of trying to detect a real Telegram client.
  try {
    const { mockTelegramEnv } = await import("@telegram-apps/sdk");
    const { launchParamsRaw } = await import("./devMockInitData");
    mockTelegramEnv(launchParamsRaw);
    console.info("[dev] Mocked Telegram launch params for local browser testing.");
  } catch (err) {
    console.error("[dev] Failed to mock Telegram launch params:", err);
  }
}

// Required before any SDK method that talks to the native app (e.g.
// requestContact()) — without this, those calls throw "SDK was not
// initialized". Wrapped in try/catch so a plain browser tab (no Telegram
// environment) doesn't crash the whole app over it.
try {
  init();
} catch (err) {
  console.warn("[sdk] init() failed — not running inside Telegram?", err);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
