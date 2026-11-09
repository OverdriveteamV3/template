set search_path = public, extensions;

create table notification_settings (
  tenant_id uuid primary key references tenants (id) on delete cascade,
  reply_to text,
  public_contact_email text,
  recipients text[] not null default '{}',
  sender_mode text not null default 'platform_default' check (sender_mode in ('platform_default', 'verified_domain')),
  verified_from_address text,
  requested_from_address text
);

create table notification_outbox (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  dedupe_key text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'dead')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  provider_message_id text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, dedupe_key)
);

create index notification_outbox_due on notification_outbox (next_attempt_at) where status in ('pending', 'failed');

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants (id) on delete cascade,
  actor_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_events_tenant on audit_events (tenant_id, created_at desc);
