# --- Terraform Outputs for E3-EOS Infrastructure ---

output "region" {
  description = "Target deployment region in Google Cloud (Doha, Qatar)"
  value       = var.region
}

output "vpc_network_id" {
  description = "VPC Network ID"
  value       = google_compute_network.vpc.id
}

output "api_service_url" {
  description = "Public URL of the E3-EOS Cloud Run API Service"
  value       = google_cloud_run_v2_service.api_service.uri
}

output "web_service_url" {
  description = "Public URL of the E3-EOS Cloud Run Web Frontend Service"
  value       = google_cloud_run_v2_service.web_service.uri
}

output "worker_service_name" {
  description = "Internal Cloud Run Worker Service Name"
  value       = google_cloud_run_v2_service.worker_service.name
}

output "cloud_sql_instance_name" {
  description = "Regional HA PostgreSQL 17 Cloud SQL instance name"
  value       = google_sql_database_instance.postgres_instance.name
}

output "cloud_sql_private_ip" {
  description = "Private IP address for Cloud SQL instance within VPC"
  value       = google_sql_database_instance.postgres_instance.private_ip_address
}

output "redis_host" {
  description = "Private IP address of Memorystore Redis instance"
  value       = google_redis_instance.redis_cache.host
}

output "redis_port" {
  description = "Port of Memorystore Redis instance"
  value       = google_redis_instance.redis_cache.port
}

output "storage_buckets" {
  description = "Names of private regional Cloud Storage buckets"
  value = {
    documents       = google_storage_bucket.documents.name
    quarantine      = google_storage_bucket.quarantine.name
    audit_manifests = google_storage_bucket.audit_manifests.name
  }
}
