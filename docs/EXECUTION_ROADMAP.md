# SuccessfulFelons — execution roadmap (November 5, 2026)

## Mission and non-negotiable standards
Ohio-first opportunity discovery with **employment and housing as equal pillars**. Browsing is free, no criminal-history questionnaire is required, and no vacancy or landlord screening acceptance is represented as verified without direct provider evidence. SuccessfulFelons is independent from Playaz Club.

## Phase 1 — Verified Opportunity Engine (functional foundation deployed)
- [x] Migrate Neon production and QA with evidence-gated opportunity records, review deadlines and stale-listing exclusions.
- [x] Create source-reviewed searchable statewide directory entries: three employment, three housing. They are **official directories**, not confirmed vacancies.
- [x] Launch search by kind, county, city/keyword and evidence type, with source links and review dates.
- [x] Add member-submitted opportunity intake and a separate private reports queue. No automatic publication.
- [x] Build a moderator-only queue with reviewer attestation, audit events, reject, publish, expire and resolve actions.
- [ ] Confirm and list 50 actual employer opportunities and 50 actual housing opportunities through provider/source contact before claiming those targets. None is fabricated.
- [ ] Assign named moderator(s) through exact Neon Auth UUIDs in Vercel's `SF_MODERATOR_USER_IDS` production environment setting. **Never use email as admin proof**, because signup verification is optional.
- [ ] Establish routine human rechecks. Expired and overdue reviews already disappear from public search automatically; actual external website rechecks are not automatic yet.

## Phase 2 — Member dashboard and tools (first features implemented)
- [x] Existing managed member accounts, 100-item private cloud saved links, opt-in local upload, private browser-only application tracker and backups.
- [x] Add account-scoped county and employment/housing preferences; deep-link the opportunity finder with the saved filters.
- [ ] Account-synced application pipeline, explicit reminder system and accessible notifications.
- [ ] Account recovery and account deletion tests against real managed sessions.

## Phase 3 — Providers and moderation (first features implemented)
- [x] Signed-in provider/member submission form, 5 submissions/day and 10 pending submissions per account.
- [x] Moderator ID allowlist with no reliance on email ownership.
- [x] Manual source review required for directory publishing; provider contact attestation required for openings/programs. Every decision gets a private audit record.
- [ ] Confirm moderator identity; invite providers to own verified profiles and submit applications without disclosing sensitive applicant details.

## Phase 4 — Safety, reliability and accessibility (in progress)
- [x] Existing JWT validation, active/banned account enforcement, owner-scoped cloud data, 100-lead quota.
- [x] Add source freshness enforcement, reported-listing review queue and per-account submission/report limits.
- [x] Run automated employment, statewide, browser storage, account isolation and opportunity-engine build validation.
- [ ] Independent live two-account privacy test, password reset and deletion validation.
- [ ] Screen-reader, keyboard-only, mobile and slow-connection audits; external-source fraud screening; provider takedown process.

## Phase 5 — Statewide trust and growth (not yet executed)
- [ ] Recruit verified employer and housing partners in each Ohio region.
- [ ] Publish a public accuracy policy, support channels, and consent-respecting referral process.
- [ ] Measure useful outcomes without collecting unnecessary criminal-history details. Track referrals and confirmed opportunities, not unsupported promises.
- [ ] Consider nonintrusive sponsorship or paid provider tools while keeping seeker access free.

## Release rules
No listing is labeled a provider-confirmed **vacancy** without a source, direct confirmation, verification date and upcoming review due date. Do not label a housing directory an available unit or an employer program an active job posting. `SF_MODERATOR_USER_IDS` must contain actual, authenticated owner-authorized moderator UUIDs before the admin queue works. Owner IDs are never accepted from request bodies; they come from validated Neon tokens. No platform credentials, passwords or applicant secrets belong in this repository.

## Source review
Official references checked November 5, 2026: [OhioMeansJobs](https://ohiomeansjobs.ohio.gov/job-seekers/), [OhioMeansJobs centers](https://ohiomeansjobs.ohio.gov/job-seekers/find-a-job/local-help), [Bonds4Jobs](https://ohiomeansjobs.ohio.gov/for-employers/resources-for-employers/bonds-4-jobs), [Ohio Housing Locator](https://www.ohiohousinglocator.org/), [OHFA renter resources](https://www.ohiohome.org/renters.aspx), [Ohio 211](https://ohio211.org/how-to-find-help/). These are **search and referral resources**, not successful application guarantees.
