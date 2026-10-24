-- SuccessfulFelons / Second Chance Network — initial schema
-- Apply only to a NEW, dedicated Supabase project.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  city text,
  created_at timestamptz not null default now()
);
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('employer','housing_provider','community_partner','service_buyer')),
  website text,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  created_at timestamptz not null default now()
);
create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','editor')),
  primary key (organization_id,user_id)
);
create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  kind text not null check (kind in ('employment','housing','project','training','support')),
  title text not null,
  description text not null,
  city text not null,
  state text not null default 'OH',
  compensation_min numeric(12,2),
  compensation_max numeric(12,2),
  compensation_unit text check (compensation_unit in ('hour','year','project','month')),
  application_url text,
  screening_policy_notes text,
  status text not null default 'pending' check (status in ('pending','published','rejected','expired')),
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (compensation_min is null or compensation_min >= 0),
  check (compensation_max is null or compensation_max >= 0),
  check (compensation_min is null or compensation_max is null or compensation_min <= compensation_max)
);
create index opportunities_discovery_idx on public.opportunities(kind,state,city,status);
create table public.saved_opportunities (
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id,opportunity_id)
);
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id),
  status text not null default 'interested' check (status in ('interested','applied','interview','accepted','declined','withdrawn')),
  created_at timestamptz not null default now(),
  unique(user_id,opportunity_id)
);
create table public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id),
  opportunity_id uuid not null references public.opportunities(id),
  reason text not null,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.opportunities enable row level security;
alter table public.saved_opportunities enable row level security;
alter table public.applications enable row level security;
alter table public.listing_reports enable row level security;

create policy "read own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "create own profile" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "public verified organizations" on public.organizations for select to anon,authenticated using (verification_status = 'verified');
create policy "public approved opportunities" on public.opportunities for select to anon,authenticated
 using (status = 'published' and verified_at is not null and (expires_at is null or expires_at > now()));
create policy "read own saves" on public.saved_opportunities for select to authenticated using (user_id = (select auth.uid()));
create policy "create own saves" on public.saved_opportunities for insert to authenticated with check (user_id = (select auth.uid()));
create policy "delete own saves" on public.saved_opportunities for delete to authenticated using (user_id = (select auth.uid()));
create policy "read own applications" on public.applications for select to authenticated using (user_id = (select auth.uid()));
create policy "create own applications" on public.applications for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own applications" on public.applications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "report published listing" on public.listing_reports for insert to authenticated
 with check (reporter_id = (select auth.uid()) and exists (
   select 1 from public.opportunities o where o.id = opportunity_id and o.status = 'published'
 ));
-- Organization onboarding, listing approval and report review are deliberately server-admin-only.
-- Never expose the Supabase service role key in browser code.
-- No criminal-history fields are stored.
