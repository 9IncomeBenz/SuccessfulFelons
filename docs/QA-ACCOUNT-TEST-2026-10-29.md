# SuccessfulFelons — Isolated Account QA (October 29, 2026)

## Strict environment boundaries
- Branch: `qa/account-e2e-20261029`. All login, OTP and saved-link tests here are **preview only**.
- Backend: Neon project `SuccessfulFelons`, branch `vercel-dev` (NOT `production`).
- Vercel: use branch-specific preview env vars `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `VITE_NEON_AUTH_URL` and `ACCOUNT_REGISTRATION_ENABLED=true`. Production launch flag remains OFF.
- Do not promote this test deployment to production. Vercel preview is protected by Vercel Authentication, and the Neon Auth trusted-origin list must explicitly allow its generated preview URL.
- Preview Neon Auth starts on shared email provider and its own verification settings. The successful **production** Gmail SMTP test proves sender delivery only; preview verification emails may come from Neon's shared sender.
- Never put passwords, one-time codes or auth tokens in GitHub or a ChatGPT conversation.

## Owner-controlled functional test
1. Open the protected preview's `/account.html`; confirm the registration form is shown only when `/api/account-status` reports true.
2. Sign up with an inbox you control and a unique password entered in the browser. Do not send the password here.
3. Confirm an OTP email actually arrives. Enter its code **only on the preview page**. Do not share codes.
4. Sign in and verify that `/api/account/saved` loads under the verified identity.
5. Save one public test job/housing source link as user A. Confirm it persists across reload and sign-out/sign-in.
6. With a separate consenting test inbox/session, create and verify user B. Ensure B cannot see, modify or delete A's saved link, and vice versa.
7. Confirm cloud import and automatic sync are OFF until each person explicitly consents. Verify local device saves remain intact after logout.
8. Confirm 100-lead quota and input rejection with synthetic data in preview only; never use applicants' personal records.
9. Revoke/expire a session and verify private API requests fail. Check unverified and disabled identities cannot access private saves.
10. Test account recovery and identity deletion before any public launch; the current managed deletion integration has not been proven end-to-end.

## Known blockers
- Production Neon Auth `verify_email_on_sign_up` still reads false through the connector despite the dashboard showing ON. Production `require_email_verification` is true and OTP is selected. Do not infer the signup mailer works from the SMTP test alone.
- Production Neon Auth still allows signups through the **provider API** even though the SuccessfulFelons site forms remain gated. Close provider-side signup when owner testing is complete, or configure a proper provider launch window.
- Preview managed Auth may need its own email verification requirement enabled in Neon's console; an OTP email must be verified by the tester.
- Even if preview passes, production requires separate real verified-user and JWT validation before public account launch.
