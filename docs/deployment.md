# Deployment

Single-VPS deployment per the roadmap's Phase 3 scope — no container orchestration, no managed DB service. This describes the actual deployment to the shared server this project runs on (`88.218.78.159` / `mydoners.uz`), which already hosts several other unrelated projects — everything here is scoped to avoid touching them.

## Layout on the server

```
/opt/mydoners/                # this repo (deployed via rsync, not git — see below)
/var/www/mydoners.uz/         # Mini App static build, served directly by nginx
/var/www/admin.mydoners.uz/   # Admin panel static build, served directly by nginx
/opt/mydoners/backups/        # daily Postgres dumps
```

Live at: `https://mydoners.uz` (Mini App), `https://api.mydoners.uz` (backend REST + WSS + courier webhook), `https://admin.mydoners.uz` (menu admin panel).

## Isolation from other projects on this host

This server already runs nginx (ports 80/443), a native PostgreSQL on 5432/5433, a native Redis on 6379, and several other Dockerized apps. MyDoners avoids all of it:

- **Own Docker network** (`mydoners_net`) and **own Postgres/Redis containers** — no host ports published for either, so there's no port collision with the existing native Postgres/Redis or the other `postgres`/`redis` containers already on this box.
- **Backend** bound to `127.0.0.1:4210` only (not `0.0.0.0`) — reachable only via nginx's reverse proxy, never directly from the internet. Same pattern this host already uses for its other projects (e.g. `api.jamshiddev.uz` → `127.0.0.1:8081`).
- **Courier Bot webhook** (if `BOT_MODE=webhook`) bound to `127.0.0.1:4211`, reverse-proxied at `api.mydoners.uz/courier-bot/webhook`.
- No new firewall rules needed — nginx already has 80/443 allowed in UFW; nothing else is exposed externally.

## One-time server setup

1. DNS: `mydoners.uz`, `api.mydoners.uz`, `admin.mydoners.uz` A records → `88.218.78.159`.
2. `mkdir -p /opt/mydoners /var/www/mydoners.uz /var/www/admin.mydoners.uz`
3. Copy `deploy/nginx/*.conf` to `/etc/nginx/sites-available/`, symlink into `sites-enabled/`, `nginx -t && systemctl reload nginx`.
4. Once DNS resolves: `certbot --nginx -d mydoners.uz -d www.mydoners.uz`, `certbot --nginx -d api.mydoners.uz`, `certbot --nginx -d admin.mydoners.uz` (matches this host's existing certbot-per-domain pattern).
5. Copy `.env.prod.example` → `.env.prod`, `backend/.env.prod.example` → `backend/.env.prod`, `courier-bot/.env.prod.example` → `courier-bot/.env.prod`, fill in real secrets (bot tokens, generated `JWT_SECRET`/`COURIER_BOT_API_KEY`/`ADMIN_PASSWORD` via `openssl rand -hex 32` or a memorable password for `ADMIN_PASSWORD` specifically since a human types that one, matching Postgres password in both `.env.prod` and `backend/.env.prod`'s `DATABASE_URL`).
6. `docker compose --env-file .env.prod -f docker-compose.prod.yml build` — **always pass `--env-file .env.prod`**, or `${POSTGRES_USER}`/`${POSTGRES_PASSWORD}` substitute to blank and Postgres's healthcheck breaks (data itself is safe either way — Postgres only uses those vars on first init of an empty volume — but don't skip this).
7. `docker compose --env-file .env.prod -f docker-compose.prod.yml up -d`
8. Apply migrations: `docker compose --env-file .env.prod -f docker-compose.prod.yml exec backend bun run src/db/migrate.ts`
9. Build and deploy the Mini App: `bun run build` in `mini-app/` (with `VITE_BACKEND_URL=https://api.mydoners.uz` in its `.env.production`), copy `mini-app/dist/*` to `/var/www/mydoners.uz/`. Same pattern for `admin-app/` → `/var/www/admin.mydoners.uz/`.
10. Cron: `0 3 * * * /opt/mydoners/deploy/scripts/backup-db.sh >> /var/log/mydoners-backup.log 2>&1`
11. Bot setup: `setChatMenuButton` on the customer bot pointing to `https://mydoners.uz` (Telegram Bot API, one-time call); courier bot's webhook gets registered automatically on container start (`BOT_MODE=webhook` calls `setWebhook` itself — see courier-bot/src/index.ts).

## Redeploying after a code change

```bash
cd /opt/mydoners
git pull   # or re-rsync from local, if not using a git remote yet
docker compose --env-file .env.prod -f docker-compose.prod.yml build
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

## What's still a stub

Per `docs/decisions.md` — SMS OTP delivery (`StubSmsProvider`) and Click/Payme payment processing (`StubPaymentProvider`) are honest placeholders, not real integrations, pending real accounts/credentials. The rest of the system works end-to-end around them.
