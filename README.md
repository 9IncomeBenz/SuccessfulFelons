# SuccessfulFelons — Second Chance Network

Independent Ohio-first platform helping people find housing, employment, independent income, record-relief information and reentry support.

## Status
Early development. The site has an evidence-based employer-research directory and a separate database-backed verified-opportunity search. The researched leads are **not employer-confirmed live vacancies** and are not presented as published/verified opportunity records. Employer and landlord partnerships, account synchronization, eligibility decisions, and payment processing are not established by this repository.

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
Run `npm run check:employment` (Node.js 24+). The validator checks shared data wiring, unique IDs, HTTPS sources, evidence categories, restrictions and archived-status safeguards. GitHub Actions automatically runs the validator on relevant changes. Passing these tests **does not** establish that any job is presently available, and external links still require manual review.

## Local preview
Open `index.html` in a browser for the basic static shell. To load the research JSON and backend APIs, serve the project over HTTP (for example, via Vercel dev) rather than opening individual HTML files with `file://`.

## Principles
- Free access to opportunity seekers.
- No public criminal-history profiles.
- Housing and job screening claims require verification.
- Record-relief guidance is educational, not legal advice; no eligibility determination without reviewed rules.
- This repository is independent of Playaz Club and other products.

## Roadmap
1. Directly confirm and regularly re-check Ohio employer policies and available roles, then enter genuinely verified opportunities through moderation.
2. Secure backend, member accounts, admin moderation, and applications.
3. Employer and housing-provider onboarding.
4. Legal-reviewed record-relief screening.
5. Outcome tracking and expansion.
