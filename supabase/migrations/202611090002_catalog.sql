set search_path = public, extensions;

create table customer_profiles (
  user_id uuid primary key,
  full_name text not null default '',
  phone text,
  updated_at timestamptz not null default now()
);

create table tenant_customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  user_id uuid,
  full_name text not null default '',
  email text not null,
  phone text,
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create unique index tenant_customers_user on tenant_customers (tenant_id, user_id) where user_id is not null;
create unique index tenant_customers_email on tenant_customers (tenant_id, lower(email));

create table services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  name text not null,
  description text not null default '',
  duration_minutes integer not null check (duration_minutes between 5 and 480),
  price_cents integer check (price_cents is null or price_cents >= 0),
  show_price boolean not null default true,
  buffer_before_minutes integer not null default 0 check (buffer_before_minutes >= 0),
  buffer_after_minutes integer not null default 0 check (buffer_after_minutes >= 0),
  location text not null default '',
  active boolean not null default true,
  archived_at timestamptz,
  sort_order integer not null default 0,
  unique (tenant_id, id)
);

create table staff (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  user_id uuid,
  display_name text not null,
  email text,
  timezone text not null,
  bio text not null default '',
  active boolean not null default true,
  archived_at timestamptz,
  unique (tenant_id, id)
);

create table staff_services (
  tenant_id uuid not null,
  staff_id uuid not null,
  service_id uuid not null,
  primary key (staff_id, service_id),
  foreign key (tenant_id, staff_id) references staff (tenant_id, id) on delete cascade,
  foreign key (tenant_id, service_id) references services (tenant_id, id) on delete cascade
);
