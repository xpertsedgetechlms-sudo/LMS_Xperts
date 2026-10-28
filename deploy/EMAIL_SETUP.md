# Password reset email activation

## Selected sender: institute Gmail

Use xpertsedgetechlms@gmail.com with smtp.gmail.com:587 (STARTTLS). Google requires 2-Step Verification to create an App Password; availability can depend on account security settings. Generate a dedicated LMS App Password in that account, not a normal login password. Never share it in chat. Official help: https://support.google.com/mail/answer/185833 and https://support.google.com/mail/answer/7104828

Local Windows: close the existing backend terminal only, then double-click `Start Gmail Backend.cmd`. Enter the App Password in its hidden prompt, followed by the PostgreSQL password when asked. This helper sets SMTP configuration for the backend process only and never saves the password to disk. Keep the frontend running separately. Reset links use http://127.0.0.1:5173 by default and therefore work only on this computer. This launcher also enables delivery of eligible queued learning notifications.

For production, deploy/.env.example now includes the selected Gmail settings. Supply the App Password privately in the SMTP secret described below and use the real HTTPS frontend domain in the deployment environment. Follow the mail overlay instructions. A private, authenticated SMTP credential is still required: this configuration has not sent or verified a real Gmail message.

Code is implemented. Real email delivery is NOT active until the institute supplies an SMTP service. No password is stored in source control. Do not use a normal Gmail account password; obtain the provider's SMTP credential/app password privately.

## Enrolment, assignment and live class notifications

The same SMTP connection now supports transactional learning notifications. Set NOTIFICATIONS_EMAIL_ENABLED=true as well as RECOVERY_ENABLED=true. The optional Docker mail overlay enables both. Without these settings, events stay queued in PostgreSQL; they are not marked sent. Restart Java to apply Flyway V9 and changed settings.

- Active enrolment creation/reactivation/access changes queue a course-access email for that student. Pending, revoked, expired or unpublished-course access does not send an active-access message.
- Assignment creation or changes notify currently active course learners. This is event-based publication/update delivery, not automatic due-date reminders.
- Class scheduling, time/link/title/status changes notify current active batch members (or active course learners for a course-wide class). Cancellation is included. Private meeting links are not included in email; students sign in for the latest details. Adding a learner to a batch later does not replay old class notifications.
- Each event and outbox row are committed with the business save. Rollbacks produce no mail. Repeated identical saves do not enqueue duplicates. Newer changes supersede older queued updates. Eligibility is checked again before sending, so revoked/disabled/expired recipients are skipped.
- The worker processes up to 25 messages every 30 seconds. SMTP failures retry up to five times with increasing delay, then become FAILED. Interrupted claims recover after 15 minutes. Notifications older than seven days are skipped instead of sending stale backlog. Review pending records before first activation.
- Admin Settings includes an Email notifications panel with counts, latest 50 records, failure status and Retry email for failed records. Only administrators can read or retry delivery records; secrets and raw provider exception details are not exposed. Fix SMTP before manually retrying.
- Delivery is at-least-once: an SMTP acceptance followed by a process/database failure can cause a duplicate on retry. A message already being handed to SMTP cannot be recalled. SENT means SMTP accepted it, not confirmed inbox receipt. No external mailbox delivery has been verified yet.
- For retention, the team should archive/purge old SENT/SKIPPED rows under its data policy; retain failures for investigation. PostgreSQL backups include the outbox and message text. Session and queue worker replica scaling need staging validation.

## Configuration

The server reads RECOVERY_ENABLED (default false), PUBLIC_APP_URL (origin only), MAIL_FROM, SMTP_HOST, SMTP_PORT (587), SMTP_USER and SMTP_PASSWORD. PUBLIC_APP_URL must be HTTPS in production; http://localhost or http://127.0.0.1 is allowed only for local development. The application enforces STARTTLS and certificate verification, with finite SMTP timeouts. Choose a STARTTLS-capable provider on port 587; implicit TLS port 465 is not configured.

MAIL_FROM must be an address approved by the mail provider. Configure provider domain verification/SPF/DKIM as required and test inbox/spam delivery. Never place SMTP_PASSWORD in a VITE variable, browser source, Git commit or chat.

## Docker production

1. Add MAIL_FROM, SMTP_HOST, SMTP_PORT and SMTP_USER to the private deploy/.env.production.
2. Save the SMTP credential into deploy/secrets/smtp_password.txt using the server's secure editor. Keep the parent secrets directory at mode 700 and the file at mode 444 (readable inside the non-root container). Do not put the secret in a shell command saved to history.
3. Enable the optional mail overlay:

```sh
docker compose --env-file deploy/.env.production -f compose.production.yaml -f deploy/compose.mail.yaml config --quiet
docker compose --env-file deploy/.env.production -f compose.production.yaml -f deploy/compose.mail.yaml up -d --build
```

Use the SAME file pair on future updates or mail settings will be removed. All relative paths resolve from the root compose file. SMTP_PASSWORD is mounted as a secret and read through Spring configtree. Existing database records and uploads remain in the database volume.

For local use, set configuration in the backend process environment before launching. Restart the backend to apply settings and Flyway V8. Do not enable email with the wrong PUBLIC_APP_URL: the link must point to the frontend URL accessible to the recipient. Local links only work on that computer.

## Flow and verification

- Forgot password accepts an email for any role; public responses do not reveal whether the account exists.
- Delivery runs on a bounded background queue. A generic accepted response is not a guarantee of SMTP delivery. Without configured mail, the endpoint returns a clear unavailable response.
- Only SHA-256 token hashes are stored. Raw 256-bit random tokens appear only in the delivered email link and browser state, not API responses or application logs. The link uses a fragment so its token is not sent as a server request URL/referrer.
- Links expire in 30 minutes, work once, and a newly issued link invalidates the previous one. A 60-second account cooldown limits repeated mail. HTTP endpoints have CSRF and per-process request limits. For multiple replicas add shared throttling and a shared session store; behind a reverse proxy current IP limits can be shared across clients.
- Password policy: at least 12 characters and at most 72 UTF-8 bytes. Reset does not sign the account in automatically. Existing browser sessions are revoked on their next request, including sessions on other devices.
- Disabled accounts cannot reset. Unknown/disabled accounts receive the same accepted response. SMTP failures remove the matching token and log only a generic warning; no token/password/email body is logged. Requests are not durable across process restarts: retry if no mail arrives.

After activation, use a controlled institute test account: request the link, open it, check password mismatch handling, set a new password, confirm old-password rejection/new-password login, old-session rejection and link-reuse rejection. Verify actual email arrival. Automated backend tests mock the mail sender; they do not prove external mailbox delivery.

Reference: https://docs.spring.io/spring-boot/reference/io/email.html and https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
