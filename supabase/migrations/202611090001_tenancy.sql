set search_path = public, extensions;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  category text not null default '',
  timezone text not null,
  status text not null default 'provisioning' check (status in ('provisioning', 'active', 'suspended')),
  preset text not null default 'custom' check (preset in ('salon', 'tattoo', 'consultant', 'office', 'custom')),
  is_demo boolean not null default false,
  is_template boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid
);

create table tenant_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  hostname text not null unique,
  kind text not null check (kind in ('platform_subdomain', 'custom')),
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'failed')),
  verification_token text,
  verified_at timestamptz,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index tenant_domains_one_subdomain on tenant_domains (tenant_id) where kind = 'platform_subdomain';

create table tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  user_id uuid,
  role text not null check (role in ('owner', 'admin', 'staff')),
  status text not null default 'invited' check (status in ('invited', 'active', 'revoked')),
  invited_email text,
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create unique index tenant_memberships_user on tenant_memberships (tenant_id, user_id) where user_id is not null;
create unique index tenant_memberships_invite on tenant_memberships (tenant_id, lower(invited_email)) where status = 'invited' and invited_email is not null;

create table platform_admins (
  user_id uuid primary key,
  created_at timestamptz not null default now()
);

create table tenant_booking_rules (
  tenant_id uuid primary key references tenants (id) on delete cascade,
  horizon_days integer not null default 60 check (horizon_days between 1 and 365),
  min_notice_minutes integer not null default 120 check (min_notice_minutes >= 0),
  slot_interval_minutes integer not null default 30 check (slot_interval_minutes in (5, 10, 15, 20, 30, 60)),
  cancellation_cutoff_minutes integer not null default 1440 check (cancellation_cutoff_minutes >= 0),
  reschedule_cutoff_minutes integer not null default 1440 check (reschedule_cutoff_minutes >= 0)
);

create table auth_transfers (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  target_host text not null,
  payload text not null,
  expires_at timestamptz not null,
  used_at timestamptz
);
