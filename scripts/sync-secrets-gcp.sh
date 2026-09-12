#!/usr/bin/env bash
set -euo pipefail

# E3-EOS System Service Secrets Sync (Google Cloud Secret Manager)
# NOTE: End-user passwords must NEVER be stored in Secret Manager.
# Secret Manager is strictly for infrastructure secrets: DB credentials, JWT keys, session secrets.

PROJECT_ID="${1:-e3-eos-staging}"

echo "================================================================================"
echo "   E3-EOS: GOOGLE CLOUD SECRET MANAGER (SYSTEM SERVICE SECRETS)                 "
echo "================================================================================"

sync_secret() {
  local name="$1"
  local value="$2"
  if ! gcloud secrets describe "$name" --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "Creating system secret: $name..."
    gcloud secrets create "$name" --project="$PROJECT_ID" --replication-policy="automatic"
  fi
  printf "%s" "$value" | gcloud secrets versions add "$name" --project="$PROJECT_ID" --data-file=-
  echo "✓ Synced system secret: $name"
}

if [ -n "${SESSION_SECRET:-}" ]; then
  sync_secret "e3-eos-session-secret" "$SESSION_SECRET"
fi

if [ -n "${JWT_SECRET:-}" ]; then
  sync_secret "e3-eos-jwt-secret" "$JWT_SECRET"
fi

echo "System service secrets verified in GCP Secret Manager ($PROJECT_ID)."
