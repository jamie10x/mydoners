# Deployment

Single-VPS deployment per the roadmap's Phase 3 scope — no container orchestration, no managed DB service. This describes the actual deployment to the shared server this project runs on (`88.218.78.159` / `mydoners.uz`), which already hosts several other unrelated projects — everything here is scoped to avoid touching them.

## Layout on the server

```
/opt/mydoners/            # this repo (deployed via rsync, not git — see below)
/var/www/mydoners.uz/     # Mini App static build, served directly by nginx
/opt/mydoners/backups/    # daily Postgres dumps
```

## Isolation from other projects on this host

This server already runs nginx (ports 80/443), a native PostgreSQL on 5432/5433, a native Redis on 6379, and several other Dockerized apps. MyDoners avoids all of it:

- **Own Docker network** (`mydoners_net`) and **own Postgres/Redis containers** — no host ports published for either, so there's no port collision with the existing native Postgres/Redis or the other `postgres`/`redis` containers already on this box.
- **Backend** bound to `127.0.0.1:4210` only (not `0.0.0.0`) — reachable only via nginx's reverse proxy, never directly from the internet. Same pattern this host already uses for its other projects (e.g. `api.jamshiddev.uz` → `127.0.0.1:8081`).
- **Courier Bot webhook** (if `BOT_MODE=webhook`) bound to `127.0.0.1:4211`, reverse-proxied at `api.mydoners.uz/courier-bot/webhook`.
- No new firewall rules needed — nginx already has 80/443 allowed in UFW; nothing else is exposed externally.

## One-time server setup

1. DNS: `mydoners.uz` and `api.mydoners.uz` A records → `88.218.78.159`.
2. `mkdir -p /opt/mydoners /var/www/mydoners.uz`
3. Copy `deploy/nginx/*.conf` to `/etc/nginx/sites-available/`, symlink into `sites-enabled/`, `nginx -t && systemctl reload nginx`.
4. Once DNS resolves: `certbot --nginx -d mydoners.uz -d www.mydoners.uz` and `certbot --nginx -d api.mydoners.uz` (matches this host's existing certbot-per-domain pattern).
5. Copy `.env.prod.example` → `.env.prod`, `backend/.env.prod.example` → `backend/.env.prod`, `courier-bot/.env.prod.example` → `courier-bot/.env.prod`, fill in real secrets (bot tokens, generated `JWT_SECRET`/`COURIER_BOT_API_KEY` via `openssl rand -hex 32`, matching Postgres password in both `.env.prod` and `backend/.env.prod`'s `DATABASE_URL`).
6. `docker compose -f docker-compose.prod.yml build`
7. `docker compose -f docker-compose.prod.yml up -d`
8. Apply migrations: `docker compose -f docker-compose.prod.yml exec backend bun run src/db/migrate.ts`
9. Build and deploy the Mini App: `bun run build` in `mini-app/` (with `VITE_BACKEND_URL=https://api.mydoners.uz` in its `.env`), copy `mini-app/dist/*` to `/var/www/mydoners.uz/`.
10. Cron: `0 3 * * * /opt/mydoners/deploy/scripts/backup-db.sh >> /var/log/mydoners-backup.log 2>&1`

## Redeploying after a code change

```bash
cd /opt/mydoners
git pull   # or re-rsync from local, if not using a git remote yet
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

## What's still a stub

Per `docs/decisions.md` — SMS OTP delivery (`StubSmsProvider`) and Click/Payme payment processing (`StubPaymentProvider`) are honest placeholders, not real integrations, pending real accounts/credentials. The rest of the system works end-to-end around them.
