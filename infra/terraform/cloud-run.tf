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
      min_instance_count = 2 # High availability guarantee
      max_instance_count = 20
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
        name  = "REGION"
        value = var.region
      }

      startup_probe {
        http_get {
          path = "/api/v1/health"
          port = 4000
        }
        initial_delay_seconds = 5
        period_seconds        = 10
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/api/v1/health"
          port = 4000
        }
        period_seconds = 15
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
      min_instance_count = 2
      max_instance_count = 10
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
      max_instance_count = 5
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
