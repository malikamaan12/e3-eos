# ==============================================================================
# E3-EOS v1.0.0 — Automated Google Cloud Doha (me-central1) Deployment Script
# ==============================================================================
# Usage:
#   .\scripts\deploy-gcp.ps1 -ProjectId "your-gcp-project-id" [-Region "me-central1"]
# ==============================================================================

param (
    [Parameter(Mandatory = $false)]
    [string]$ProjectId = "e3-eos-production",

    [Parameter(Mandatory = $false)]
    [string]$Region = "me-central1",

    [Parameter(Mandatory = $false)]
    [string]$Environment = "production"
)

$ErrorActionPreference = "Stop"

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "   E3-EOS v1.0.0 — ZERO-TOUCH GOOGLE CLOUD DEPLOYMENT ORCHESTRATOR" -ForegroundColor Cyan
Write-Host "   Target Region: $Region (Doha, Qatar)" -ForegroundColor Cyan
Write-Host "   Project ID   : $ProjectId" -ForegroundColor Cyan
Write-Host "   Environment  : $Environment" -ForegroundColor Cyan
Write-Host "================================================================================`n" -ForegroundColor Cyan

# Step 1: Pre-flight Verification Gate
Write-Host "[1/6] Running Local Pre-Flight Verification Gate..." -ForegroundColor Yellow
pnpm verify:preflight
if ($LASTEXITCODE -ne 0) {
    Write-Error "Pre-flight verification gate failed. Aborting deployment."
}
Write-Host ">>> Pre-flight verification PASSED.`n" -ForegroundColor Green

# Step 2: Check Cloud Tools
Write-Host "[2/6] Verifying Cloud Tooling..." -ForegroundColor Yellow
$hasGcloud = Get-Command gcloud -ErrorAction SilentlyContinue
$hasTerraform = Get-Command terraform -ErrorAction SilentlyContinue
$hasDocker = Get-Command docker -ErrorAction SilentlyContinue

if (-not $hasGcloud) {
    Write-Warning "Google Cloud CLI (gcloud) is not installed or not in PATH."
    Write-Host "Please install the Google Cloud SDK: https://cloud.google.com/sdk/docs/install" -ForegroundColor Cyan
    Write-Host "Alternatively, run this script inside Google Cloud Shell where all tools are pre-installed." -ForegroundColor Cyan
    exit 1
}

if (-not $hasTerraform) {
    Write-Warning "Terraform CLI is not installed or not in PATH."
    Write-Host "Please install Terraform >= 1.7.0: https://developer.hashicorp.com/terraform/install" -ForegroundColor Cyan
    exit 1
}

# Step 3: GCP Authentication & API Enablement
Write-Host "[3/6] Configuring Google Cloud Project & Enabling APIs..." -ForegroundColor Yellow
gcloud config set project $ProjectId
gcloud services enable `
    run.googleapis.com `
    sqladmin.googleapis.com `
    redis.googleapis.com `
    secretmanager.googleapis.com `
    artifactregistry.googleapis.com `
    vpcaccess.googleapis.com `
    compute.googleapis.com

# Step 4: Artifact Registry Setup & Container Builds
Write-Host "[4/6] Ensuring Artifact Registry in $Region..." -ForegroundColor Yellow
$registryUrl = "$Region-docker.pkg.dev/$ProjectId/e3-eos"
gcloud artifacts repositories create e3-eos `
    --repository-format=docker `
    --location=$Region `
    --description="E3-EOS Production Container Registry" `
    --quiet 2>$null

Write-Host "Configuring Docker authentication for $Region..." -ForegroundColor Yellow
gcloud auth configure-docker "$Region-docker.pkg.dev" --quiet

Write-Host "Building & Pushing Container Images to Artifact Registry..." -ForegroundColor Yellow
docker build -t "$registryUrl/api:latest" -f apps/api/Dockerfile .
docker push "$registryUrl/api:latest"

docker build -t "$registryUrl/web:latest" -f apps/web/Dockerfile .
docker push "$registryUrl/web:latest"

docker build -t "$registryUrl/worker:latest" -f apps/worker/Dockerfile .
docker push "$registryUrl/worker:latest"
Write-Host ">>> Container images built and pushed successfully.`n" -ForegroundColor Green

# Step 5: Terraform Infrastructure Provisioning
Write-Host "[5/6] Executing Terraform Infrastructure Provisioning..." -ForegroundColor Yellow
Push-Location "infra/terraform"
try {
    terraform init
    terraform apply -auto-approve `
        -var="project_id=$ProjectId" `
        -var="region=$Region" `
        -var="environment=$Environment"

    $apiUrl = terraform output -raw api_service_url
    $webUrl = terraform output -raw web_service_url
} finally {
    Pop-Location
}

# Step 6: Summary and Live Endpoints
Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host "   E3-EOS v1.0.0 DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "Web Frontend URL : $webUrl" -ForegroundColor Green
Write-Host "Backend API URL  : $apiUrl" -ForegroundColor Green
Write-Host "API Health Check : $apiUrl/api/v1/health" -ForegroundColor Green
Write-Host "Swagger Docs     : $apiUrl/api/v1/docs" -ForegroundColor Green
Write-Host "================================================================================`n" -ForegroundColor Cyan
