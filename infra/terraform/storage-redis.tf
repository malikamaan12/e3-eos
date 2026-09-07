# --- Memorystore Redis 7 ---
resource "google_redis_instance" "redis_cache" {
  name           = "e3-eos-redis-${var.environment}"
  tier           = "STANDARD_HA" # Multi-zone failover
  memory_size_gb = 5
  region         = var.region

  authorized_network = google_compute_network.vpc.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"
  redis_version      = "REDIS_7_0"

  transit_encryption_mode = "SERVER_AUTHENTICATION"
}

# --- Cloud Storage Private Regional Buckets ---
resource "google_storage_bucket" "documents" {
  name     = "${var.project_id}-documents-${var.environment}"
  location = var.region

  uniform_bucket_level_access = true
  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }
}

resource "google_storage_bucket" "quarantine" {
  name     = "${var.project_id}-quarantine-${var.environment}"
  location = var.region

  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = 14 # Purge unreleased quarantine items after 14 days
    }
    action {
      type = "Delete"
    }
  }
}

resource "google_storage_bucket" "audit_manifests" {
  name     = "${var.project_id}-audit-manifests-${var.environment}"
  location = var.region

  uniform_bucket_level_access = true
  versioning {
    enabled = true
  }

  retention_policy {
    is_locked        = false # Unlocked initially to prevent accidental permanent lock
    retention_period = 2592000 # 30 days retention policy
  }
}
