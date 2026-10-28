# XpertsEdge LMS

Learning portal frontend for XpertsEdge Technologies, built with React and Vite.

## Production deployment

Certificates now download as server-generated branded PDFs: see [certificate behavior and limits](docs/CERTIFICATES.md). Policy drafts and approval steps are in [institute review handover](docs/policy-review/REVIEW-AND-APPROVAL.md). Admin Settings is the source for draft review/publication; policies remain unpublished until an authorised institute admin approves them. Restart the backend for V10 and new endpoints.

Password recovery: [SMTP activation and verification](deploy/EMAIL_SETUP.md). The code includes expiring single-use links and session revocation. Email sending is disabled until SMTP is configured; no default mail credentials are shipped.

Learning emails: enrolment access, assignment changes and live-class updates use a PostgreSQL outbox with retries and access checks. Admin Settings shows email status. Activate `NOTIFICATIONS_EMAIL_ENABLED` and SMTP as described in the same guide. Delivery is not active or inbox-tested without the institute mail provider.

Deployment team: follow [production handover](deploy/DEPLOYMENT.md). The root `compose.production.yaml` builds React/Caddy and the Java backend, keeps PostgreSQL persistent, and provides same-origin HTTPS API routing. Configure real DNS and private secrets on the server. Restore the existing database before the first backend startup. This package has not been deployed to a live host; staging container verification is still required.

## Spring Boot backend

The `backend/` directory now contains the first Spring Boot/PostgreSQL increment: session authentication, role permissions, users, courses and enrolment access. See [backend setup and API guide](backend/README.md).

The existing UI still uses its browser workspace store. The backend is not yet the data source for all frontend modules. Its migrations and security tests are separate from the frontend checks below. A real PostgreSQL instance and initial administrator setup are required to run it locally.

## Run locally

Use Node.js 24 and npm. In the project directory:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open the Local URL printed by Vite. No environment variables are required for the current frontend.

## Workspaces

- Admin: people, courses, curriculum, enrolments, batches, classes, assignments, quizzes, grading, attendance, manual fee records, certificates, reports and settings.
- Trainer: assigned courses, learners, teaching content, assessment, attendance and reports.
- Student: course exploration, lessons, progress, assignments, quizzes, attendance, My Fees & Receipts and certificates.

Course cards include optimised cover images and the supplied PDF brochures. The English help assistant provides catalogue and LMS guidance. Its WhatsApp handoff prepares a message for the user to review and send.

## Current integration status

Spring Boot/PostgreSQL now provides student registration, session login/logout and server-authoritative roles. Admin account management, courses/enrolments, batches/membership, live sessions, attendance, private files, assignments/submissions and grading have dedicated database-backed UI pages. See `backend/README.md` for setup and tested access rules.

The official administrator still needs to be created using secure terminal prompts, and migration V7 needs application via backend restart against the local PostgreSQL server after restart. Automated backend tests use an isolated test database.

Lessons, quizzes/progress, certificate records, manual fees/receipts, announcements, reports and contact settings also have database-backed pages. Profile and Activity history are also connected through migration V7. Browser/device records are not automatically imported into database history. They do not create verified payments or official records. Old device records/files are not automatically migrated to PostgreSQL. Payment gateway and password-reset email delivery are not connected. Institute content/policies need review before launch.

## Validation

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

## Deployment

Build with `npm run build` and serve the contents of `dist/` over HTTPS. For Vercel, use the Vite framework preset, build command `npm run build` and output directory `dist`. Basic response headers are supplied in `vercel.json` and `public/_headers`.

The application uses hash routes. A frontend deployment does not activate backend authentication, shared data or payments. Confirm institute content, pricing, policies and live class links, then test the hosted environment before real student use.

## Repository contents

Environment files, `node_modules`, build output, local archives and obsolete backend/authentication experiments are excluded. Only the current test scripts under `work/` are included. Do not commit credentials, learner exports or private uploads.
