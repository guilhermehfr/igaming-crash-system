#!/bin/bash

# Development only — creates isolated PostgreSQL databases for each service.
# In production, databases are provisioned via Terraform (e.g, aws_db_instance)
# before deployment. This script is not executed in production environments.

set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "SELECT 1;" > /dev/null 2>&1 && echo "Postgres is ready"

for db in games wallets keycloak; do
  echo "Creating database: $db"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -tc "SELECT 1 FROM pg_database WHERE datname = '$db'" | grep -q 1 || \
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "CREATE DATABASE $db;"
  echo "Database '$db' ready."
done
