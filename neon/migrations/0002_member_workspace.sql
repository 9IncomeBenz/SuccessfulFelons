-- Phase 2: private member data schema. Apply only after selecting an identity provider.
-- No API should accept a user ID supplied by the browser as proof of identity.
-- All access must be authorized server-side using a verified identity token.
create table if not exists member_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_subject text not null unique,
  display_name text,
  home_city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists member_saved_opportunities (
  member_id uuid not null references member_profiles(id) on delete cascade,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, opportunity_id)
);
create table if not exists member_applications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references member_profiles(id) on delete cascade,
  opportunity_id uuid references opportunities(id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  stage text not null default 'Interested'
    check (stage in ('Interested','Applied','Interview','Offer','Closed')),
  next_step text check (char_length(next_step) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists member_applications_owner on member_applications(member_id, updated_at desc);
-- Defense in depth: deny direct table access until explicit per-request
-- authorization and least-privilege roles are implemented and tested.
alter table member_profiles enable row level security;
alter table member_saved_opportunities enable row level security;
alter table member_applications enable row level security;
alter table member_profiles force row level security;
alter table member_saved_opportunities force row level security;
alter table member_applications force row level security;
-- Intentionally NO policies. The application must not use an owner/superuser
-- role for member-data API requests. A trusted backend may later establish
-- session identity and narrowly scoped RLS policies after auth is configured.
