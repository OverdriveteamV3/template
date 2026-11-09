set search_path = public, extensions;

create table working_hours (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  staff_id uuid not null,
  weekday integer not null check (weekday between 0 and 6),
  start_minute integer not null check (start_minute >= 0 and start_minute < 1440),
  end_minute integer not null check (end_minute > start_minute and end_minute <= 1440),
  unique (tenant_id, id),
  foreign key (tenant_id, staff_id) references staff (tenant_id, id) on delete cascade,
  constraint working_hours_no_overlap exclude using gist (
    staff_id with =,
    weekday with =,
    int4range(start_minute, end_minute, '[)') with &&
  )
);

create table availability_overrides (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  staff_id uuid,
  override_date date not null,
  kind text not null check (kind in ('closed', 'custom_hours')),
  start_minute integer,
  end_minute integer,
  note text not null default '',
  unique (tenant_id, id),
  foreign key (tenant_id, staff_id) references staff (tenant_id, id) on delete cascade,
  check (
    (kind = 'closed' and start_minute is null and end_minute is null)
    or (kind = 'custom_hours' and start_minute is not null and end_minute is not null and end_minute > start_minute)
  )
);

create table blocked_times (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  staff_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '',
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, staff_id) references staff (tenant_id, id) on delete cascade,
  check (ends_at > starts_at)
);

create table resource_holds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  staff_id uuid not null,
  span tstzrange not null,
  kind text not null check (kind in ('appointment', 'block')),
  appointment_id uuid,
  blocked_time_id uuid,
  status text not null default 'active' check (status in ('active', 'released')),
  foreign key (tenant_id, staff_id) references staff (tenant_id, id),
  check (lower(span) is not null and upper(span) is not null and lower_inc(span) and not upper_inc(span)),
  constraint resource_holds_no_overlap exclude using gist (staff_id with =, span with &&) where (status = 'active')
);

create index resource_holds_staff_span on resource_holds using gist (staff_id, span);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  customer_id uuid not null,
  staff_id uuid not null,
  service_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  buffer_before_minutes integer not null default 0,
  buffer_after_minutes integer not null default 0,
  hold_id uuid,
  status text not null check (status in ('confirmed', 'completed', 'no_show', 'cancelled')),
  timezone text not null,
  intake_submission_id uuid,
  idempotency_key uuid,
  request_hash text,
  actor_user_id uuid,
  customer_note text,
  source text not null check (source in ('customer', 'staff', 'owner')),
  cancellation_cutoff_minutes integer not null,
  reschedule_cutoff_minutes integer not null,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, customer_id) references tenant_customers (tenant_id, id),
  foreign key (tenant_id, staff_id) references staff (tenant_id, id),
  foreign key (tenant_id, service_id) references services (tenant_id, id),
  check (ends_at > starts_at)
);

create unique index appointments_idempotency on appointments (tenant_id, actor_user_id, idempotency_key) where idempotency_key is not null;
create index appointments_tenant_start on appointments (tenant_id, starts_at);
create index appointments_staff_start on appointments (staff_id, starts_at);

alter table resource_holds
  add constraint resource_holds_appointment_fkey foreign key (appointment_id) references appointments (id) deferrable initially deferred,
  add constraint resource_holds_block_fkey foreign key (blocked_time_id) references blocked_times (id) deferrable initially deferred;

alter table appointments
  add constraint appointments_hold_fkey foreign key (hold_id) references resource_holds (id) deferrable initially deferred;

create table appointment_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  appointment_id uuid not null references appointments (id) on delete cascade,
  event_type text not null,
  actor_user_id uuid,
  from_status text,
  to_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index appointment_events_appointment on appointment_events (appointment_id, created_at);
