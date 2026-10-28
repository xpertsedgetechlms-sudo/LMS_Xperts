# XpertsEdge LMS backend

Spring Boot 4.1.1, Java 21 target, Spring Security, Spring Data JPA, PostgreSQL and Flyway. Implements identity, course/enrolment access and teaching delivery with connected frontend modules. Remaining modules still use the browser store.

## Implemented

- Student-only public registration and BCrypt password hashing.
- Cookie sessions, session ID rotation on login, CSRF tokens and POST logout.
- Server-side Admin, Trainer and Student endpoint restrictions.
- Admin user create/list/edit/disable and a one-time environment-based initial administrator.
- Course create/edit, batches/membership, live sessions and attendance.
- Private database file uploads/downloads, assignments, submissions, grading and grade history.
- Published course catalogue, trainer course assignment queries, own student enrolments and access checks.
- Admin enrolment creation/review, revocation and expiry in Asia/Kolkata.
- Flyway schema and six-course catalogue migrations; no sample users or default passwords.
- Validation, safe error responses, exact-origin credentialed CORS and per-process login/registration throttling.

## Prerequisites

Use a maintained JDK 21+ and PostgreSQL 18. The project targets Java 21. Maven Wrapper is included; a global Maven installation is optional. Docker Compose can run PostgreSQL if Docker is installed, but Docker is not required if you install PostgreSQL directly.

No PostgreSQL server was installed or configured automatically. Integration tests use a separate in-memory H2 database in PostgreSQL mode. Run the same migrations and tests against real PostgreSQL before production release.

## Database setup

In PostgreSQL, create a dedicated login role and an owned database using your local database administration tool. Set a private password yourself; do not put it in chat, Git or SQL files.

```sql
CREATE ROLE xpertsedge LOGIN;
-- Set the role password securely in your database administration tool.
CREATE DATABASE xpertsedge_lms OWNER xpertsedge;
```

Alternatively, export a strong `DB_PASSWORD` in your terminal and run `docker compose -f backend/compose.yml up -d`. The database port is bound only to 127.0.0.1. Keep the named volume; removing it deletes local database records.

Default connection: `jdbc:postgresql://localhost:5432/xpertsedge_lms`, user `xpertsedge`. Override with `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` environment variables. `backend/.env.example` is a reference; Spring Boot does not load `.env` automatically.

Flyway applies migrations at startup. Hibernate validates the resulting schema; it does not create or overwrite tables automatically. Existing browser data is not imported into this database.

## Start locally on Windows

From the project root:

```powershell
.\backend\scripts\start-local.ps1 -BootstrapAdmin
```

The script asks for the database password and initial administrator password securely. Initial email defaults to `xpertsedgetechlms@gmail.com`; use `-AdminEmail` to change it. Passwords must be at least 12 characters and at most 72 UTF-8 bytes. The first administrator is created only when none exists. An existing student account is never promoted by bootstrap.

Later starts:

```powershell
.\backend\scripts\start-local.ps1
```

The backend listens on `http://127.0.0.1:8080`. Local profile allows HTTP session cookies only for local development. The default profile uses Secure cookies for HTTPS. Keep real hosted frontend/backend behind the same HTTPS origin, and configure the allowed origins and reverse proxy explicitly. Do not use the local profile for an HTTP public deployment.

## Endpoint map

| Method | Path | Permission |
|---|---|---|
| GET | /api/health | Public |
| GET | /api/auth/csrf | Public; creates session token |
| POST | /api/auth/register | Public; always Student |
| POST | /api/auth/login | Public; valid credentials and CSRF required |
| GET | /api/auth/me | Signed in |
| POST | /api/auth/logout | CSRF required |
| GET | /api/courses | Public published catalogue |
| GET | /api/courses/{id}/access | Signed in; ownership/enrolment check |
| GET, POST | /api/admin/users | Admin |
| GET, POST | /api/admin/courses | Admin |
| GET, POST | /api/admin/enrolments | Admin |
| PUT | /api/admin/enrolments/{id} | Admin |
| GET | /api/trainer/courses | Trainer; assigned courses |
| GET | /api/student/enrolments | Student; own records only |

Unknown endpoints are denied. An incoming role field cannot elevate a public registration. Course access requires a published course and active, unexpired enrolment for Students; an active account is also required. Expiry remains valid through its specified day in IST. Trainers can inspect assigned courses; Admin can inspect any course.

### Browser request sequence

1. GET `/api/auth/csrf` with credentials included.
2. Include the returned `headerName` and `token` in a POST/PUT/DELETE request, alongside the session cookie.
3. Login with JSON `{ "email": "...", "password": "..." }`.
4. Fetch a fresh CSRF token after successful login or logout. Login rotates the session identifier and clears the previous token.
5. Use `/api/auth/me` as the source of the signed-in role. Never trust localStorage or a role dropdown for permissions.

`src/backendClient.js` implements the client-side cookie/CSRF sequence. Vite proxies `/api` to the local backend. Login, session restore, logout, account management, courses/enrolments and teaching-delivery screens are connected. Workspace permissions come from the server account. Other modules still use device storage and are marked accordingly.

## Tests and build

```powershell
cd backend
.\mvnw.cmd test
.\mvnw.cmd package
```

Tests run with the `test` profile and test-scoped H2; production has no in-memory database fallback. HTTP tests cover registration privilege rejection, password hashing, CSRF, authentication, logout, role denial, assigned trainer access, student isolation, duplicate enrolments, expiry, revocation and unpublished-course access. A separate test covers rate limiting and recovery.

## Teaching delivery (migration V3)

The signed-in UI uses PostgreSQL for course create/edit and trainer assignment, enrolment activation/revocation/expiry, batches and enrolled batch members, class scheduling/edit/cancellation, attendance, resources, assignments, submissions, grading and grade history. Trainer access is restricted to currently assigned courses. Students need active unexpired enrolment in a published course; batch classes additionally require membership. Disabled accounts cannot use these APIs.

- `PUT /api/admin/users/{id}` edits non-admin name/email/access; role escalation is rejected.
- `PUT /api/admin/courses/{id}` edits course fields; IDs are immutable.
- `GET /api/workspace/courses` returns accessible courses.
- `GET /api/workspace/learners` returns scoped enrolled learners to teachers/admins.
- `GET, POST /api/workspace/batches`; `PUT /batches/{id}`; `PUT /batches/{id}/members`.
- `GET, POST /api/workspace/sessions`; `PUT /sessions/{id}`. Meeting URLs must use HTTPS.
- `GET, POST /api/workspace/attendance`. Students can only read their own records.
- `GET, POST /api/workspace/assignments`; `PUT /assignments/{id}`.
- `POST /api/workspace/files` uses multipart `courseId`, `file`, and `assignmentId` for student submissions.
- `GET /api/workspace/files/{id}` checks access before returning private bytes.
- `GET, POST /api/workspace/resources` attaches teacher uploads to a course.
- `GET, POST /api/workspace/submissions`; `PUT /submissions/{id}/grade`; `GET /submissions/{id}/history`.

Files are limited to 20 MB and stored in PostgreSQL BYTEA. Supported types: PDF, MP4, WebM, TXT, PNG, JPEG, ZIP; binary types have header checks and downloads use attachment/no-store/nosniff headers. This implementation suits small resources; large recordings need a later object-storage/streaming integration. Submitted files are private to the submitting student and assigned teacher/admin. Graded submissions cannot be replaced. Grade changes are recorded in a separate history table. Late submissions are timestamped and displayed rather than silently rejected.

### Create and verify the real administrator

Stop the current backend first. From `backend/`:

```powershell
.\scripts\start-local.ps1 -BootstrapAdmin
```

Enter database and administrator passwords only into the secure terminal prompts. The initial email defaults to `xpertsedgetechlms@gmail.com`. Startup applies migrations automatically. In another terminal:

```powershell
.\scripts\verify-admin.ps1
```

The verification script checks login, session identity and the admin course endpoint, then signs out its verification session. It never prints the password. Existing administrator accounts are not replaced. An existing student account is not silently promoted; bootstrap will explain an email conflict.

### Verification boundaries and remaining work

Automated HTTP tests use isolated H2 in PostgreSQL compatibility mode, including V1–V7 migrations and the full teaching flow; these tests do not touch the user's database. The A separate full HTTP workflow has now also passed against actual local PostgreSQL in a temporary schema. Applying V7 to the live public schema requires restarting the existing backend. The official administrator account has been created; browser login requires the administrator's own password. Frontend build/lint and existing logic/client checks are also run.

Learning and operations integrations are documented below. Live payments, email recovery and production deployment remain pending. Existing browser records are not automatically migrated into database records. Public deployment still requires HTTPS routing, backups, session persistence, production configuration and end-to-end verification.


## Learning and institute operations (V4–V6)

Connected pages now include Lessons/Curriculum, Quiz builder/Quizzes, My progress, Certificates, fee accounts/manual receipts, Announcements, Reports and institute contact Settings. Notifications are derived from database announcements and submission/grade events, with per-account read state. The help chat reads the current public catalogue and contact settings and never queries private account data.

Quiz answers are omitted from student responses; scoring and attempt limits run on the server under a quiz row lock. Published questions cannot be edited after an attempt; teachers can change visibility or create a replacement quiz. Submitted attempts count toward the limit; there is no assessment timer. Completing lessons is idempotent and scoped to the current enrolled student.

Certificates require all published lessons complete, all published quizzes passed (at least one quiz), and >=50/100 on each course assignment. Only an administrator can issue/revoke a certificate. The UI downloads a text certificate record; a designed PDF certificate is not implemented. Issued certificates are immutable name/course snapshots with a unique code and revocation status.

Fee records are manual institute entries. Receipts do not charge a card/UPI account and do not unlock courses. Server-side invoice locks prevent overpayment; reference IDs are unique; receipt corrections preserve the old record with a reason. Student fee access is own-account only; Trainers cannot inspect fee records. A missing fee account assumes no balance.

### Remaining external setup

- Official administrator password entry and local PostgreSQL migration/flow verification are still required. Test administrators exist only in isolated test databases.
- The institute does not yet have a Razorpay merchant account. Online payment order creation, verification/webhooks and live activation remain unimplemented until a provider is selected/configured. Do not treat manual receipts as gateway verification.
- SMTP/provider details have not been supplied. Password-reset email and outbound email notifications are not implemented; no reset emails are sent.
- Domain/hosting/HTTPS routing and production session persistence remain to be configured. No deployment or live backup has been performed by these tests.
- Profile and Activity history are now database-backed (V7); deployment/content/policy review and mobile end-to-end QA remain pending.

### Database backup

From `backend/`, run `./scripts/backup-database.ps1`. It prompts privately and writes a custom-format pg_dump archive under ignored `backend/backups/`. PostgreSQL-stored file contents are included. Copy backups to a private off-machine destination and verify a restore into a separate empty database using pg_restore; never test a restore over the live database. The script has been syntax checked but has not been run against the user's database, because its password has not been supplied through a local prompt.

### API additions

- `/api/workspace/learning/lessons` GET/POST; `/{id}` PUT; `/{id}/complete` POST.
- `/api/workspace/learning/quizzes` GET/POST; `/{id}` PUT; `/{id}/visibility` PUT; `/{id}/attempts` POST.
- `/api/workspace/learning/attempts`, `/progress`, `/certificates` GET; `/certificates` POST; `/certificates/{id}` PUT.
- `/api/public/settings` GET; `/api/admin/settings` PUT.
- `/api/workspace/reports`, `/announcements`, `/notifications` GET; `/announcements` POST; `/notifications/{id}/read` POST.
- `/api/workspace/fees` GET/POST; `/{id}` PUT; `/receipts` POST; `/receipts/{id}/void` PUT.


## Profiles, activity and actual PostgreSQL workflow (V7)

- `GET/PUT /api/workspace/profile` reads/updates only the authenticated account's name, phone, bio and trainer specialisation. Login email/role are read-only in this endpoint; unknown ID/role fields are rejected. Updated names are reflected in session identity and the frontend without changing role.
- `GET /api/admin/activity?page=0&size=25&search=` provides paginated, searchable database activity. Successful authenticated POST/PUT/PATCH/DELETE workspace/admin requests are recorded by an interceptor after controller completion; registration/login requests, read requests, failed mutations, notification-read updates, request bodies, cookies, passwords and uploaded content are excluded. Recording failures are logged server-side; this history is not an atomic financial ledger. There are no edit/delete endpoints. Older browser history is not imported as verified activity.
- The verification test creates a dedicated test administrator, then uses HTTP APIs to create a Trainer and Student, enrol the student, assign a batch, create/join-read a class, mark attendance, upload/download notes, submit and grade an assignment, complete a lesson, pass a quiz, issue/read a certificate, save/re-read the profile from another session, and check role/ownership restrictions and safe activity records.
- Actual PostgreSQL verification uses an automatically created `lms_verify_<random>` schema in `xpertsedge_lms`; the test validates the schema name and removes only that schema afterwards. The real public records are not used or modified by this test. The real administrator account remains separate from the temporary test administrator.
- Re-run with `./scripts/verify-workflow.ps1` from `backend/`. It prompts for the database password only, uses a random test account password, and does not require the real Admin password. A real PostgreSQL HTTP workflow pass is different from a browser/mobile end-to-end pass; visual and click-flow testing remains separate.
