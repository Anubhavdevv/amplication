provider "google" {
  project = var.project
  region  = var.region
}


resource "google_cloud_run_service" "default" {
  name     = "${var.app_id}-server"
  location = var.region

  template {
    spec {
      containers {
        image = var.image_id
        env {
          name  = "NODE_ENV"
          value = "production"
        }
        env {
          name  = "POSTGRESQL_URL"
          value = "postgresql://${var.database_user}:${var.database_password}@127.0.0.1/${var.database_name}?host=/cloudsql/${var.project}:${var.region}:${var.database_instance}"
        }
      }
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale" : 1
        "run.googleapis.com/cloudsql-instances" = "${var.project}:${var.region}:${var.database_instance}"
        "run.googleapis.com/client-name"        = "terraform"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  autogenerate_revision_name = true
}

locals {
  cloud_build_configuration = {
    steps : [
      {
        name : "gcr.io/cloud-builders/docker"
        args : ["pull", "gcr.io/cloudsql-docker/gce-proxy:1.11"]
      },
      {
        name : "gcr.io/cloud-builders/docker"
        args : [
          "run",
          "-d",
          "--network=cloudbuild",
          "-v",
          "/cloudsql:/cloudsql",
          "gcr.io/cloudsql-docker/gce-proxy:1.11",
          "/cloud_sql_proxy",
          "-dir=/cloudsql",
          "-instances=$PROJECT_ID:$_REGION:$_DB_INSTANCE",
        ]
      },
      {
        name : "gcr.io/cloud-builders/docker",
        args : [
          "run",
          "--network=cloudbuild",
          "-v",
          "/cloudsql:/cloudsql",
          "--env",
          "POSTGRESQL_URL=postgresql://$_POSTGRESQL_USER:$_POSTGRESQL_PASSWORD@localhost:5432/$_POSTGRESQL_DB?host=?host=/cloudsql/$PROJECT_ID:$_REGION:$_DB_INSTANCE",
          "$_IMAGE_ID",
          "npm",
          "run",
          "db:init",
        ]
      }
    ]
  }
}

module "cloud_build_build" {
  source        = "../cloud-build-build"
  configuration = local.cloud_build_configuration
  substitutions = [
    "_IMAGE_ID=${var.image_id}",
    "_REGION=${var.region}",
    "_DB_INSTANCE=${var.database_instance}",
    "_POSTGRESQL_USER=${var.database_user}",
    "_POSTGRESQL_PASSWORD=${var.database_password}",
    "_POSTGRESQL_DB=${var.database_name}"
  ]
}


resource "null_resource" "local_gcloud" {
  provisioner "local-exec" {
    # Assumption: the module is running inside a terraform docker container (bashed on alpine linux)
    command = <<EOF
set -e;
apk add --update \
  python3 \
  curl \
  bash;
ln -sf python3 /usr/bin/python;
cat <<'EOT' > cloudbuild.yaml
${yamlencode(local.cloud_build_configuration)}
EOT
curl https://sdk.cloud.google.com | bash;
export PATH=$PATH:$HOME/google-cloud-sdk/bin;
gcloud builds submit --no-source --config cloudbuild.yaml --substitutions _IMAGE_ID=${var.image_id},_REGION=${var.region},_DB_INSTANCE=${var.database_instance},_POSTGRESQL_USER=${var.database_user},_POSTGRESQL_PASSWORD=${var.database_password},_POSTGRESQL_DB=${var.database_name};
    EOF
  }
}

resource "google_cloud_run_domain_mapping" "default" {
  location = var.region
  name     = var.domain

  metadata {
    namespace = var.project
    annotations = {
      "run.googleapis.com/launch-stage" = "BETA"
    }
  }

  spec {
    route_name = google_cloud_run_service.default.name
  }
}
