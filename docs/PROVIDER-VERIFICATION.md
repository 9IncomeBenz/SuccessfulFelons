# SuccessfulFelons — Ohio Provider Verification and Publication Standard
Last reviewed: 2026-10-28

## Why this exists
We provide a useful, accurate statewide directory without falsely promising that an employer will hire someone with a felony or that a housing unit accepts particular backgrounds. **A public website statement is not direct provider confirmation.** Research leads must not become verified openings simply because they have an official-looking link.

## Evidence tiers
1. **Directory published**: An association/government directory names a county provider, with a website/phone. This proves a published referral, **not** that funding, enrollment, or shelter beds are available now.
2. **Provider documented program**: An official provider page describes its second-chance hiring or reentry services. This proves a stated program, **not** an active vacancy or applicant eligibility.
3. **Provider posted role**: An employer's official career page lists a position, with any publicly written conviction policy. Still requires confirmation of whether it remains open and applies to the exact role/location.
4. **Direct provider confirmed**: An authorized provider representative has confirmed a specific open role/property and relevant screening policy, with a date, role, contact channel and publicly sharable evidence. A direct response alone does **not** authorize publication without a review.
5. **Approved and published**: A reviewed listing is entered in the existing secured listings workflow with a verified organization, documented verification, expiry/recheck deadline and provider-approved public contact details. Never grant publication based solely on static research data.

## Employment verification call / email checklist
- Company and authorized hiring contact; exact location, role and application URL.
- Is this position accepting applications **today**? When will it close? Is the advertised wage and shift current?
- Are applicants with felony convictions considered for **this role**? What categories of conviction, if any, are disqualifying? Is the decision individualized?
- If a 3-, 5-, 7-, 10-year or other lookback applies, does time run from offense, conviction, sentencing, supervision completion, or release? Is this policy specific to one role, customer contract, or statewide employer?
- Are charges, dismissed cases, misdemeanors, driving records, drug-screening requirements or licensing/regulated-work restrictions treated differently?
- Does the applicant need to explain a record in an interview? Do not collect applicant conviction details in this repository.
- Get permission to publish an official employer name, nonpersonal contact/application link and brief written screening statement. Record date, source, verifier, next recheck and any caveats.
- **If no response**: maintain `contact_status=not_contacted` or `awaiting_response`. Do not claim confirmation.

## Housing / landlord verification checklist
- Property/provider name, exact county and worksite/property address, accessible application link, units and rent range.
- Are applications currently accepted? Are units open or is there a waitlist? Confirm fees, deposit, credit and income requirements.
- Ask the landlord whether criminal-history screening is conducted and request their **written** policy; do not infer acceptance from general fair-housing compliance.
- Ask about individualized assessments, appeal/reconsideration, rules for subsidized housing and voucher acceptance. Avoid promising admission.
- Confirm the contact and publish only provider-approved business details. Never record applicant names, convictions, IDs or Social Security numbers in public repository JSON.
- For a community-action agency, document the **specific** currently funded assistance program separately; directory listing alone does not mean rent aid or shelter beds exist.

## Data files and distinction
- `data/employment-research.json`: Public research; `is_verified_vacancy=false` for every record until a secure moderated publication workflow exists.
- `data/employer-verification-queue.json`: Public-repository-safe research queue. Avoid personal reviewer names, private phone numbers, applicant PII, criminal case details or emails from private conversations. All records start `not_contacted`.
- `data/ohio-support-agencies.json`: Ohio Association of Community Action Agencies contact listings for all 88 counties, **not** employer or property screening confirmations.
- `data/ohio-reentry-programs.json`: Documented employment and reentry service routes; they are not job vacancies.
- `data/ohio-counties.json`: Canonical geographic selection list, not evidence of a vacancy.
- `/api/opportunities` remains the separately moderated database feed. Never insert unverified research directly into published opportunities.

## Freshness and rechecks
- Recheck employer-posted jobs at least every 14 days before any promotion to 'active'; provider policies at least every 90 days; county directory agency contacts quarterly. These are **operational targets, not evidence of a completed check**.
- On a broken or expired source, mark `opening_status=expired_listing` or `source_unavailable`; exclude from homepage research leads and retain only historical evidence in the full directory.
- When no one has checked since `reviewed_on`, label sources stale; do not rewrite the date without actually reviewing them.
- Record the exact evidence URL and date; never invent a role, pay, lookback period, contact, partner agreement or hiring outcome.

## Publication release checklist
- [ ] 88 counties present with no duplicates
- [ ] 88 county-level Community Action Agency referrals with names and published phone numbers
- [ ] Official statewide OhioMeansJobs, OhioHousingLocator, Ohio 211 and COHHIO resource links remain present
- [ ] Employer research remains segregated from moderated verified vacancies
- [ ] Provider programs and hiring assistance never appear as guaranteed employment
- [ ] No public criminal-history profiles and no applicant sensitive information
- [ ] Run `npm run check:employment` and check production routes on desktop and mobile
- [ ] Confirm Vercel status READY and check public page links before calling the deployment functional

## Known limitations
Direct employer/landlord calls have **not** been made by the automated research or code deployment itself. No new role, landlord acceptance rule, placement, partnership, paid assistance availability, or cross-device personal-account sync is claimed. Public program websites may change.
