# Neon database option

The Vercel team already has a Neon marketplace integration. The original `supabase/migrations/0001_initial.sql` depends on Supabase `auth.users` and `auth.uid()` and MUST NOT be run against plain Neon.

The standalone Neon starting migration is at `neon/migrations/0001_initial.sql`.

## Next actions
1. Provision a new, dedicated Neon database for SuccessfulFelons in the Vercel dashboard; do not reuse other projects' databases.
2. Connect it to the `successfulfelons` Vercel project, using encrypted server-only connection variables.
3. Apply the migration through a secure database administration tool.
4. Build server routes and validated public listing queries, plus protected administrative publishing.
5. Choose and integrate an authentication provider before member accounts, saved opportunities or applications.
6. Verify permissions and deploy only after testing.

The migration has NOT been executed, and no database is claimed to exist.
