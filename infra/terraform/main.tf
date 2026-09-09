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
  description = "Google Cloud Project ID for E3-EOS production"
  default     = "e3-eos-production"
}

variable "region" {
  type        = string
  description = "Target primary region (me-central1 Doha, Qatar)"
  default     = "me-central1"
}

variable "dr_region" {
  type        = string
  description = "Secondary disaster recovery region (me-central2 Dammam, Saudi Arabia)"
  default     = "me-central2"
}

variable "environment" {
  type        = string
  description = "Environment name"
  default     = "production"
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

# --- Secret Manager ---
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
