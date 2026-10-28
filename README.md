# SuccessfulFelons — Second Chance Network

Independent Ohio-first platform helping people find housing, employment, independent income, record-relief information and reentry support.

## Status
Early development. The site has an evidence-based employer-research directory and a separate database-backed verified-opportunity search. The researched leads are **not employer-confirmed live vacancies** and are not presented as published/verified opportunity records. Employer and landlord partnerships, account synchronization, eligibility decisions, and payment processing are not established by this repository.

## Statewide Ohio access
- `/ohio.html` provides a searchable directory of **all 88 Ohio counties**, using `data/ohio-counties.json` as the authoritative in-repository county list (sourced from OhioMeansJobs).
- Ohio residents can select a county and access official OhioMeansJobs workforce-center guidance, OhioMeansJobs job search, Ohio Housing Locator, Ohio 211 support and Ohio Legal Help. These are *external official resources*, not directly confirmed SuccessfulFelons vacancies.
- The employer directory `/employment.html` supports a county filter and links back to the statewide navigator if no matches exist.
- Existing employer records have *approximate* county assignments derived from listed city/municipality; exact employer worksites have not been independently confirmed. The main database-backed opportunity search continues to search by city; it does not yet guarantee county-level or remote-matching accuracy.
- Our statewide navigation is complete for the 88 counties, but the **supply of verified jobs, landlords and local reentry partners varies by county and is not yet complete**. Never replace an empty result with fabricated listings.

## Ohio housing and locally published support
- `/housing.html` is a dedicated 88-county housing navigator, with rental searches, emergency housing referrals, landlord-screening questions, and community-action contact details. This page does **not** claim properties or shelter beds are open, accepts no applications, and never declares a landlord will accept a particular felony.
- `data/ohio-support-agencies.json` maps all **88** counties to the Community Action Agency name and published phone/website in the Ohio Association of Community Action Agencies' [directory](https://oacaa.org/find-an-agency/), research reviewed 2026-10-28. The 88 county references represent **48** agency names (including multijurisdiction providers); availability, funding and program eligibility still require direct contact.
- `data/ohio-reentry-programs.json` contains 14 source-documented reentry employment and training/referral programs in Ohio, including the Akron area and a regional coalition serving six southern Ohio counties. Programs are **not verified vacancies** or guaranteed enrollments.
- `/ohio.html` includes county-specific agency and reentry resources, and deep links into the housing and employment directories.
- Housing and employment are equal primary areas. Throughout Ohio, the statewide tools work even in counties where no verified role or housing opening is in our database.

## Saving opportunities privately
- Browse `/employment.html` or `/ohio.html` and choose **Save lead** to keep researched positions and programs in the existing `sf_workspace_v1` browser workspace. The same saved leads appear in the homepage My Progress area and on `/saved.html`.
- `/saved.html` can search and remove saved leads, export them as a JSON backup, and safely merge a previously exported JSON backup. The import process checks the file format, refuses invalid links and respects the 100-lead device limit.
- This is **local device storage, not a user account, remote database, application submission or cross-device synchronization**. It keeps existing local application tracking records intact; clearing browser storage can remove them.
- `assets/saved-leads.js` contains the shared save/remove/storage implementation; `scripts/validate-saved-leads.mjs` has regression checks for duplicate saves, malicious URLs, preserving tracker records and storage failures.

## Provider confirmation queue
- `data/employer-verification-queue.json` tracks the **17 researched job/employer entries** awaiting outreach; all contact states start `not_contacted`. It is not evidence of direct employer confirmation.
- `docs/PROVIDER-VERIFICATION.md` defines explicit evidence tiers, confirmation questions, 3/5/7/10-year lookback differentiation, housing vacancy and screening verification, privacy rules, and publishing requirements.
- The site includes public-source freshness warnings. No automated background service is contacting employers, landlords, or rechecking availability.

## Employment research
- Browse `/employment.html` for documented second-chance employer programs, job postings that say applicants with records are welcome, position-specific felony lookback rules, and case-by-case or fair-chance legal language.
- The homepage `#listings` search separately shows verified database opportunities and potential researched employer leads. Its city/type filters apply to the appropriate category, and it excludes expired or inaccessible listings from the main research leads.
- The canonical static research data is `data/employment-research.json`. Both pages fetch the same data. Do not duplicate records inside HTML.
- `opening_status=not_employer_confirmed` means an employer has **not confirmed** an active opening or an applicant's eligibility. Other statuses: `expired_listing` and `source_unavailable` (historical evidence only, viewable in the directory).
- `kind=program` denotes employer hiring evidence, not a specific vacancy; `kind=posting` is an explicit encouragement in a job posting; `kind=timed` records a position-specific restriction; `kind=case` is only individualized review/legal compliance.
- A 5-, 7-, or 10-year rule applies **only to the position/record category** specified by the source; it is not a company-wide guarantee. Determine from employer whether lookback starts at offense, conviction, sentencing, or release.
- Never upgrade a research record to a verified live vacancy based only on a third-party job board or a published policy. Confirm with employer, document contact and verification date, and publish through the existing moderated database workflow only after approval.
- Dates reflect a research/source check, not automatic monitoring. Job listings may change between checks.

## Quality checks
Run `npm run check` (Node.js 24+). The validator checks all 88 Ohio counties, published agency contacts, sourced reentry programs, employer confirmation queue, HTML scripts, shared data wiring, unique IDs, HTTPS sources, evidence categories, restrictions and archived-status safeguards. GitHub Actions automatically runs the validator on relevant changes. Passing these tests **does not** establish that any job is presently available, and external links still require manual review.

## Local preview
Open `index.html` in a browser for the basic static shell. To load the research JSON and backend APIs, serve the project over HTTP (for example, via Vercel dev) rather than opening individual HTML files with `file://`.

## Principles
- Free access to opportunity seekers.
- No public criminal-history profiles.
- Housing and job screening claims require verification.
- Record-relief guidance is educational, not legal advice; no eligibility determination without reviewed rules.
- This repository is independent of Playaz Club and other products.

## Roadmap
1. Expand verified housing and job leads across all Ohio counties. Directly confirm employer screening policies and available roles before entering reviewed openings through moderation.
2. Secure backend, member accounts, admin moderation, and applications.
3. Employer and housing-provider onboarding.
4. Legal-reviewed record-relief screening.
5. Outcome tracking and expansion.
