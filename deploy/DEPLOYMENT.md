# XpertsEdge production handover

Prepared for the deployment team. This configuration has NOT been deployed to a live server. Local frontend build and configuration validation are recorded separately; Docker is not installed on the development machine, so container startup must be verified on staging.

## Architecture

Internet HTTPS -> Caddy (React production files and /api proxy) -> Spring Boot -> PostgreSQL 18.
Only Caddy publishes ports. Java and PostgreSQL are private to the Compose network. Java uses the non-superuser xpertsedge database role. Files uploaded through the backend are stored in PostgreSQL, so the database archive includes these files. Browser-only local storage is NOT migrated by a database backup.

One backend instance is intended. Sessions are in memory: restarting Java signs users out. Configure a shared session store before scaling to multiple backend instances.

## Required from the deployment team

- A Linux host with Docker Engine and Docker Compose v2; Docker service enabled at boot.
- Chosen LMS hostname, DNS access, server IP, and inbound TCP 80/443 (UDP 443 optional for HTTP/3). Do not expose 5432 or 8080 publicly.
- Private transfer/storage of the database archive. Server disk capacity must cover database files, uploads, backups and growth.
- Scheduled backups, off-server retention, uptime monitoring and a tested restoration procedure.

No hosting account, server address, DNS credentials or final hostname has been supplied. lms.example.com is a placeholder, not a live URL.

## 1. Build and configure on the server

From the repository root:

```sh
cp deploy/.env.example deploy/.env.production
# Edit LMS_DOMAIN and ACME_EMAIL in deploy/.env.production first.
mkdir -p deploy/secrets
chmod 700 deploy/secrets
umask 077
openssl rand -hex 32 > deploy/secrets/db_password.txt
openssl rand -hex 32 > deploy/secrets/postgres_password.txt
chmod 444 deploy/secrets/*.txt
docker compose --env-file deploy/.env.production -f compose.production.yaml config --quiet
docker compose --env-file deploy/.env.production -f compose.production.yaml build
```

Generate these passwords only on FIRST setup. Replacing the files does not rotate an existing PostgreSQL account password. Do not commit/copy secrets into images or frontend VITE variables. Keep the parent secrets directory mode 700: the files need to be readable inside the non-root Java container because Compose file-backed secrets retain host permissions. The private parent directory prevents other host users from traversing it. Compose secrets are host files; protect the host and private backups. The app reads DB_PASSWORD through Spring configtree. No local HTTP profile is enabled in production; Secure/HttpOnly/SameSite=Lax session cookies remain enabled.

The Dockerfiles build the React app with npm ci and npm run build, and Java with Maven on JDK 21. Runtime uses a JRE and a non-root application user. Image major tags should be resolved to tested digests by the deployment team for repeatable releases.

## 2. Migrate the existing database BEFORE starting the backend

On the Windows development machine, stop writes during the final cutover and run this from the project root:

```powershell
.\backend\scripts\backup-database.ps1
```

It prompts for the existing local database password and writes a private .dump archive under backend/backups. Transfer the archive privately to the server, e.g. /secure/xpertsedge.dump. Never upload it to a public GitHub repository. PostgreSQL 18 restore tools are provided in the database container.

On a NEW production volume, start the database only:

```sh
docker compose --env-file deploy/.env.production -f compose.production.yaml up -d db
docker compose --env-file deploy/.env.production -f compose.production.yaml ps
```

Wait until db is healthy. A fresh database has an empty public schema but no LMS tables. Restore ONLY into this empty destination; do not start Java first because Flyway will create tables. Never use this sequence against an existing live database.

```sh
docker compose --env-file deploy/.env.production -f compose.production.yaml cp /secure/xpertsedge.dump db:/tmp/import.dump
docker compose --env-file deploy/.env.production -f compose.production.yaml exec -T db pg_restore --exit-on-error --no-owner --no-privileges --role=xpertsedge --username=postgres --dbname=xpertsedge_lms /tmp/import.dump
docker compose --env-file deploy/.env.production -f compose.production.yaml exec -T db psql -U postgres -d xpertsedge_lms -c "SELECT version, success FROM flyway_schema_history ORDER BY installed_rank;"
docker compose --env-file deploy/.env.production -f compose.production.yaml exec -T db psql -U postgres -d xpertsedge_lms -c "SELECT count(*) AS accounts FROM app_users; SELECT count(*) AS courses FROM courses;"
docker compose --env-file deploy/.env.production -f compose.production.yaml exec -T db rm /tmp/import.dump
```

Record source/destination row counts privately and compare accounts, enrolments and uploaded-file sizes as well. Existing administrator credentials are retained by the restore; do not bootstrap or recreate the administrator. After Java starts, Flyway validates/restores the current schema and applies any newer migrations. Do not edit historical Flyway migrations or disable validation to hide an error.

If restore fails partway, keep the backend stopped. Diagnose the failure and restore into a separately created EMPTY staging database; do not repeatedly import over partial tables. For a blank installation without a source backup, arrange secure initial-admin bootstrap with the team; no default admin password is shipped.

## 3. Start production and HTTPS

Point the hostname's A record at the server; add AAAA only if IPv6 is configured. Then:

```sh
docker compose --env-file deploy/.env.production -f compose.production.yaml up -d
docker compose --env-file deploy/.env.production -f compose.production.yaml ps
docker compose --env-file deploy/.env.production -f compose.production.yaml logs --tail=100 backend web
```

Caddy requests and renews HTTPS certificates when DNS and ports are reachable. Its /data and /config volumes persist certificate state. Keep TLS termination here; do not add another proxy without reviewing trusted forwarded headers and cookie behavior. ALLOWED_ORIGINS is the exact https:// hostname. All browser API calls stay on /api; the proxy preserves the /api prefix. No JavaScript API keys or database passwords are required.

Restart policy restarts containers on failure and Docker restart unless manually stopped. The team must verify host reboot recovery. Do not use npm run dev, Vite preview, or the Windows launcher on production.

## 4. Release verification

Replace the sample hostname below with the configured hostname:

```sh
curl --fail https://lms.example.com/api/health
curl --fail https://lms.example.com/api/courses
curl --fail https://lms.example.com/api/auth/csrf
```

Verify in an actual HTTPS browser: Admin/Trainer/Student login, server-assigned role, logout, course editing, enrolment, private PDF/upload/download, assignment grading, quiz attempt, certificate record download, profile reload and mobile navigation. Confirm the session cookie has Secure and HttpOnly flags. An unauthenticated /api/auth/me returns 401 by design; it is not a health failure.

Check that ports 8080/5432 cannot be reached externally and uploads survive container recreation. Test server reboot and backup restoration on staging before learner rollout. Monitor health; restart policies alone do not repair an application that remains running but unhealthy.

## 5. Backups, updates and rollback

Use a private host directory with mode 700; back up before every release. For a running deployment (Linux shell):

```sh
mkdir -p /secure/lms-backups
chmod 700 /secure/lms-backups
umask 077
docker compose --env-file deploy/.env.production -f compose.production.yaml exec -T db pg_dump -U postgres -d xpertsedge_lms -Fc > /secure/lms-backups/lms-$(date +%Y%m%d-%H%M%S).dump
```

Check the exit code and pg_restore --list output before accepting an archive; failed commands can leave incomplete files. Schedule this with the team's scheduler, encrypt off-server copies and define retention. Back up Caddy volumes/configuration and keep secrets in the team's secret manager separately. A volume is persistence, not a backup.

Tag each deployed Git revision/container image. Before updates take a verified backup, build the reviewed revision and run compose up -d. Do not assume rolling back Java also rolls back the database. For incompatible migrations restore the pre-release backup into a separate database and follow a tested maintenance plan. Never run docker compose down -v on the live deployment: that deletes persistent volumes.

## Pending product services

Password recovery code is implemented; activate SMTP using [EMAIL_SETUP.md](EMAIL_SETUP.md) and the optional mail overlay. Real mailbox delivery still requires provider configuration and verification. Live payment provider and a designed PDF certificate remain separate unfinished services. Review institute policy text before publishing.

## Reference documentation

- PostgreSQL official container and PostgreSQL 18 volume layout: https://hub.docker.com/_/postgres
- Compose readiness dependencies: https://docs.docker.com/compose/how-tos/startup-order/
- Caddy proxy behavior: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
