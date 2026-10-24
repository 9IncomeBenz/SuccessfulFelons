-- SuccessfulFelons / Neon PostgreSQL starting schema.
-- Dedicated database only. No real member data until authentication and access controls are implemented.
create extension if not exists pgcrypto;
create table if not exists organizations (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 kind text not null check(kind in ('employer','housing_provider','community_partner')),
 verified boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists opportunities (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references organizations(id),
 kind text not null check(kind in ('housing','employment','project','training','support')),
 title text not null,
 description text not null,
 city text not null,
 state text not null default 'OH',
 application_url text,
 status text not null default 'pending' check(status in ('pending','published','rejected','expired')),
 verified_at timestamptz,
 expires_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists opportunities_public_filter on opportunities(kind,state,city,status);
-- Use a server-only, least-privilege role for queries; do not expose DB credentials to the browser.
-- Authenticated member and provider workflows require additional migrations and permission checks.
