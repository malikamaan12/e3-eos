#!/usr/bin/env bash
set -euo pipefail

SECRET_NAME="e3-eos-staging-test-credentials"
PROJECT_ID="${1:-e3-eos-staging}"

echo "================================================================================"
echo "   E3-EOS: SYNC CREDENTIALS TO GOOGLE CLOUD SECRET MANAGER                      "
echo "================================================================================"

if [ ! -f ".credentials.local.json" ]; then
  echo "Error: .credentials.local.json not found. Run 'node scripts/rotate-staging-passwords.cjs' first."
  exit 1
fi

echo "Checking Secret Manager for $SECRET_NAME in project $PROJECT_ID..."
if ! gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "Creating new secret $SECRET_NAME..."
  gcloud secrets create "$SECRET_NAME" \
    --project="$PROJECT_ID" \
    --replication-policy="automatic"
fi

echo "Adding new secret version from .credentials.local.json..."
gcloud secrets versions add "$SECRET_NAME" \
  --project="$PROJECT_ID" \
  --data-file=".credentials.local.json"

echo ""
echo "✓ Success! Staging credentials secured in GCP Secret Manager."
echo "Retrieve anytime via:"
echo "  gcloud secrets versions access latest --secret=$SECRET_NAME --project=$PROJECT_ID | jq ."
