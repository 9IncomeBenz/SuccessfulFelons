# Database setup and deployment

1. Create a NEW Supabase project for SuccessfulFelons (not Playaz Club or IPSW).
2. In Supabase SQL Editor, review and run `supabase/migrations/0001_initial.sql`.
3. Review RLS policies with test accounts before storing real member data.
4. The static `index.html` currently DOES NOT connect to this database.
5. Create a dedicated Vercel project linked to `9IncomeBenz/SuccessfulFelons`.
6. Before introducing accounts, migrate to Next.js and implement validated server routes.
7. Use a protected server-side administrative workflow for organization verification and listing approval. Never give a browser the service-role secret.
8. Confirm housing, employment, consumer-protection and privacy requirements with qualified reviewers before launch.

## Security limitations
The SQL migration is a starting point, not a security certification. Member profiles are private. Only approved, verified, non-expired opportunities are publicly readable. Organization write access and administrative moderation are intentionally NOT implemented. Application and report content are private. Record-relief data is not collected.

## Status
Files committed to GitHub ≠ database provisioned or deployed. No real listings or accounts exist yet.
