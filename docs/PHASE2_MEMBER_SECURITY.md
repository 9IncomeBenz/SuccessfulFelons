# Phase 2 — Member accounts and private workspace rollout

## Current state
- Public opportunities API is live; member workspace is device-local only.
- `0002_member_workspace.sql` is a **prepared migration**, not proof that the migration has been applied to Neon.
- Do not expose profile, saved-item, application, or resume APIs until authentication is verified end-to-end.

## Required implementation sequence
1. Choose and configure an identity provider (Neon Auth or another maintained OIDC provider). Use provider-issued, server-verified sessions with secure HttpOnly, Secure, SameSite cookies. Configure callback URLs for the production domain and previews.
2. Run the member migration in the intended Neon project, after a schema review and backup. Keep all member tables inaccessible by default.
3. Create a dedicated **least-privilege database role** for member APIs. Never use the database owner for untrusted member requests. Bind authenticated identity on the server and enforce member ownership in every query and via tested RLS policies.
4. Add `GET /api/me`, `GET/PUT /api/me/profile`, `GET/POST/DELETE /api/me/saved`, `GET/POST/PATCH/DELETE /api/me/applications`. Require verified sessions, CSRF protections for cookie-authenticated writes, schema validation, rate limits, and consistent error handling.
5. Build sign-in, account, and dashboard views with clear loading, error, and empty states. Support accessible keyboard and mobile interaction.
6. Offer an explicit, opt-in import of device-local workspace data into an authenticated account. Avoid duplicate saved items. Never silently upload device data.
7. Resume storage is a separate milestone: encrypted private object storage, signed short-lived access, file type and size validation, malware scanning, retention and deletion, and strict owner checks. Do not store resumes in public blobs or the local browser by default.
8. Add account deletion and data export; audit authorization denials without logging sensitive details.

## Acceptance tests
- Anonymous visitors cannot read or write any member data.
- Member A cannot view, update, delete, or infer Member B's data (test direct IDs and enumeration).
- Expired, tampered, and missing sessions fail closed.
- A saved listing survives sign-out/sign-in on two devices for the same account.
- A deletion on one device is reflected on another after refresh.
- Browser-local data is not uploaded without explicit consent.
- Mobile Safari, Android Chrome, and desktop browsers handle failures and keyboard navigation.
- The public housing and employment search still works without login.
- No criminal-history fields are requested or stored; no unsupported eligibility claims.
