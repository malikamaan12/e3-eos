terraform {
  required_version = ">= 1.7.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.15.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  type        = string
  description = "Google Cloud Project ID for E3-EOS staging"
  default     = "e3-eos-staging"
}

variable "region" {
  type        = string
  description = "Target primary region (me-central1 Doha, Qatar) for all primary compute, storage, and intra-regional HA"
  default     = "me-central1"
}

variable "enable_cross_region_dr" {
  type        = bool
  description = "Enable optional cross-border secondary DR replication (requires explicit E3 data-residency/client approval)"
  default     = false
}

variable "dr_region" {
  type        = string
  description = "Proposed secondary disaster recovery region (me-central2 Dammam, Saudi Arabia) subject to E3 governance decision"
  default     = "me-central2"
}

variable "environment" {
  type        = string
  description = "Environment name"
  default     = "staging"
}

variable "git_commit" {
  type        = string
  description = "Git commit SHA / immutable container image tag"
  default     = "08fced7d9a7dafe89a5022d0281d944a688fc389"
}

# --- VPC & Private Networking ---
resource "google_compute_network" "vpc" {
  name                    = "e3-eos-vpc-${var.environment}"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "e3-eos-subnet-${var.region}"
  ip_cidr_range = "10.10.0.0/20"
  region        = var.region
  network       = google_compute_network.vpc.id

  private_ip_google_access = true
}

resource "google_vpc_access_connector" "serverless_connector" {
  name          = "e3-eos-connector"
  region        = var.region
  ip_cidr_range = "10.8.0.0/28"
  network       = google_compute_network.vpc.name
}

# --- Private Services Access for Cloud SQL & Redis ---
resource "google_compute_global_address" "private_ip_alloc" {
  name          = "e3-eos-private-ip-${var.environment}"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_alloc.name]
}

# --- Secret Manager Secrets & Versions ---
resource "google_secret_manager_secret" "db_password" {
  secret_id = "e3-eos-db-password-${var.environment}"
  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}

resource "random_password" "db_password" {
  length  = 24
  special = false
}

resource "google_secret_manager_secret_version" "db_password_version" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = random_password.db_password.result
}

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "e3-eos-jwt-secret-${var.environment}"
  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}

resource "random_password" "jwt_secret" {
  length  = 48
  special = false
}

resource "google_secret_manager_secret_version" "jwt_secret_version" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = random_password.jwt_secret.result
}

resource "google_secret_manager_secret" "webhook_hmac_secret" {
  secret_id = "e3-eos-webhook-hmac-${var.environment}"
  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}

resource "random_password" "webhook_hmac_secret" {
  length  = 48
  special = false
}

resource "google_secret_manager_secret_version" "webhook_hmac_secret_version" {
  secret      = google_secret_manager_secret.webhook_hmac_secret.id
  secret_data = random_password.webhook_hmac_secret.result
}
