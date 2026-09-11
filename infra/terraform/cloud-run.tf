# --- Service Account for E3-EOS Services ---
resource "google_service_account" "eos_runner" {
  account_id   = "e3-eos-runner-${var.environment}"
  display_name = "E3-EOS Application Runner"
}

# --- Cloud Run: API Service ---
resource "google_cloud_run_v2_service" "api_service" {
  name     = "e3-eos-api-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.eos_runner.email

    scaling {
      min_instance_count = 1
      max_instance_count = 5
    }

    vpc_access {
      connector = google_vpc_access_connector.serverless_connector.id
      egress    = "ALL_TRAFFIC"
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/e3-eos/api:latest"

      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
      }

      ports {
        container_port = 4000
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }
      env {
        name  = "REGION"
        value = var.region
      }
      env {
        name  = "DB_HOST"
        value = google_sql_database_instance.postgres_instance.private_ip_address
      }
      env {
        name  = "DB_PORT"
        value = "5432"
      }
      env {
        name  = "DB_USER"
        value = google_sql_user.app_user.name
      }
      env {
        name  = "DB_NAME"
        value = google_sql_database.database.name
      }
      env {
        name  = "DB_PASSWORD"
        value = google_secret_manager_secret_version.db_password_version.secret_data
      }
      env {
        name  = "DB_SSL"
        value = "true"
      }
      env {
        name  = "REDIS_HOST"
        value = google_redis_instance.redis_cache.host
      }
      env {
        name  = "REDIS_PORT"
        value = tostring(google_redis_instance.redis_cache.port)
      }

      startup_probe {
        http_get {
          path = "/api/v1/health"
          port = 4000
        }
        initial_delay_seconds = 10
        period_seconds        = 10
        failure_threshold     = 6
        timeout_seconds       = 5
      }

      liveness_probe {
        http_get {
          path = "/api/v1/health"
          port = 4000
        }
        period_seconds  = 15
        timeout_seconds = 5
      }
    }
  }
}

# --- Cloud Run: Web Frontend Service ---
resource "google_cloud_run_v2_service" "web_service" {
  name     = "e3-eos-web-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.eos_runner.email

    scaling {
      min_instance_count = 1
      max_instance_count = 5
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/e3-eos/web:latest"

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
      }

      ports {
        container_port = 3000
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "API_URL"
        value = google_cloud_run_v2_service.api_service.uri
      }
    }
  }
}

# --- Cloud Run: Dedicated Background Worker Service ---
resource "google_cloud_run_v2_service" "worker_service" {
  name     = "e3-eos-worker-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_ONLY"

  template {
    service_account = google_service_account.eos_runner.email

    scaling {
      min_instance_count = 1
      max_instance_count = 3
    }

    vpc_access {
      connector = google_vpc_access_connector.serverless_connector.id
      egress    = "ALL_TRAFFIC"
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/e3-eos/worker:latest"

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
      }

      ports {
        container_port = 8080
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "REGION"
        value = var.region
      }
    }
  }
}

# --- IAM: Allow unauthenticated public access to Web & API ---
resource "google_cloud_run_v2_service_iam_member" "api_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api_service.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "web_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.web_service.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# --- IAM: Allow Runner Service Account to access Secret Manager ---
resource "google_project_iam_member" "runner_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.eos_runner.email}"
}
