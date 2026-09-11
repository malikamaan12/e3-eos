#!/usr/bin/env bash
export CLOUDSDK_CORE_PROJECT="e3-eos-staging"

echo "=== RAW OUTPUT: gcloud run services describe e3-eos-api-staging ==="
gcloud run services describe e3-eos-api-staging \
  --region=me-central1 \
  --format="yaml(status.latestReadyRevisionName,status.traffic,spec.template.spec.containers)"

echo ""
echo "=== RAW OUTPUT: gcloud run services describe e3-eos-web-staging ==="
gcloud run services describe e3-eos-web-staging \
  --region=me-central1 \
  --format="yaml(status.latestReadyRevisionName,status.traffic,spec.template.spec.containers)"

echo ""
echo "=== RAW OUTPUT: gcloud run services describe e3-eos-worker-staging ==="
gcloud run services describe e3-eos-worker-staging \
  --region=me-central1 \
  --format="yaml(status.latestReadyRevisionName,status.traffic,spec.template.spec.containers)"

echo ""
echo "=== RAW OUTPUT: Artifact Registry Image Digests ==="
gcloud artifacts docker images list me-central1-docker.pkg.dev/e3-eos-staging/e3-eos \
  --include-tags \
  --format="table(IMAGE,DIGEST,TAGS)"

echo ""
echo "=== RAW OUTPUT: Public Health Endpoint ==="
curl -s https://e3-eos-api-staging-4m6nzwqkuq-ww.a.run.app/api/v1/health/system
echo ""
