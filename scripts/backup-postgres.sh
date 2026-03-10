#!/bin/bash
set -euo pipefail

# ─────────────────────────────────────────────
# HeyDoctor PostgreSQL Backup Script
# Performs pg_dump, gzip, upload to S3, rotate
# ─────────────────────────────────────────────

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="heydoctor_${TIMESTAMP}.sql.gz"
TMP_DIR="${TMP_DIR:-/tmp}"
BACKUP_PATH="${TMP_DIR}/${BACKUP_FILE}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
S3_PREFIX="s3://${BACKUP_BUCKET}/postgres"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

if [ -z "${DATABASE_URL:-}" ]; then
  log "ERROR: DATABASE_URL is not set"
  exit 1
fi

if [ -z "${BACKUP_BUCKET:-}" ]; then
  log "ERROR: BACKUP_BUCKET is not set"
  exit 1
fi

AWS_ARGS=""
if [ -n "${AWS_ENDPOINT_URL:-}" ]; then
  AWS_ARGS="--endpoint-url ${AWS_ENDPOINT_URL}"
fi

log "Starting backup..."
pg_dump "${DATABASE_URL}" --no-owner --no-privileges | gzip > "${BACKUP_PATH}"

FILESIZE=$(du -h "${BACKUP_PATH}" | cut -f1)
log "Backup created: ${BACKUP_FILE} (${FILESIZE})"

log "Uploading to ${S3_PREFIX}/${BACKUP_FILE}..."
aws s3 cp "${BACKUP_PATH}" "${S3_PREFIX}/${BACKUP_FILE}" ${AWS_ARGS}
log "Upload complete"

rm -f "${BACKUP_PATH}"

log "Rotating backups older than ${RETENTION_DAYS} days..."
CUTOFF_DATE=$(date -d "-${RETENTION_DAYS} days" +%Y-%m-%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y-%m-%d)

aws s3 ls "${S3_PREFIX}/" ${AWS_ARGS} | while read -r line; do
  FILE_DATE=$(echo "$line" | awk '{print $1}')
  FILE_NAME=$(echo "$line" | awk '{print $4}')
  if [ -z "${FILE_NAME}" ]; then continue; fi
  if [[ "${FILE_DATE}" < "${CUTOFF_DATE}" ]]; then
    log "Deleting old backup: ${FILE_NAME}"
    aws s3 rm "${S3_PREFIX}/${FILE_NAME}" ${AWS_ARGS}
  fi
done

log "Backup complete"
