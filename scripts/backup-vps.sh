#!/bin/bash
#
# backup-vps.sh — Daily snapshot of all client/lead/funnel state.
#
# Runs on the VPS via cron. Snapshots /root/.openclaw/workspace and the JJ
# soul + history into /root/backups/<YYYY-MM-DD>.tar.gz. Keeps the last 30 days,
# prunes older. Idempotent — re-running on the same day overwrites.
#
# Install (on VPS):
#   chmod +x /root/simple-jj/backup-vps.sh
#   crontab -e
#   # add line:
#   30 3 * * * /root/simple-jj/backup-vps.sh >> /var/log/vps-backup.log 2>&1

set -euo pipefail

BACKUP_ROOT="/root/backups"
DATE="$(date +%F)"
SNAP_DIR="$BACKUP_ROOT/$DATE"
ARCHIVE="$BACKUP_ROOT/$DATE.tar.gz"
KEEP_DAYS=30

mkdir -p "$BACKUP_ROOT"

echo "[$(date -Iseconds)] backup start: $DATE"

# Stage everything we want to preserve
mkdir -p "$SNAP_DIR"
cp -a /root/.openclaw/workspace "$SNAP_DIR/workspace" 2>/dev/null || echo "WARN: workspace missing"
cp -a /root/simple-jj/soul.md  "$SNAP_DIR/soul.md"  2>/dev/null || echo "WARN: soul.md missing"
cp -a /root/simple-jj/history  "$SNAP_DIR/history"  2>/dev/null || echo "WARN: jj history missing"

# Compress + remove the staged dir
tar -czf "$ARCHIVE" -C "$BACKUP_ROOT" "$DATE"
rm -rf "$SNAP_DIR"

# Prune anything older than KEEP_DAYS
find "$BACKUP_ROOT" -maxdepth 1 -name "*.tar.gz" -mtime "+$KEEP_DAYS" -print -delete

SIZE=$(du -h "$ARCHIVE" | cut -f1)
echo "[$(date -Iseconds)] backup ok: $ARCHIVE ($SIZE)"
