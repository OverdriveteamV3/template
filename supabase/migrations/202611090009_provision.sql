set search_path = public, extensions;

create or replace function public.provision_tenant(p_actor uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_service jsonb;
  v_service_id uuid;
  v_staff uuid;
  v_doc jsonb;
  v_theme jsonb;
begin
  if not exists (select 1 from platform_admins where user_id = p_actor) then
    return jsonb_build_object('error', 'forbidden');
  end if;
  insert into tenants (slug, name, category, timezone, status, preset, created_by)
  values (
    p_payload->>'slug',
    p_payload->>'name',
    coalesce(p_payload->>'category', ''),
    p_payload->>'timezone',
    'active',
    coalesce(p_payload->>'preset', 'custom'),
    p_actor
  ) returning id into v_tenant;

  insert into tenant_domains (tenant_id, hostname, kind, verification_status, verified_at, is_primary)
  values (
    v_tenant,
    (p_payload->>'slug') || '.' || (p_payload->>'rootDomain'),
    'platform_subdomain',
    'verified',
    now(),
    true
  );
  insert into tenant_booking_rules (
    tenant_id, horizon_days, min_notice_minutes, slot_interval_minutes,
    cancellation_cutoff_minutes, reschedule_cutoff_minutes
  ) values (
    v_tenant,
    coalesce((p_payload->>'horizonDays')::integer, 60),
    coalesce((p_payload->>'minNoticeMinutes')::integer, 120),
    coalesce((p_payload->>'slotIntervalMinutes')::integer, 30),
    coalesce((p_payload->>'cancellationCutoffMinutes')::integer, 1440),
    coalesce((p_payload->>'rescheduleCutoffMinutes')::integer, 1440)
  );
  insert into notification_settings (tenant_id, reply_to, public_contact_email, recipients)
  values (
    v_tenant,
    nullif(p_payload->>'replyTo', ''),
    nullif(p_payload->>'publicEmail', ''),
    coalesce(array(select jsonb_array_elements_text(p_payload->'recipients')), '{}')
  );

  insert into staff (tenant_id, display_name, timezone)
  values (v_tenant, coalesce(p_payload->>'staffName', 'Team member'), p_payload->>'timezone')
  returning id into v_staff;
  insert into working_hours (tenant_id, staff_id, weekday, start_minute, end_minute)
  select v_tenant, v_staff, day::integer, 9 * 60, 17 * 60
  from jsonb_array_elements_text(coalesce(p_payload->'weekdays', '[1,2,3,4,5]'::jsonb)) as day;

  for v_service in select * from jsonb_array_elements(coalesce(p_payload->'services', '[]'::jsonb))
  loop
    insert into services (tenant_id, name, description, duration_minutes, price_cents, show_price)
    values (
      v_tenant,
      v_service->>'name',
      coalesce(v_service->>'description', ''),
      coalesce((v_service->>'durationMinutes')::integer, 60),
      nullif(v_service->>'priceCents', '')::integer,
      coalesce((v_service->>'showPrice')::boolean, true)
    ) returning id into v_service_id;
    insert into staff_services (tenant_id, staff_id, service_id) values (v_tenant, v_staff, v_service_id);
  end loop;

  v_doc := p_payload->'document';
  v_theme := p_payload->'theme';
  insert into website_versions (tenant_id, version, status, document, theme, created_by)
  values (v_tenant, 1, 'draft', v_doc, v_theme, p_actor);
  if coalesce((p_payload->>'publish')::boolean, false) then
    update website_versions set status = 'published', published_at = now() where tenant_id = v_tenant and status = 'draft';
    insert into website_versions (tenant_id, version, status, document, theme, created_by, parent_version_id)
    select tenant_id, 2, 'draft', document, theme, p_actor, id
    from website_versions where tenant_id = v_tenant and status = 'published';
  end if;

  if nullif(p_payload->>'ownerEmail', '') is not null then
    insert into tenant_memberships (tenant_id, role, status, invited_email)
    values (v_tenant, 'owner', 'invited', lower(p_payload->>'ownerEmail'));
  end if;

  insert into audit_events (tenant_id, actor_user_id, action, entity_type, entity_id)
  values (v_tenant, p_actor, 'tenant.provision', 'tenant', v_tenant);
  return jsonb_build_object('ok', true, 'tenantId', v_tenant);
end;
$$;

create or replace function public.clone_tenant_template(p_actor uuid, p_source uuid, p_slug text, p_name text, p_timezone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_staff_map jsonb := '{}'::jsonb;
  v_old_staff uuid;
  v_new_staff uuid;
  v_old_service uuid;
  v_new_service uuid;
begin
  if not exists (select 1 from platform_admins where user_id = p_actor) then
    return jsonb_build_object('error', 'forbidden');
  end if;
  if not exists (select 1 from tenants where id = p_source and is_template) then
    return jsonb_build_object('error', 'not_a_template');
  end if;
  insert into tenants (slug, name, category, timezone, status, preset, created_by)
  select p_slug, p_name, category, p_timezone, 'active', preset, p_actor from tenants where id = p_source
  returning id into v_tenant;
  insert into tenant_booking_rules
  select v_tenant, horizon_days, min_notice_minutes, slot_interval_minutes, cancellation_cutoff_minutes, reschedule_cutoff_minutes
  from tenant_booking_rules where tenant_id = p_source;
  insert into notification_settings (tenant_id) values (v_tenant);

  for v_old_service in select id from services where tenant_id = p_source and archived_at is null
  loop
    insert into services (tenant_id, name, description, duration_minutes, price_cents, show_price, buffer_before_minutes, buffer_after_minutes, location, active, sort_order)
    select v_tenant, name, description, duration_minutes, price_cents, show_price, buffer_before_minutes, buffer_after_minutes, location, active, sort_order
    from services where id = v_old_service
    returning id into v_new_service;
    v_staff_map := v_staff_map || jsonb_build_object(v_old_service::text, v_new_service);
  end loop;

  for v_old_staff in select id from staff where tenant_id = p_source and archived_at is null
  loop
    insert into staff (tenant_id, display_name, timezone, bio, active)
    select v_tenant, display_name, p_timezone, bio, active from staff where id = v_old_staff
    returning id into v_new_staff;
    insert into working_hours (tenant_id, staff_id, weekday, start_minute, end_minute)
    select v_tenant, v_new_staff, weekday, start_minute, end_minute from working_hours where staff_id = v_old_staff;
    insert into staff_services (tenant_id, staff_id, service_id)
    select v_tenant, v_new_staff, (v_staff_map->>ss.service_id::text)::uuid
    from staff_services ss where ss.staff_id = v_old_staff;
  end loop;

  insert into website_versions (tenant_id, version, status, document, theme, created_by)
  select v_tenant, 1, 'draft', document, theme, p_actor
  from website_versions
  where tenant_id = p_source and status = 'published'
  union all
  select v_tenant, 1, 'draft', document, theme, p_actor
  from website_versions source
  where tenant_id = p_source and status = 'draft'
    and not exists (select 1 from website_versions published where published.tenant_id = p_source and published.status = 'published')
  limit 1;

  insert into audit_events (tenant_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (v_tenant, p_actor, 'tenant.clone', 'tenant', v_tenant, jsonb_build_object('source', p_source));
  return jsonb_build_object('ok', true, 'tenantId', v_tenant);
end;
$$;

revoke all on function public.provision_tenant(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.clone_tenant_template(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.provision_tenant(uuid, jsonb) to service_role;
grant execute on function public.clone_tenant_template(uuid, uuid, text, text, text) to service_role;
