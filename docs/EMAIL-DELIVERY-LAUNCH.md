# SuccessfulFelons: Production email & account launch checklist
Reviewed October 28, 2026.

## Current infrastructure observed
- Neon project: **SuccessfulFelons** (production branch), managed Better Auth is provisioned.
- The public site is currently **successfulfelons.vercel.app**; Vercel has **no separately owned custom domain** attached.
- Managed Neon Auth email provider is currently shared SMTP (sender: `auth@mail.myneon.app`). It is for tests; it has lower reliability/limits than a production provider.
- Neon email/password sign-up is enabled, `require_email_verification` is true, but **Verify at Sign-up is not enabled** in the provider configuration (`verify_email_on_sign_up:false`). The site explicitly requests a verification OTP after registration, but production verification must be enabled and tested in Neon Auth itself.
- The website deliberately hides registration unless the server sets `ACCOUNT_REGISTRATION_ENABLED=true`. This **does not** itself disable public sign-up via the underlying Neon Auth API while provider `allow_sign_up:true`. To fully pause provider sign-up before launch, disable it in the Neon Console.
- Public launch must not be claimed until verified sender, successful real inbox OTP, signed-in JWT and 2-user isolation, account deletion and recovery are tested.

## Minimal-cost pilot mailer (no domain purchase required)
Neon's own production checklist documents custom SMTP using `smtp.gmail.com` as an example. A dedicated Gmail mailbox with 2-Step Verification and an app-specific password may serve an initial owner-run limited pilot, subject to Google's sending restrictions. For a public service, use a dedicated transactional email provider/domain to avoid deliverability and scaling problems.

In the **Neon Console**, select the existing **SuccessfulFelons** project, production branch, **Settings → Better Auth → Email Provider** and **Custom SMTP**. Enter the credentials **directly in Neon**, never in ChatGPT or GitHub:
- SMTP host: `smtp.gmail.com` only if using Gmail.
- SMTP port: `465` (SSL) or `587` (TLS), as the provider instructs.
- SMTP username: the full sending email address.
- SMTP password: an app-specific password, **not** the mailbox's normal password. Do not commit or paste it into a conversation.
- Sender email: the validated sending email address; Sender name: `SuccessfulFelons`.

Alternatively, for a domain-based email provider, use its verified sender address, SMTP host/port and securely stored API credential. Validate SPF, DKIM and DMARC on the **owned** domain, never on `vercel.app`.

## Selected pilot sender — 2026-10-28

**Chosen sender address:** `Successfulfelons0@gmail.com`. This is an owner-provided configuration choice, **not a confirmed working SMTP connection**. The latest connected Neon Auth read still reports `email_provider.type = shared` and sender `auth@mail.myneon.app`; no Gmail credential or test email has been configured by ChatGPT.

Configure the sender on the account owner's devices and in the Neon Console:

1. Sign in to the dedicated Google account `Successfulfelons0@gmail.com` and enable **2-Step Verification** in Google Account → Security. Google requires this before app passwords are available.
2. Open [Google App Passwords](https://myaccount.google.com/apppasswords) **while signed in to the sending Gmail account**, name the app `SuccessfulFelons Neon Auth`, and generate a dedicated app password. Eligibility varies by account/security configuration. **Never paste either Gmail's password or this app password into ChatGPT, a GitHub file, or the public website.**
3. Open [Neon Console](https://console.neon.tech/) → existing `SuccessfulFelons` project → `production` branch → Settings → Better Auth → **Custom SMTP**. Fill the fields below directly inside Neon, then Save.

| Neon field | Exact selected value |
|---|---|
| Provider | Custom SMTP |
| Host | `smtp.gmail.com` |
| Port | `465` using SSL, or `587` using TLS (match the SSL/TLS choice available in Neon) |
| Username | `Successfulfelons0@gmail.com` |
| Password | **Google app password generated for this integration — enter privately in Neon only** |
| Sender email | `Successfulfelons0@gmail.com` |
| Sender name | `SuccessfulFelons` |

4. In the same Better Auth settings, leave **public sign-up disabled at the provider** until the ready-to-test window and then enable **Verify at Sign-up**, **Require verification**, and **OTP/code verification**. The application's own Vercel registration gate stays off until all production tests pass.
5. Use Neon's built-in custom-email **Send Test Email** to a mailbox you can access. Check arrival, spam folder, recognizable sender and a fresh one-time verification flow. When your actual test is successful, update this checklist with the date and test result, **not** any password or OTP code.

Gmail SMTP is a small-scale pilot choice only. Google recommends more secure OAuth-based sign-in over app passwords where supported, and sending limits/deliverability can constrain production use. For broad release, consider a transactional provider with a separately owned domain and SPF/DKIM/DMARC. The `vercel.app` subdomain is not an email domain you control.

References: https://support.google.com/accounts/answer/185833 and https://neon.com/docs/auth/production-checklist

## Neon Auth configuration
1. Use **Settings → Better Auth** and ensure **Sign-up with Email**, **Verify at Sign-up**, **verification code (OTP)** and **Require verification** match the live use case. Codes are compatible with shared/custom mail; links require custom mail.
2. Keep `https://successfulfelons.vercel.app` in trusted domains. Restrict old preview origins when they are no longer needed.
3. Keep localhost disabled in production and set the application display name to `SuccessfulFelons`.
4. Test actual code arrival (check spam), expiry, resend, wrong code, used code, verified sign-in and rejected unverified sign-in.
5. Confirm password recovery with the currently supported Neon Auth UI/SDK path. Neon's docs warn some standalone reset SDK methods are not fully supported. Do **not** launch without a working recovery process.
6. Confirm the managed account deletion API is supported and complete. Do not state account deletion is guaranteed based only on a rendered button.

## QA before the public toggle
- Run `npm run check` and `npm run build` and verify latest commit is **Vercel READY**, not merely committed to GitHub.
- Verify unauthenticated `GET /api/account/saved` is **401**; authenticated non-verified or disabled user is also **401**.
- Sign up **two real consenting test accounts** using inboxes controlled by the tester. Complete OTP and sign-in on different devices/browser profiles, obtain managed JWTs, save a link as A, verify B cannot list, modify, or delete A's link. Confirm separate account workspaces.
- Confirm local links are untouched by sign-in/sign-out, that cloud upload is OFF by default, and that a consented import works. Test offline/failed save and later retries.
- Test account exports, per-user cloud deletion and identity deletion in a safe test environment. Confirm no orphan private records.
- Check for auth tokens, app passwords, personal history or email addresses in GitHub files, Vercel logs and backups.
- Verify successful customer-support and incident/reporting contact for account recovery and deletion.

## Enabling launch
The Vercel **Production** environment variable `ACCOUNT_REGISTRATION_ENABLED` must remain **unset** until all checks pass. Only then set it to `true` and redeploy once. Never mistake a `READY` deployment with the flag absent for public account readiness.

Official Neon docs: https://neon.com/docs/auth/production-checklist and https://neon.com/docs/auth/guides/email-verification
