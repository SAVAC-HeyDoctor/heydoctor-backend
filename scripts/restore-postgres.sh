#!/bin/bash
set -euo pipefail

# ─────────────────────────────────────────────
# HeyDoctor PostgreSQL Restore Script
# Downloads from S3 and restores with psql
# ─────────────────────────────────────────────

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

if [ -z "${DATABASE_URL:-}" ]; then
  log "ERROR: DATABASE_URL is not set"
  exit 1
fi

if [ -z "${BACKUP_BUCKET:-}" ]; then
  log "ERROR: BACKUP_BUCKET is not set"
  exit 1
fi

S3_PREFIX="s3://${BACKUP_BUCKET}/postgres"
AWS_ARGS=""
if [ -n "${AWS_ENDPOINT_URL:-}" ]; then
  AWS_ARGS="--endpoint-url ${AWS_ENDPOINT_URL}"
fi

BACKUP_FILE="${1:-}"

if [ -z "${BACKUP_FILE}" ]; then
  log "No backup file specified. Available backups:"
  aws s3 ls "${S3_PREFIX}/" ${AWS_ARGS} | sort -r | head -20
  echo ""
  echo "Usage: $0 <backup_filename>"
  echo "Example: $0 heydoctor_20260307_030000.sql.gz"
  exit 1
fi

TMP_DIR="${TMP_DIR:-/tmp}"
LOCAL_PATH="${TMP_DIR}/${BACKUP_FILE}"

log "Downloading ${BACKUP_FILE} from S3..."
aws s3 cp "${S3_PREFIX}/${BACKUP_FILE}" "${LOCAL_PATH}" ${AWS_ARGS}

log "WARNING: This will overwrite the current database."
read -p "Continue? (yes/no): " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
  log "Aborted"
  rm -f "${LOCAL_PATH}"
  exit 0
fi

log "Restoring database..."
gunzip -c "${LOCAL_PATH}" | psql "${DATABASE_URL}"

rm -f "${LOCAL_PATH}"
log "Restore complete"
