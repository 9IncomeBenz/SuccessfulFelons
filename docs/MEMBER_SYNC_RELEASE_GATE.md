# SuccessfulFelons member synchronization: release gate

## Current reality
Device-local application tracking, resume draft autosave, and export/restore are implemented. Online account sign-in and synchronization are **not** enabled. The `/api/account-status` endpoint reports `accountsAvailable: false` intentionally.

## Required gates before accepting private member data
1. Verify that the configured authentication provider belongs to the correct SuccessfulFelons Neon project. Replace stale Auth URL settings without logging tokens or credentials.
2. Verify provider issuer, audience, signature, expiry and session revocation. Require secure session cookies and CSRF protection for all writes.
3. Apply reviewed database migrations to the correct database. Provision a non-owner, least-privilege role. Verify RLS and row ownership using two test accounts.
4. Build authenticated member endpoints with schema validation, rate limits, size limits and audit-safe logging. Never trust browser-provided user IDs.
5. Add explicit opt-in device-to-account import with deduplication and visible conflict resolution. Offline changes must queue and retry without overwriting newer remote data.
6. Implement account export and deletion, including dependent data, and test recovery after interruption.
7. Exercise production sign-in, cross-device sync, logout, expired sessions, unauthorized access and mobile browsers. Keep accounts disabled until every gate passes.

## Privacy policy for engineering
Never upload criminal-history details, SSNs, court records or resume drafts without specific, informed consent. Do not place private files in public storage. Keep local-only workflows available while accounts are disabled.

## Automated verification
Run `node scripts/check-ui.mjs` to check inline JavaScript syntax and required tool IDs. Run `node scripts/smoke-test.mjs https://successfulfelons.vercel.app` for public endpoints. These checks are necessary but **not sufficient** to validate member account security.
