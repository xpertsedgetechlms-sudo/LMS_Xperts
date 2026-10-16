# XpertsEdge LMS

Learning portal frontend for XpertsEdge Technologies, built with React and Vite.

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

This is a frontend for review, not a production service. Role and account selectors are for navigation/testing and do not enforce authentication. Secure sign-in, account creation, email delivery, server-enforced permissions, shared private storage and verified online payments require backend integration.

Workspace records persist in browser local storage. Uploaded files are saved separately in IndexedDB, with a 20 MB per-file limit. Other browsers/devices have independent data. JSON backups include records, not uploaded file contents.

Course requests stay in the browser and do not send a message, collect money or activate course access. Fee receipts and certificates are frontend records and require institute verification for official use. Policy drafts and actual course content need institute review before launch.

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
