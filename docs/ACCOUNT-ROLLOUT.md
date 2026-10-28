# SuccessfulFelons — Private Accounts & Cloud Sync Rollout
Updated: 2026-10-28

**Deployment state: production private storage installed; account UI and cloud API implemented behind explicit readiness flag; member registration NOT publicly open.**

The existing Neon Auth service and production private database schema are connected. Registration and online sync are explicitly gated by `ACCOUNT_REGISTRATION_ENABLED=true` plus database readiness. Until email deliverability and real multi-device authentication tests pass, leave the launch flag unset and do not describe this system as publicly operational.

## Connected Neon verification — October 28, 2026
- Connected Neon project: `SuccessfulFelons` (existing project), production branch `production`, database `neondb`.
- Neon Auth is provisioned with managed Better Auth, and the official production URL is trusted. The shared Neon SMTP service is still configured; custom transactional email and end-to-end verification are required before public launch.
- Production migration **approved by the owner and applied October 28, 2026**. The `sf_private.saved_leads` table, `sf_private.enforce_saved_leads_quota()` function, and enabled `sf_saved_leads_quota_before_insert` trigger are present in production. The production saved-leads table contains **0** rows at initial verification.
- Base schema: `migrations/002_private_saved_leads.sql`. Database-enforced quota: `migrations/003_private_saved_leads_quota.sql`. The quota statements were applied in one database transaction after the base migration.
- Isolated preview tests before release: one owner inserted 100 synthetic leads; #101 was rejected; a second owner inserted an independent lead; updating an existing saved lead at quota succeeded.
- Neon's completion workflow applied the base migration to production and deleted the temporary test branch `br-still-sky-b4y3exh9`. Temporary test rows were **not** copied into production.
- Read-only production checks verified existing `public.opportunities` and `public.organizations` remained present. Table privileges were not granted to PUBLIC.
- The public `/api/account-status` responded with `privateStorageReady:true`, `accountsAvailable:false` and `onlineSyncAvailable:false`. The existing `/api/opportunities` endpoint returned HTTP 200.
- The production signup screen, managed account deletion, verified-email end-to-end tests, and true cross-device authenticated tests remain gated. The UI and protected endpoints have been implemented but real sessions have not been exercised by an authenticated test user.

## Architecture
- Use **managed Neon Auth** for sign-up, sign-in, email verification, password management, session cookies and JWT issuance. Do not store passwords, password hashes, session cookies, JWTs or full criminal-history details in SuccessfulFelons tables or browser localStorage.
- The managed browser client in `src/account-sync.js` is bundled into static production assets using the pinned official `@neondatabase/auth` SDK, with esbuild through `scripts/build-site.mjs`. The sign-in forms are available only when the account-status endpoint confirms the explicit launch flag and private storage. Never substitute an unpinned third-party CDN.
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

## Implementation status after account frontend build
- `/account.html` has sign-in, register, email verification-code entry, cloud saved-lead list, export, per-owner cloud deletion and managed identity deletion request. The latter depends on Neon Auth enabling self-deletion; no end-to-end deletion result has been verified.
- `/saved.html`, `/employment.html`, `/ohio.html` and the homepage retain local saving and optional cloud upload. Per-account auto-upload is off by default, explicitly consented, and can be disabled; signed-out user data is never uploaded.
- Authorization now consults `neon_auth."user"` to require a live, email-verified, non-banned identity. This rejects a deleted identity even if a short-lived JWT has not yet expired. The live identity check and private authorization paths have regression tests; a production JWT was not used in automated tests.
- Production custom SMTP has **not** been configured. Neon shared SMTP is configured, but the official production checklist requires an appropriate transactional provider and sender verification.
- Registration remains disabled by default; setting the launch flag alone without actual SMTP and end-to-end testing is not sufficient to declare this finished.
