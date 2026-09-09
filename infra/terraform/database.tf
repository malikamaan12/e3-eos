# --- Cloud SQL: PostgreSQL 17 Regional HA ---
resource "google_sql_database_instance" "postgres_instance" {
  name             = "e3-eos-pg-${var.environment}"
  database_version = "POSTGRES_17"
  region           = var.region

  settings {
    tier              = "db-custom-4-16384" # 4 vCPU, 16 GB RAM
    availability_type = "REGIONAL"         # High availability across zones in me-central1 (Doha, Qatar)

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "02:00"
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 30
      }
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
      ssl_mode        = "ENCRYPTED_ONLY"
    }

    database_flags {
      name  = "log_connections"
      value = "on"
    }
    database_flags {
      name  = "log_disconnections"
      value = "on"
    }
  }

  deletion_protection = true
}

resource "google_sql_database" "database" {
  name     = "e3_eos_production"
  instance = google_sql_database_instance.postgres_instance.name
}

resource "google_sql_user" "app_user" {
  name     = "eos_app"
  instance = google_sql_database_instance.postgres_instance.name
  password = data.google_secret_manager_secret_version.db_password_val.secret_data
}

data "google_secret_manager_secret_version" "db_password_val" {
  secret = google_secret_manager_secret.db_password.id
}
