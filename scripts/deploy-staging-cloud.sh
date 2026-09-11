#!/usr/bin/env bash
# ==============================================================================
# E3-EOS v1.0.0 — Direct Cloud Run Staging Deployer
# ==============================================================================
set -euo pipefail

PROJECT_ID="${1:-e3-eos-staging}"
REGION="${2:-me-central1}"
ENVIRONMENT="${3:-staging}"
COMMIT_SHA="$(git rev-parse HEAD 2>/dev/null || echo '08fced7d9a7dafe89a5022d0281d944a688fc389')"
REGISTRY_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/e3-eos"

echo "================================================================================"
echo "   E3-EOS v1.0.0 — STAGING IMMUTABLE CONTAINER DEPLOYMENT ORCHESTRATOR"
echo "   Target Region: ${REGION} (Doha, Qatar)"
echo "   Project ID   : ${PROJECT_ID}"
echo "   Environment  : ${ENVIRONMENT}"
echo "   Commit SHA   : ${COMMIT_SHA}"
echo "================================================================================"
echo ""

gcloud config set project "${PROJECT_ID}"
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# 1. Build and push immutable container images
echo "[1/3] Building & Pushing Immutable Container Images (${COMMIT_SHA})..."
docker build \
    --build-arg GIT_COMMIT="${COMMIT_SHA}" \
    --build-arg BUILD_SHA="${COMMIT_SHA}" \
    -t "${REGISTRY_URL}/api:${COMMIT_SHA}" \
    -t "${REGISTRY_URL}/api:latest" \
    -f apps/api/Dockerfile .
docker push "${REGISTRY_URL}/api:${COMMIT_SHA}"
docker push "${REGISTRY_URL}/api:latest"

docker build \
    --build-arg GIT_COMMIT="${COMMIT_SHA}" \
    --build-arg BUILD_SHA="${COMMIT_SHA}" \
    -t "${REGISTRY_URL}/web:${COMMIT_SHA}" \
    -t "${REGISTRY_URL}/web:latest" \
    -f apps/web/Dockerfile .
docker push "${REGISTRY_URL}/web:${COMMIT_SHA}"
docker push "${REGISTRY_URL}/web:latest"

docker build \
    --build-arg GIT_COMMIT="${COMMIT_SHA}" \
    --build-arg BUILD_SHA="${COMMIT_SHA}" \
    -t "${REGISTRY_URL}/worker:${COMMIT_SHA}" \
    -t "${REGISTRY_URL}/worker:latest" \
    -f apps/worker/Dockerfile .
docker push "${REGISTRY_URL}/worker:${COMMIT_SHA}"
docker push "${REGISTRY_URL}/worker:latest"

echo ">>> Container images built and pushed successfully."
echo ""

# 2. Deploy Cloud Run staging services with immutable image tags and environment variables
echo "[2/3] Deploying Cloud Run Services in ${REGION}..."

echo "Deploying e3-eos-api-${ENVIRONMENT}..."
gcloud run deploy "e3-eos-api-${ENVIRONMENT}" \
  --image "${REGISTRY_URL}/api:${COMMIT_SHA}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --update-env-vars "ENVIRONMENT=${ENVIRONMENT},GIT_COMMIT=${COMMIT_SHA},BUILD_SHA=${COMMIT_SHA}" \
  --quiet

echo "Deploying e3-eos-web-${ENVIRONMENT}..."
gcloud run deploy "e3-eos-web-${ENVIRONMENT}" \
  --image "${REGISTRY_URL}/web:${COMMIT_SHA}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --update-env-vars "ENVIRONMENT=${ENVIRONMENT},GIT_COMMIT=${COMMIT_SHA},BUILD_SHA=${COMMIT_SHA}" \
  --quiet

echo "Deploying e3-eos-worker-${ENVIRONMENT}..."
gcloud run deploy "e3-eos-worker-${ENVIRONMENT}" \
  --image "${REGISTRY_URL}/worker:${COMMIT_SHA}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --update-env-vars "ENVIRONMENT=${ENVIRONMENT},GIT_COMMIT=${COMMIT_SHA},BUILD_SHA=${COMMIT_SHA}" \
  --quiet

echo ">>> All three staging services deployed successfully."
echo ""

# 3. Query Health Check & Output Revisions
echo "[3/3] Verifying Public Health Endpoint..."
API_URL="https://e3-eos-api-${ENVIRONMENT}-4m6nzwqkuq-ww.a.run.app"
curl -s "${API_URL}/api/v1/health/system" | python3 -m json.tool || true
echo ""
echo "================================================================================"
echo "   IMMUTABLE STAGING DEPLOYMENT COMPLETE"
echo "================================================================================"
