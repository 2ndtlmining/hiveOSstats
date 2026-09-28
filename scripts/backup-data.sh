#!/bin/bash
# Back up the data/ directory (the only copy of snapshot history).
# Usage: scripts/backup-data.sh [backup_dir]   (default: ../hiveOSstats-backups)
# Keeps the newest $KEEP archives (default 30). Safe to run from cron, e.g.:
#   30 6 * * * cd ~/hiveOSstats && scripts/backup-data.sh >> ~/hiveos-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."
BACKUP_DIR="${1:-../hiveOSstats-backups}"
KEEP="${KEEP:-30}"

mkdir -p "$BACKUP_DIR"
ARCHIVE="$BACKUP_DIR/data-$(date -u +%Y-%m-%d_%H-%M-%S).tar.gz"
tar czf "$ARCHIVE" data
echo "Backed up data/ to $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"

# Remove all but the newest $KEEP archives
ls -1t "$BACKUP_DIR"/data-*.tar.gz | tail -n +$((KEEP + 1)) | xargs -r rm --
