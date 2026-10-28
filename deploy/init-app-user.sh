#!/bin/sh
# Sourced by the official PostgreSQL entrypoint on a new database volume only.
set -eu
LMS_APP_PASSWORD="$(cat /run/secrets/DB_PASSWORD)"
export LMS_APP_PASSWORD
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
\getenv app_password LMS_APP_PASSWORD
CREATE ROLE xpertsedge LOGIN PASSWORD :'app_password' NOSUPERUSER NOCREATEDB NOCREATEROLE;
ALTER DATABASE xpertsedge_lms OWNER TO xpertsedge;
GRANT USAGE, CREATE ON SCHEMA public TO xpertsedge;
SQL
unset LMS_APP_PASSWORD
