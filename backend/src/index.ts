import { createServer } from "node:http";
import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { apiRouter } from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { initSocket } from "./ws/socket";
import { ensureRedisConnected } from "./core/redis";
import { startTelegramRetryWorker } from "./core/telegram";

const app = express();
// Exactly one hop: nginx sits in front and sets X-Forwarded-For / X-Real-IP
// (see deploy/nginx/api.mydoners.uz.conf). Without this, req.ip is nginx's own
// container address for every request, which would collapse the admin-login
// rate limiter into a single shared bucket. "1" rather than `true` so a
// client-supplied X-Forwarded-For can't be used to spoof an arbitrary IP.
app.set("trust proxy", 1);
// Mini App, Android KDS, and Courier Bot are all served from different
// origins than the API — open CORS rather than pin an allowlist, since this
// is a single-restaurant backend with no cookie-based auth to protect
// (Bearer tokens aren't readable cross-origin the way cookies are).
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/uploads", express.static("uploads"));

app.use(apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const httpServer = createServer(app);
initSocket(httpServer);

await ensureRedisConnected();
startTelegramRetryWorker();

httpServer.listen(env.port, () => {
  console.log(`MyDoners backend listening on :${env.port} (REST + WebSocket at /realtime)`);
});
