set search_path = public, extensions;

create or replace function private.slot_is_open(p_tenant uuid, p_staff uuid, p_start timestamptz, p_duration integer)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_staff_tz text;
  v_tenant_tz text;
  v_interval integer;
  v_local timestamp;
  v_minute integer;
  v_end integer;
  v_start_minute integer;
  v_end_minute integer;
begin
  select timezone into v_staff_tz from staff
  where id = p_staff and tenant_id = p_tenant and active and archived_at is null;
  if v_staff_tz is null then return false; end if;
  select timezone into v_tenant_tz from tenants where id = p_tenant;
  select slot_interval_minutes into v_interval from tenant_booking_rules where tenant_id = p_tenant;
  if v_interval is null then return false; end if;
  v_local := p_start at time zone v_staff_tz;
  v_minute := extract(hour from v_local)::integer * 60 + extract(minute from v_local)::integer;
  v_end := v_minute + p_duration;
  if v_end > 1440 then return false; end if;
  if exists (
    select 1 from availability_overrides
    where tenant_id = p_tenant and staff_id is null and kind = 'closed'
      and override_date = (p_start at time zone v_tenant_tz)::date
  ) then return false; end if;
  if exists (
    select 1 from availability_overrides
    where tenant_id = p_tenant and staff_id = p_staff and kind = 'closed' and override_date = v_local::date
  ) then return false; end if;

  select start_minute, end_minute into v_start_minute, v_end_minute
  from availability_overrides
  where tenant_id = p_tenant and staff_id = p_staff and kind = 'custom_hours' and override_date = v_local::date
  limit 1;

  if v_start_minute is null then
    select start_minute, end_minute into v_start_minute, v_end_minute
    from working_hours
    where staff_id = p_staff and weekday = extract(dow from v_local)::integer
      and start_minute <= v_minute and end_minute >= v_end
    order by start_minute
    limit 1;
  end if;

  if v_start_minute is null then return false; end if;
  if v_minute < v_start_minute or v_end > v_end_minute then return false; end if;
  if ((v_minute - v_start_minute) % v_interval) <> 0 then return false; end if;
  return true;
end;
$$;

create or replace function public.current_account()
returns table (user_id uuid, email text, email_confirmed boolean)
language sql
stable
security definer
set search_path = public, auth
as $$
  select id, email, email_confirmed_at is not null from auth.users where id = auth.uid();
$$;

create or replace function public.accept_my_invitations()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
  v_count integer;
begin
  if auth.uid() is null then return 0; end if;
  select email into v_email from auth.users where id = auth.uid();
  update tenant_memberships
  set user_id = auth.uid(), status = 'active'
  where status = 'invited' and user_id is null and lower(invited_email) = lower(v_email);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.get_public_site(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tenant tenants%rowtype;
  v_version website_versions%rowtype;
  v_rules tenant_booking_rules%rowtype;
begin
  select * into v_tenant from tenants where slug = p_slug and status = 'active';
  if not found then return null; end if;
  select * into v_version from website_versions where tenant_id = v_tenant.id and status = 'published';
  if not found then return null; end if;
  select * into v_rules from tenant_booking_rules where tenant_id = v_tenant.id;
  return jsonb_build_object(
    'tenantId', v_tenant.id,
    'slug', v_tenant.slug,
    'timezone', v_tenant.timezone,
    'isDemo', v_tenant.is_demo,
    'name', v_tenant.name,
    'category', v_tenant.category,
    'theme', v_version.theme,
    'document', v_version.document,
    'booking', jsonb_build_object(
      'horizonDays', v_rules.horizon_days,
      'minNoticeMinutes', v_rules.min_notice_minutes,
      'slotIntervalMinutes', v_rules.slot_interval_minutes,
      'cancellationCutoffMinutes', v_rules.cancellation_cutoff_minutes,
      'rescheduleCutoffMinutes', v_rules.reschedule_cutoff_minutes
    ),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'description', s.description,
        'durationMinutes', s.duration_minutes, 'priceCents', s.price_cents,
        'showPrice', s.show_price, 'bufferBefore', s.buffer_before_minutes,
        'bufferAfter', s.buffer_after_minutes, 'location', s.location
      ) order by s.sort_order, s.name)
      from services s where s.tenant_id = v_tenant.id and s.active and s.archived_at is null
    ), '[]'::jsonb),
    'staff', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', st.id, 'name', st.display_name, 'timezone', st.timezone,
        'serviceIds', coalesce((select jsonb_agg(ss.service_id) from staff_services ss where ss.staff_id = st.id), '[]'::jsonb),
        'hours', coalesce((select jsonb_agg(jsonb_build_object('weekday', wh.weekday, 'startMinute', wh.start_minute, 'endMinute', wh.end_minute)) from working_hours wh where wh.staff_id = st.id), '[]'::jsonb),
        'overrides', coalesce((select jsonb_agg(jsonb_build_object('date', o.override_date, 'kind', o.kind, 'startMinute', o.start_minute, 'endMinute', o.end_minute)) from availability_overrides o where o.staff_id = st.id), '[]'::jsonb)
      ))
      from staff st where st.tenant_id = v_tenant.id and st.active and st.archived_at is null
    ), '[]'::jsonb),
    'policies', coalesce((
      select jsonb_agg(jsonb_build_object(
        'documentId', d.id, 'versionId', pv.id, 'slug', d.slug, 'title', pv.title,
        'body', pv.body, 'requiredForBooking', pv.required_for_booking, 'effectiveOn', pv.effective_on
      ))
      from policy_documents d
      join policy_versions pv on pv.document_id = d.id and pv.status = 'published'
      where d.tenant_id = v_tenant.id
        and pv.version = (select max(version) from policy_versions newer where newer.document_id = d.id and newer.status = 'published')
    ), '[]'::jsonb),
    'closedDates', coalesce((
      select jsonb_agg(o.override_date)
      from availability_overrides o
      where o.tenant_id = v_tenant.id and o.staff_id is null and o.kind = 'closed'
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_public_busy(p_slug text, p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_to <= p_from or p_to > p_from + interval '45 days' then
    return null;
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'staffId', h.staff_id,
      'start', lower(h.span),
      'end', upper(h.span)
    ))
    from resource_holds h
    join tenants t on t.id = h.tenant_id
    where t.slug = p_slug and t.status = 'active' and h.status = 'active'
      and h.span && tstzrange(p_from, p_to, '[)')
  ), '[]'::jsonb);
end;
$$;

create or replace function public.book_appointment(
  p_tenant_id uuid,
  p_service_id uuid,
  p_staff_id uuid,
  p_starts_at timestamptz,
  p_idempotency_key uuid,
  p_request_hash text,
  p_full_name text,
  p_phone text,
  p_note text,
  p_policy_version_ids uuid[],
  p_intake jsonb,
  p_form_version_id uuid,
  p_on_behalf_customer_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_confirmed timestamptz;
  v_role text;
  v_service services%rowtype;
  v_rules tenant_booking_rules%rowtype;
  v_tenant tenants%rowtype;
  v_customer tenant_customers%rowtype;
  v_staff_id uuid;
  v_hold_id uuid;
  v_appt_id uuid;
  v_existing appointments%rowtype;
  v_required uuid[];
  v_given uuid[];
  v_end timestamptz;
  v_span tstzrange;
  v_submission uuid;
begin
  if v_uid is null then return jsonb_build_object('error', 'unauthenticated'); end if;
  select email, email_confirmed_at into v_email, v_confirmed from auth.users where id = v_uid;
  if v_confirmed is null then return jsonb_build_object('error', 'email_unconfirmed'); end if;
  select * into v_tenant from tenants where id = p_tenant_id and status = 'active';
  if not found then return jsonb_build_object('error', 'unknown_tenant'); end if;

  if p_idempotency_key is not null then
    select * into v_existing from appointments
    where tenant_id = p_tenant_id and actor_user_id = v_uid and idempotency_key = p_idempotency_key;
    if found then
      if v_existing.request_hash = p_request_hash then
        return jsonb_build_object('ok', true, 'appointmentId', v_existing.id, 'idempotent', true);
      end if;
      return jsonb_build_object('error', 'idempotency_mismatch');
    end if;
  end if;

  v_role := private.tenant_role(p_tenant_id);
  if p_on_behalf_customer_id is not null and v_role not in ('owner', 'admin', 'staff') then
    return jsonb_build_object('error', 'forbidden');
  end if;

  select * into v_service from services
  where id = p_service_id and tenant_id = p_tenant_id and active and archived_at is null;
  if not found then return jsonb_build_object('error', 'unknown_service'); end if;
  select * into v_rules from tenant_booking_rules where tenant_id = p_tenant_id;
  if p_starts_at < now() + make_interval(mins => v_rules.min_notice_minutes) then
    return jsonb_build_object('error', 'too_soon');
  end if;
  if p_starts_at > now() + make_interval(days => v_rules.horizon_days) then
    return jsonb_build_object('error', 'beyond_horizon');
  end if;

  select coalesce(array_agg(pv.id order by pv.id), '{}'::uuid[]) into v_required
  from policy_versions pv
  join policy_documents pd on pd.id = pv.document_id
  where pd.tenant_id = p_tenant_id and pv.status = 'published' and pv.required_for_booking
    and pv.version = (select max(version) from policy_versions newer where newer.document_id = pd.id and newer.status = 'published');
  select coalesce(array_agg(x order by x), '{}'::uuid[]) into v_given
  from unnest(coalesce(p_policy_version_ids, '{}'::uuid[])) as x;
  if p_on_behalf_customer_id is null and v_required is distinct from v_given then
    return jsonb_build_object('error', 'policy_version_mismatch', 'required', v_required);
  end if;

  if p_on_behalf_customer_id is not null then
    select * into v_customer from tenant_customers where id = p_on_behalf_customer_id and tenant_id = p_tenant_id;
    if not found then return jsonb_build_object('error', 'unknown_customer'); end if;
  else
    insert into customer_profiles (user_id, full_name, phone)
    values (v_uid, coalesce(nullif(p_full_name, ''), v_email), nullif(p_phone, ''))
    on conflict (user_id) do update
      set full_name = excluded.full_name, phone = coalesce(excluded.phone, customer_profiles.phone), updated_at = now();
    select * into v_customer from tenant_customers where tenant_id = p_tenant_id and user_id = v_uid;
    if not found then
      insert into tenant_customers (tenant_id, user_id, full_name, email, phone)
      values (p_tenant_id, v_uid, coalesce(nullif(p_full_name, ''), v_email), v_email, nullif(p_phone, ''))
      returning * into v_customer;
    end if;
  end if;

  v_end := p_starts_at + make_interval(mins => v_service.duration_minutes);
  v_span := tstzrange(
    p_starts_at - make_interval(mins => v_service.buffer_before_minutes),
    v_end + make_interval(mins => v_service.buffer_after_minutes),
    '[)'
  );

  if p_staff_id is not null then
    if not exists (
      select 1 from staff_services ss
      join staff s on s.id = ss.staff_id and s.tenant_id = ss.tenant_id
      where ss.tenant_id = p_tenant_id and ss.service_id = p_service_id and ss.staff_id = p_staff_id
        and s.active and s.archived_at is null
    ) then
      return jsonb_build_object('error', 'staff_ineligible');
    end if;
    if not private.slot_is_open(p_tenant_id, p_staff_id, p_starts_at, v_service.duration_minutes) then
      return jsonb_build_object('error', 'slot_unavailable');
    end if;
    begin
      insert into resource_holds (tenant_id, staff_id, span, kind, status)
      values (p_tenant_id, p_staff_id, v_span, 'appointment', 'active')
      returning id into v_hold_id;
    exception when exclusion_violation then
      return jsonb_build_object('error', 'slot_unavailable');
    end;
    v_staff_id := p_staff_id;
  else
    for v_staff_id in
      select s.id from staff s
      join staff_services ss on ss.staff_id = s.id and ss.tenant_id = s.tenant_id
      where s.tenant_id = p_tenant_id and ss.service_id = p_service_id and s.active and s.archived_at is null
        and private.slot_is_open(p_tenant_id, s.id, p_starts_at, v_service.duration_minutes)
      order by (
        select count(*) from appointments a
        where a.staff_id = s.id and a.status in ('confirmed', 'completed', 'no_show')
          and a.starts_at >= date_trunc('day', p_starts_at) and a.starts_at < date_trunc('day', p_starts_at) + interval '1 day'
      ), s.id
    loop
      begin
        insert into resource_holds (tenant_id, staff_id, span, kind, status)
        values (p_tenant_id, v_staff_id, v_span, 'appointment', 'active')
        returning id into v_hold_id;
        exit;
      exception when exclusion_violation then
        v_hold_id := null;
      end;
    end loop;
    if v_hold_id is null then return jsonb_build_object('error', 'slot_unavailable'); end if;
  end if;

  insert into appointments (
    tenant_id, customer_id, staff_id, service_id, starts_at, ends_at,
    buffer_before_minutes, buffer_after_minutes, hold_id, status, timezone,
    idempotency_key, request_hash, actor_user_id, customer_note, source,
    cancellation_cutoff_minutes, reschedule_cutoff_minutes
  ) values (
    p_tenant_id, v_customer.id, v_staff_id, p_service_id, p_starts_at, v_end,
    v_service.buffer_before_minutes, v_service.buffer_after_minutes, v_hold_id,
    'confirmed', v_tenant.timezone, p_idempotency_key, p_request_hash, v_uid, nullif(p_note, ''),
    case when p_on_behalf_customer_id is null then 'customer' else 'staff' end,
    v_rules.cancellation_cutoff_minutes, v_rules.reschedule_cutoff_minutes
  ) returning id into v_appt_id;

  update resource_holds set appointment_id = v_appt_id where id = v_hold_id;
  insert into appointment_events (tenant_id, appointment_id, event_type, actor_user_id, to_status, metadata)
  values (p_tenant_id, v_appt_id, 'created', v_uid, 'confirmed', jsonb_build_object('onBehalf', p_on_behalf_customer_id is not null));

  if p_on_behalf_customer_id is null and coalesce(array_length(v_required, 1), 0) > 0 then
    insert into policy_acceptances (tenant_id, appointment_id, policy_version_id, user_id)
    select p_tenant_id, v_appt_id, x, v_uid from unnest(v_required) as x;
  end if;

  if p_form_version_id is not null then
    insert into submissions (tenant_id, form_version_id, kind, answers, status, submitter_user_id, appointment_id, customer_email)
    select p_tenant_id, fv.id, 'booking_intake', coalesce(p_intake, '{}'::jsonb), 'unread', v_uid, v_appt_id, v_customer.email
    from form_versions fv
    join form_definitions fd on fd.id = fv.form_id
    where fv.id = p_form_version_id and fv.tenant_id = p_tenant_id and fd.kind = 'booking_intake'
    returning id into v_submission;
    update appointments set intake_submission_id = v_submission where id = v_appt_id and v_submission is not null;
  end if;

  insert into notification_outbox (tenant_id, dedupe_key, event_type, payload)
  values (p_tenant_id, 'appointment:' || v_appt_id::text || ':confirmed', 'booking_confirmed', jsonb_build_object('appointmentId', v_appt_id))
  on conflict (tenant_id, dedupe_key) do nothing;

  return jsonb_build_object('ok', true, 'appointmentId', v_appt_id, 'staffId', v_staff_id);
exception when unique_violation then
  select * into v_existing from appointments
  where tenant_id = p_tenant_id and actor_user_id = v_uid and idempotency_key = p_idempotency_key;
  if found and v_existing.request_hash = p_request_hash then
    return jsonb_build_object('ok', true, 'appointmentId', v_existing.id, 'idempotent', true);
  end if;
  return jsonb_build_object('error', 'idempotency_mismatch');
end;
$$;

create or replace function public.reschedule_appointment(p_appointment_id uuid, p_starts_at timestamptz, p_staff_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt appointments%rowtype;
  v_service services%rowtype;
  v_role text;
  v_owns boolean;
  v_staff uuid;
  v_end timestamptz;
  v_span tstzrange;
begin
  if auth.uid() is null then return jsonb_build_object('error', 'unauthenticated'); end if;
  select * into v_appt from appointments where id = p_appointment_id and status = 'confirmed';
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  v_role := private.tenant_role(v_appt.tenant_id);
  select user_id = auth.uid() into v_owns from tenant_customers where id = v_appt.customer_id;
  if coalesce(v_owns, false) = false and v_role not in ('owner', 'admin', 'staff') then
    return jsonb_build_object('error', 'forbidden');
  end if;
  if v_role is null and now() > v_appt.starts_at - make_interval(mins => v_appt.reschedule_cutoff_minutes) then
    return jsonb_build_object('error', 'cutoff_passed');
  end if;
  select * into v_service from services where id = v_appt.service_id and tenant_id = v_appt.tenant_id;
  v_staff := coalesce(p_staff_id, v_appt.staff_id);
  if not private.slot_is_open(v_appt.tenant_id, v_staff, p_starts_at, v_service.duration_minutes) then
    return jsonb_build_object('error', 'slot_unavailable');
  end if;
  v_end := p_starts_at + make_interval(mins => v_service.duration_minutes);
  v_span := tstzrange(
    p_starts_at - make_interval(mins => v_appt.buffer_before_minutes),
    v_end + make_interval(mins => v_appt.buffer_after_minutes),
    '[)'
  );
  begin
    update resource_holds set staff_id = v_staff, span = v_span
    where id = v_appt.hold_id and status = 'active';
    if not found then return jsonb_build_object('error', 'not_found'); end if;
  exception when exclusion_violation then
    return jsonb_build_object('error', 'slot_unavailable');
  end;
  update appointments set starts_at = p_starts_at, ends_at = v_end, staff_id = v_staff where id = v_appt.id;
  insert into appointment_events (tenant_id, appointment_id, event_type, actor_user_id, from_status, to_status)
  values (v_appt.tenant_id, v_appt.id, 'rescheduled', auth.uid(), 'confirmed', 'confirmed');
  insert into notification_outbox (tenant_id, dedupe_key, event_type, payload)
  values (v_appt.tenant_id, 'appointment:' || v_appt.id::text || ':rescheduled:' || extract(epoch from p_starts_at)::text, 'booking_rescheduled', jsonb_build_object('appointmentId', v_appt.id))
  on conflict (tenant_id, dedupe_key) do nothing;
  return jsonb_build_object('ok', true, 'appointmentId', v_appt.id);
end;
$$;

create or replace function public.cancel_appointment(p_appointment_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt appointments%rowtype;
  v_role text;
  v_owns boolean;
begin
  if auth.uid() is null then return jsonb_build_object('error', 'unauthenticated'); end if;
  select * into v_appt from appointments where id = p_appointment_id;
  if not found or v_appt.status <> 'confirmed' then return jsonb_build_object('error', 'not_found'); end if;
  v_role := private.tenant_role(v_appt.tenant_id);
  select user_id = auth.uid() into v_owns from tenant_customers where id = v_appt.customer_id;
  if coalesce(v_owns, false) = false and v_role not in ('owner', 'admin', 'staff') then
    return jsonb_build_object('error', 'forbidden');
  end if;
  if v_role is null and now() > v_appt.starts_at - make_interval(mins => v_appt.cancellation_cutoff_minutes) then
    return jsonb_build_object('error', 'cutoff_passed');
  end if;
  update appointments
  set status = 'cancelled', cancelled_at = now(), cancellation_reason = nullif(p_reason, '')
  where id = v_appt.id;
  update resource_holds set status = 'released' where id = v_appt.hold_id;
  insert into appointment_events (tenant_id, appointment_id, event_type, actor_user_id, from_status, to_status)
  values (v_appt.tenant_id, v_appt.id, 'cancelled', auth.uid(), 'confirmed', 'cancelled');
  insert into notification_outbox (tenant_id, dedupe_key, event_type, payload)
  values (v_appt.tenant_id, 'appointment:' || v_appt.id::text || ':cancelled', 'booking_cancelled', jsonb_build_object('appointmentId', v_appt.id))
  on conflict (tenant_id, dedupe_key) do nothing;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.set_appointment_status(p_appointment_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt appointments%rowtype;
begin
  if private.tenant_role((select tenant_id from appointments where id = p_appointment_id)) not in ('owner', 'admin', 'staff') then
    return jsonb_build_object('error', 'forbidden');
  end if;
  select * into v_appt from appointments where id = p_appointment_id;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  if p_status not in ('completed', 'no_show', 'cancelled') then
    return jsonb_build_object('error', 'invalid_status');
  end if;
  if p_status in ('completed', 'no_show') and v_appt.starts_at > now() then
    return jsonb_build_object('error', 'too_early');
  end if;
  if p_status = 'cancelled' then
    return public.cancel_appointment(p_appointment_id, 'Updated by staff');
  end if;
  update appointments set status = p_status where id = v_appt.id;
  insert into appointment_events (tenant_id, appointment_id, event_type, actor_user_id, from_status, to_status)
  values (v_appt.tenant_id, v_appt.id, 'status_changed', auth.uid(), v_appt.status, p_status);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.create_blocked_time(p_tenant_id uuid, p_staff_id uuid, p_starts_at timestamptz, p_ends_at timestamptz, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_hold uuid;
begin
  if private.tenant_role(p_tenant_id) not in ('owner', 'admin', 'staff') then
    return jsonb_build_object('error', 'forbidden');
  end if;
  if p_ends_at <= p_starts_at then return jsonb_build_object('error', 'invalid_range'); end if;
  insert into blocked_times (tenant_id, staff_id, starts_at, ends_at, reason, created_by)
  values (p_tenant_id, p_staff_id, p_starts_at, p_ends_at, coalesce(p_reason, ''), auth.uid())
  returning id into v_id;
  begin
    insert into resource_holds (tenant_id, staff_id, span, kind, status, blocked_time_id)
    values (p_tenant_id, p_staff_id, tstzrange(p_starts_at, p_ends_at, '[)'), 'block', 'active', v_id)
    returning id into v_hold;
  exception when exclusion_violation then
    delete from blocked_times where id = v_id;
    return jsonb_build_object('error', 'slot_unavailable');
  end;
  return jsonb_build_object('ok', true, 'blockedTimeId', v_id);
end;
$$;

create or replace function public.consume_rate_limit(p_tenant_id uuid, p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public_rate_limits (tenant_id, bucket, window_start, hits)
  values (p_tenant_id, p_bucket, v_window, 1)
  on conflict (tenant_id, bucket, window_start) do update set hits = public_rate_limits.hits + 1
  returning hits into v_hits;
  return v_hits <= p_limit;
end;
$$;

create or replace function public.create_public_submission(
  p_tenant_id uuid,
  p_form_version_id uuid,
  p_answers jsonb,
  p_email text,
  p_ip_hash text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_kind text;
begin
  select fd.kind into v_kind
  from form_versions fv
  join form_definitions fd on fd.id = fv.form_id
  where fv.id = p_form_version_id and fv.tenant_id = p_tenant_id and fd.tenant_id = p_tenant_id and fd.active
    and fd.kind in ('contact', 'quote');
  if v_kind is null then return jsonb_build_object('error', 'unknown_form'); end if;
  if not public.consume_rate_limit(p_tenant_id, coalesce(p_ip_hash, 'anon') || ':' || v_kind, 5, 3600) then
    return jsonb_build_object('error', 'rate_limited');
  end if;
  insert into submissions (tenant_id, form_version_id, kind, answers, status, customer_email, ip_hash, submitter_user_id)
  values (p_tenant_id, p_form_version_id, v_kind, p_answers, 'unread', p_email, p_ip_hash, auth.uid())
  returning id into v_id;
  insert into notification_outbox (tenant_id, dedupe_key, event_type, payload)
  values (p_tenant_id, 'submission:' || v_id::text, 'submission_received', jsonb_build_object('submissionId', v_id))
  on conflict (tenant_id, dedupe_key) do nothing;
  return jsonb_build_object('ok', true, 'submissionId', v_id);
end;
$$;

create or replace function public.publish_website(p_tenant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft website_versions%rowtype;
  v_next integer;
begin
  if private.tenant_role(p_tenant_id) not in ('owner', 'admin') then
    return jsonb_build_object('error', 'forbidden');
  end if;
  select * into v_draft from website_versions where tenant_id = p_tenant_id and status = 'draft' for update;
  if not found then return jsonb_build_object('error', 'no_draft'); end if;
  update website_versions set status = 'archived' where tenant_id = p_tenant_id and status = 'published';
  update website_versions set status = 'published', published_at = now() where id = v_draft.id;
  select coalesce(max(version), 0) + 1 into v_next from website_versions where tenant_id = p_tenant_id;
  insert into website_versions (tenant_id, version, status, document, theme, created_by, parent_version_id)
  values (p_tenant_id, v_next, 'draft', v_draft.document, v_draft.theme, auth.uid(), v_draft.id);
  insert into audit_events (tenant_id, actor_user_id, action, entity_type, entity_id)
  values (p_tenant_id, auth.uid(), 'website.publish', 'website_version', v_draft.id);
  return jsonb_build_object('ok', true, 'versionId', v_draft.id);
end;
$$;

create or replace function public.rollback_website(p_tenant_id uuid, p_version_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source website_versions%rowtype;
  v_next integer;
  v_id uuid;
begin
  if private.tenant_role(p_tenant_id) not in ('owner', 'admin') then
    return jsonb_build_object('error', 'forbidden');
  end if;
  select * into v_source from website_versions where id = p_version_id and tenant_id = p_tenant_id and status = 'archived';
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  update website_versions set status = 'archived' where tenant_id = p_tenant_id and status = 'published';
  select coalesce(max(version), 0) + 1 into v_next from website_versions where tenant_id = p_tenant_id;
  insert into website_versions (tenant_id, version, status, document, theme, created_by, parent_version_id, published_at)
  values (p_tenant_id, v_next, 'published', v_source.document, v_source.theme, auth.uid(), v_source.id, now())
  returning id into v_id;
  insert into audit_events (tenant_id, actor_user_id, action, entity_type, entity_id)
  values (p_tenant_id, auth.uid(), 'website.rollback', 'website_version', v_id);
  return jsonb_build_object('ok', true, 'versionId', v_id);
end;
$$;

create or replace function public.set_member_role(p_membership_id uuid, p_role text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row tenant_memberships%rowtype;
  v_actor text;
begin
  select * into v_row from tenant_memberships where id = p_membership_id;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  v_actor := private.tenant_role(v_row.tenant_id);
  if v_actor is null then return jsonb_build_object('error', 'forbidden'); end if;
  if p_role not in ('admin', 'staff', 'owner') then return jsonb_build_object('error', 'invalid_role'); end if;
  if p_role = 'owner' and v_actor <> 'owner' then return jsonb_build_object('error', 'forbidden'); end if;
  if v_actor = 'admin' and v_row.role = 'owner' then return jsonb_build_object('error', 'forbidden'); end if;
  if v_actor not in ('owner', 'admin') then return jsonb_build_object('error', 'forbidden'); end if;
  update tenant_memberships set role = p_role where id = v_row.id;
  insert into audit_events (tenant_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_row.tenant_id, auth.uid(), 'membership.role', 'membership', v_row.id, jsonb_build_object('role', p_role));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.claim_outbox(p_limit integer)
returns setof notification_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update notification_outbox
  set status = 'sending', locked_at = now(), attempts = attempts + 1
  where id in (
    select id from notification_outbox
    where status in ('pending', 'failed') and next_attempt_at <= now() and attempts < 8
    order by created_at
    for update skip locked
    limit p_limit
  )
  returning *;
end;
$$;

revoke all on function public.current_account() from public;
revoke all on function public.accept_my_invitations() from public;
revoke all on function public.get_public_site(text) from public;
revoke all on function public.get_public_busy(text, timestamptz, timestamptz) from public;
revoke all on function public.book_appointment(uuid, uuid, uuid, timestamptz, uuid, text, text, text, text, uuid[], jsonb, uuid, uuid) from public;
revoke all on function public.reschedule_appointment(uuid, timestamptz, uuid) from public;
revoke all on function public.cancel_appointment(uuid, text) from public;
revoke all on function public.set_appointment_status(uuid, text) from public;
revoke all on function public.create_blocked_time(uuid, uuid, timestamptz, timestamptz, text) from public;
revoke all on function public.consume_rate_limit(uuid, text, integer, integer) from public;
revoke all on function public.create_public_submission(uuid, uuid, jsonb, text, text) from public;
revoke all on function public.publish_website(uuid) from public;
revoke all on function public.rollback_website(uuid, uuid) from public;
revoke all on function public.set_member_role(uuid, text) from public;
revoke all on function public.claim_outbox(integer) from public;

grant execute on function public.current_account() to authenticated;
grant execute on function public.accept_my_invitations() to authenticated;
grant execute on function public.get_public_site(text) to anon, authenticated;
grant execute on function public.get_public_busy(text, timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.book_appointment(uuid, uuid, uuid, timestamptz, uuid, text, text, text, text, uuid[], jsonb, uuid, uuid) to authenticated;
grant execute on function public.reschedule_appointment(uuid, timestamptz, uuid) to authenticated;
grant execute on function public.cancel_appointment(uuid, text) to authenticated;
grant execute on function public.set_appointment_status(uuid, text) to authenticated;
grant execute on function public.create_blocked_time(uuid, uuid, timestamptz, timestamptz, text) to authenticated;
grant execute on function public.consume_rate_limit(uuid, text, integer, integer) to anon, authenticated, service_role;
grant execute on function public.create_public_submission(uuid, uuid, jsonb, text, text) to anon, authenticated;
grant execute on function public.publish_website(uuid) to authenticated;
grant execute on function public.rollback_website(uuid, uuid) to authenticated;
grant execute on function public.set_member_role(uuid, text) to authenticated;
grant execute on function public.claim_outbox(integer) to service_role;
