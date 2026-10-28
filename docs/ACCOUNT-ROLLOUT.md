# SuccessfulFelons — Private Accounts & Cloud Sync Rollout
Updated: 2026-10-28

**Deployment state: backend staged, member accounts NOT open.**

The project already exposes managed Neon Auth and Neon Postgres environment configuration in Vercel. This DOES NOT mean users have working sign-up, trusted-domain redirects, verified sessions or synced data. Keep the public `/api/account-status` response `accountsAvailable:false` and `onlineSyncAvailable:false` until the checklist below is finished and tested.

## Connected Neon verification — October 28, 2026
- Connected Neon project: `SuccessfulFelons` (existing project), production branch `production`, database `neondb`.
- Neon Auth is provisioned with managed Better Auth, and the official production URL is trusted. The shared Neon SMTP service is still configured; custom transactional email and end-to-end verification are required before public launch.
- Production's `sf_private.saved_leads` table was **absent** during the read-only inspection.
- Migration `002_private_saved_leads.sql` has been **successfully tested on a temporary Neon branch**, not on production.
- Migration `003_private_saved_leads_quota.sql` contains the separate quota trigger (the automated migration preparer cannot parse a semicolon-bearing PL/pgSQL function as part of the multi-statement migration). On the temporary branch, its function and trigger were executed and validated.
- Synthetic temporary-branch results: one owner inserted 100 saved leads; attempt #101 correctly raised `Saved lead limit exceeded`; a second owner could save independently; an existing record could be updated at quota.
- **No production schema migration was applied.** Applying migrations to production requires the owner's explicit approval and completion of the reviewed change process. The prepared temporary branch should be cleaned up through the migration completion/cancellation workflow after the owner decides.
- The production sign-in page, account deletion, verified email flows, cross-device testing and secure user-facing cloud sync remain gated.

## Architecture
- Use **managed Neon Auth** for sign-up, sign-in, email verification, password management, session cookies and JWT issuance. Do not store passwords, password hashes, session cookies, JWTs or full criminal-history details in SuccessfulFelons tables or browser localStorage.
- The verified browser client is **staged** in `src/account-sync.js` using official `@neondatabase/auth`. It has **not** been bundled into a live sign-in experience. Never substitute an unpinned third-party CDN for the trusted SDK.
- Protected API: `/api/account/saved` accepts a short-lived `Authorization: Bearer` JWT issued by managed Neon Auth. `api/_lib/auth.js` verifies its signature using Neon Auth's HTTPS JWKS, issuer and EdDSA. Every query uses `payload.sub` as the owner, never an ID supplied by the client.
- Database: `sf_private.saved_leads` in `migrations/002_private_saved_leads.sql` and quota trigger `migrations/003_private_saved_leads_quota.sql`. This private schema is not an exposed public Data API table. Store **only** opaque lead ID, role title, organization, URL and timestamps, not resume contents, address, SSN, criminal history or email.
- The `GET`, `PUT`, and `DELETE` API returns 401 for missing/invalid JWTs and 503 for absent configuration/database table. It must not return another user's row.
- Existing browser storage and device backups keep working. Any migration of locally saved links to a user account needs **explicit, informed opt-in**. No automatic reading or uploading of old browser data.
- A sign-out ends the managed browser session but does not instantly revoke any previously issued JWT until expiry. Keep JWT lifetimes short.
- Emails/phone numbers and other data should be introduced only as needed with clear retention and deletion policies; never copy applicants' records into public GitHub JSON.

## Launch gates — do not skip
- [ ] **Neon connection**: Authorize Neon tool access or use the owner's Neon console. Select the correct production branch and take a recoverable backup. Apply the reviewed `migrations/002_private_saved_leads.sql` in a **preview branch first**. Run smoke queries for per-user isolation, 100-lead limit, and clean migration rollback; then apply production.
- [ ] **Trusted origins**: In Neon Auth, allow `https://successfulfelons.vercel.app` and any official custom production origin. Preview origins must be explicitly authorized in preview branches, never wildcard trusted. Verify any expected first-party/subdomain cookie behavior on real browsers.
- [ ] **Email verification**: Enable and TEST verified email registration, password reset, rate limiting / abuse protection, MFA if available, and sign-out. Configure transactional email service and deliverability.
- [ ] **JWT verification**: Confirm Neon Auth issuer, JWKS path, token schema and expiration with a real managed-token test on production-alike preview. The code currently expects EdDSA and issuer equal to the Neon Auth URL origin per official Neon documentation. Set `NEON_AUTH_JWKS_URL` if the managed project uses a different official JWKS endpoint. Never trust unverified JWT payloads.
- [ ] **Privacy and ownership**: Test user A cannot read/update/delete user B's saved links. Test token expiry, disabled users, stale sign-in, 401, quota limit, disallowed schemes, corrupted requests, browser storage disabled and server errors.
- [ ] **Build client**: Install `@neondatabase/auth` in the application, bundle `src/account-sync.js` using a controlled build rather than remote CDN script, and connect a real accessible sign-in/account page only after other gates pass. Use server-provided configuration, not secrets in client code.
- [ ] **Opt-in import and cross-device merge**: After login is proven, ask users whether to upload existing locally saved links. Preserve local backups, avoid deleting duplicates or application-tracker data, and test on iPhone Safari, Android Chrome and desktop.
- [ ] **Deletion and compliance**: Build signed-in cloud deletion/export, account deletion, user consent, retention and privacy controls before users register. Do not advertise accounts as live or claim automatic synchronization until all these are complete.
- [ ] **Observe and test**: Run `npm run check`, verify Vercel READY, use actual registered test identities on two devices, inspect protected API requests and error paths, and confirm no applicant PII in logs.

## Test and rollout
```sh
npm run check
node --check api/_lib/auth.js
node --check api/account/saved.js
node --check src/account-sync.js
```

`GET /api/account-status` is an anonymous, privacy-safe indicator and does not disclose secrets, claims `accountsAvailable:false`, and checks whether the private table exists. `/api/account/saved` is not a publicly usable application until all login, trusted origins and migration steps are completed.

## Direct employer and housing confirmations
The `data/employer-verification-queue.json` research queue still records **zero direct contacts**. Do not promote an employer program or posting to a verified vacancy until an authorized employer representative has confirmed the specific role, opening, pay and relevant offense lookback period (including what date starts that period). Likewise, an agency listing does not imply a landlord will rent to someone with a felony. Housing intake must confirm specific units, current availability, written screening criteria and permission to publish. Maintain reviewer attribution and evidence privately, never within the public repository; publishing requires moderation.
