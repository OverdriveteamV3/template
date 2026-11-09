set search_path = public, extensions;

create table form_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  kind text not null check (kind in ('contact', 'quote', 'booking_intake')),
  name text not null,
  active boolean not null default true,
  unique (tenant_id, id)
);

create table form_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  form_id uuid not null,
  version integer not null,
  schema jsonb not null,
  created_at timestamptz not null default now(),
  unique (form_id, version),
  unique (tenant_id, id),
  foreign key (tenant_id, form_id) references form_definitions (tenant_id, id) on delete cascade
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  form_version_id uuid,
  kind text not null,
  answers jsonb not null,
  status text not null default 'unread' check (status in ('unread', 'read', 'archived')),
  assigned_staff_id uuid,
  submitter_user_id uuid,
  appointment_id uuid,
  customer_email text,
  ip_hash text,
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create index submissions_tenant_status on submissions (tenant_id, status, created_at desc);

create table submission_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  submission_id uuid not null,
  author_user_id uuid,
  body text not null,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, submission_id) references submissions (tenant_id, id) on delete cascade
);

create table website_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  version integer not null,
  status text not null check (status in ('draft', 'published', 'archived')),
  document jsonb not null,
  theme jsonb not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  parent_version_id uuid,
  unique (tenant_id, version)
);

create unique index website_one_draft on website_versions (tenant_id) where status = 'draft';
create unique index website_one_published on website_versions (tenant_id) where status = 'published';

create table assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  storage_path text not null,
  mime text not null,
  byte_size integer not null,
  kind text not null,
  visibility text not null check (visibility in ('public', 'private')),
  focal_x numeric not null default 50,
  focal_y numeric not null default 50,
  created_by uuid,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, id)
);

create table policy_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  kind text not null check (kind in ('privacy', 'terms', 'cancellation', 'other')),
  slug text not null,
  unique (tenant_id, slug),
  unique (tenant_id, id)
);

create table policy_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  document_id uuid not null,
  version integer not null,
  title text not null,
  format text not null check (format in ('text', 'pdf')),
  body text not null default '',
  asset_id uuid,
  effective_on date,
  status text not null check (status in ('draft', 'published')),
  required_for_booking boolean not null default false,
  published_at timestamptz,
  unique (document_id, version),
  unique (tenant_id, id),
  foreign key (tenant_id, document_id) references policy_documents (tenant_id, id) on delete cascade
);

create table policy_acceptances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  appointment_id uuid not null references appointments (id) on delete cascade,
  policy_version_id uuid not null references policy_versions (id),
  user_id uuid not null,
  accepted_at timestamptz not null default now(),
  unique (appointment_id, policy_version_id)
);

create table public_rate_limits (
  tenant_id uuid not null references tenants (id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (tenant_id, bucket, window_start)
);
