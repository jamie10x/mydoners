#!/usr/bin/env bash
# Daily Postgres dump — run via cron on the server (see docs/deployment.md).
# Non-negotiable per the roadmap's Phase 3 notes: this handles real orders
# and payment state.
set -euo pipefail

BACKUP_DIR="/opt/mydoners/backups"
RETENTION_DAYS=14
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"

docker exec mydoners_prod_postgres pg_dump -U mydoners mydoners | gzip > "$BACKUP_DIR/mydoners-$TIMESTAMP.sql.gz"

# Prune backups older than RETENTION_DAYS.
find "$BACKUP_DIR" -name "mydoners-*.sql.gz" -mtime "+$RETENTION_DAYS" -delete

echo "Backed up to $BACKUP_DIR/mydoners-$TIMESTAMP.sql.gz"
