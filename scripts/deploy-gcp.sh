#!/usr/bin/env bash
# ==============================================================================
# E3-EOS v1.0.0 — Automated Google Cloud Doha (me-central1) Deployment Script
# ==============================================================================
# Usage:
#   ./scripts/deploy-gcp.sh [PROJECT_ID] [REGION] [ENVIRONMENT]
# ==============================================================================

set -euo pipefail

PROJECT_ID="${1:-e3-eos-staging}"
REGION="${2:-me-central1}"
ENVIRONMENT="${3:-staging}"

echo "================================================================================"
echo "   E3-EOS v1.0.0 — ZERO-TOUCH GOOGLE CLOUD DEPLOYMENT ORCHESTRATOR"
echo "   Target Region: ${REGION} (Doha, Qatar)"
echo "   Project ID   : ${PROJECT_ID}"
echo "   Environment  : ${ENVIRONMENT}"
echo "================================================================================"
echo ""

# Step 1: Pre-flight Verification Gate
echo "[1/6] Building workspace packages & running pre-flight gate..."
if ! command -v pnpm >/dev/null 2>&1; then
    echo "pnpm not found. Installing pnpm..."
    npm install -g pnpm || corepack enable
fi
pnpm build
pnpm verify:preflight
echo ">>> Pre-flight verification PASSED."
echo ""

# Step 2: Check Cloud Tools
echo "[2/6] Verifying Cloud Tooling..."
command -v gcloud >/dev/null 2>&1 || { echo >&2 "ERROR: gcloud CLI is required. Aborting."; exit 1; }
command -v terraform >/dev/null 2>&1 || { echo >&2 "ERROR: terraform is required. Aborting."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo >&2 "ERROR: docker is required. Aborting."; exit 1; }

# Step 3: GCP Authentication & API Enablement
echo "[3/6] Configuring Google Cloud Project & Enabling APIs..."
gcloud config set project "${PROJECT_ID}"
gcloud services enable \
    cloudresourcemanager.googleapis.com \
    run.googleapis.com \
    sqladmin.googleapis.com \
    redis.googleapis.com \
    secretmanager.googleapis.com \
    artifactregistry.googleapis.com \
    vpcaccess.googleapis.com \
    compute.googleapis.com \
    servicenetworking.googleapis.com

# Step 4: Artifact Registry Setup & Container Builds
echo "[4/6] Ensuring Artifact Registry in ${REGION}..."
REGISTRY_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/e3-eos"
gcloud artifacts repositories create e3-eos \
    --repository-format=docker \
    --location="${REGION}" \
    --description="E3-EOS Production Container Registry" \
    --quiet 2>/dev/null || true

gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

echo "Building & Pushing Container Images to Artifact Registry..."
docker build -t "${REGISTRY_URL}/api:latest" -f apps/api/Dockerfile .
docker push "${REGISTRY_URL}/api:latest"

docker build -t "${REGISTRY_URL}/web:latest" -f apps/web/Dockerfile .
docker push "${REGISTRY_URL}/web:latest"

docker build -t "${REGISTRY_URL}/worker:latest" -f apps/worker/Dockerfile .
docker push "${REGISTRY_URL}/worker:latest"
echo ">>> Container images built and pushed successfully."
echo ""

# Step 5: Terraform Infrastructure Provisioning
echo "[5/6] Executing Terraform Infrastructure Provisioning..."
cd infra/terraform
terraform init
terraform apply -auto-approve \
    -var="project_id=${PROJECT_ID}" \
    -var="region=${REGION}" \
    -var="environment=${ENVIRONMENT}"

API_URL="$(terraform output -raw api_service_url)"
WEB_URL="$(terraform output -raw web_service_url)"
cd ../..

# Step 6: Summary and Live Endpoints
echo ""
echo "================================================================================"
echo "   E3-EOS v1.0.0 DEPLOYMENT SUCCESSFUL!"
echo "================================================================================"
echo "Web Frontend URL : ${WEB_URL}"
echo "Backend API URL  : ${API_URL}"
echo "API Health Check : ${API_URL}/api/v1/health"
echo "Swagger Docs     : ${API_URL}/api/v1/docs"
echo "================================================================================"
echo ""
