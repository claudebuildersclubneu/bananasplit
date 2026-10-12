# Accounts: sign-up, email verification, password reset and sessions

How a person gets an account, proves their email, recovers a forgotten
password, and how their sessions end. Everything here runs on the identity
plane (`app_auth`), which only it can read: `User`, `Account`,
`UserCredential`, `VerificationToken` and `PasswordResetToken`.

## Sign-up and sign-in

- **Google** (`openid email profile` only) or **email and password**. A
  Google sign-in counts as verified when Google says the address is; it links
  to an existing account with the same verified address, and an unverified
  password account squatting on that address is deleted first, or loses its
  password and every session if it already joined a club
  (`src/lib/auth/google-linking.ts`).
- **Passwords** (`src/lib/auth/password-policy.ts`): at least 8 characters
  and at most 72 bytes, bcrypt's real limit, so nothing is silently cut. No
  composition rules. bcrypt cost 12. The forms show a three-segment strength
  meter (a guide only).
- **Limits**: sign-in 120 per IP and 10 per address per 15 minutes; sign-up
  40 per IP and 3 per address per hour. An address with no password is
  refused as slowly as a wrong password (a real bcrypt comparison against a
  fixed hash), so timing doesn't reveal accounts.

## Email verification

1. Sign-up creates the account unverified and queues a `verify-email` job,
   which mints a 256-bit token, stores only its SHA-256 in
   `VerificationToken`, and mails the link (24 hours).
2. Opening `/verify-email/<token>` only checks the token, so mail scanners
   can't spend it. **Confirm email** (a POST) spends it, and only for the
   signed-in account the link was sent to: signed out, the page asks for a
   log-in and comes back. Someone who signs up with your address therefore
   can't get it verified by you clicking the link.
3. An unverified account can sign in but not create or join a club. One that
   never verifies and never joins anything is deleted after 72 hours.

## Password reset

1. **Forgot?** on the log-in page goes to `/forgot-password`. The form always
   answers "if an account uses this address, a link is on its way", whether
   or not one does. Limits: 20 per IP and 3 per address per hour, checked
   before any lookup.
2. A `password-reset-email` job mints a 256-bit token, stores only its
   SHA-256 in `PasswordResetToken` (one live link per user; a new request
   replaces the old link) and mails `/reset-password/<token>`, valid for
   **60 minutes**.
3. Opening the link only checks it; the page carries `no-referrer`. Setting
   the new password (a POST, 30 per IP per 15 minutes) spends the link once,
   then in one transaction: sets the password (giving a Google-only account
   its first one), bumps the session version, marks the address verified
   (the link proved it), and deletes the user's other reset links and
   verification tokens.
4. Every device signs out (below), a `password-changed-email` job tells the
   owner, and they log in again with the new password. The new password is
   never used to sign them in automatically.

Expired links are kept a week (a late click reads "expired" rather than
"doesn't work"), then the daily maintenance job deletes them, as it does
expired verification tokens.

## Sessions and ending them

Sessions are signed JWT cookies (Auth.js, 30 days, refreshed as used). Each
carries the account's `UserCredential.sessionVersion` from sign-in. Every
session check compares it with the database (once per request), and a token
whose version is older, or whose user is gone, is ended: Auth.js clears the
cookie. A password reset and the Google-linking gate bump the version. If the
database can't be reached the session is kept, so a blip never signs
everyone out (`src/lib/auth/session-version.ts`).

## Email delivery

See RUNBOOK.md, "Email (production)". In short: verification and reset mail
go out through the platform sender (`RESEND_API_KEY`, `EMAIL_FROM` on a
domain verified in Resend) right after the request that queued them; the
outbox retries failures. Locally, with no key, mail lands in `.data/mail/`.

## Tests

- `src/server/email/password-reset.db.test.ts`: the reset link job, peeking,
  single use, expiry, the version bump, a Google-only account, no-ops.
- `src/server/email/verification.test.ts`: verification, including links
  refused for the wrong account without being spent.
- `src/lib/auth/session-version.test.ts`, `password-policy.test.ts`,
  `callback-url.test.ts` (no open redirect after sign-in).
