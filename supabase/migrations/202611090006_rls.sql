set search_path = public, extensions;

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;

create or replace function private.tenant_role(p_tenant uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from tenant_memberships
  where tenant_id = p_tenant and user_id = auth.uid() and status = 'active'
  limit 1;
$$;

revoke all on function private.is_platform_admin() from public, anon;
revoke all on function private.tenant_role(uuid) from public, anon;
grant execute on function private.is_platform_admin() to authenticated;
grant execute on function private.tenant_role(uuid) to authenticated;

alter table tenants enable row level security;
alter table tenant_domains enable row level security;
alter table tenant_memberships enable row level security;
alter table platform_admins enable row level security;
alter table tenant_booking_rules enable row level security;
alter table auth_transfers enable row level security;
alter table customer_profiles enable row level security;
alter table tenant_customers enable row level security;
alter table services enable row level security;
alter table staff enable row level security;
alter table staff_services enable row level security;
alter table working_hours enable row level security;
alter table availability_overrides enable row level security;
alter table blocked_times enable row level security;
alter table resource_holds enable row level security;
alter table appointments enable row level security;
alter table appointment_events enable row level security;
alter table form_definitions enable row level security;
alter table form_versions enable row level security;
alter table submissions enable row level security;
alter table submission_notes enable row level security;
alter table website_versions enable row level security;
alter table assets enable row level security;
alter table policy_documents enable row level security;
alter table policy_versions enable row level security;
alter table policy_acceptances enable row level security;
alter table public_rate_limits enable row level security;
alter table notification_settings enable row level security;
alter table notification_outbox enable row level security;
alter table audit_events enable row level security;

revoke all on all tables in schema public from anon, authenticated;

grant select on tenants to authenticated;
create policy tenants_read on tenants for select to authenticated
using (private.tenant_role(id) is not null or private.is_platform_admin());

grant select, insert, update on tenant_domains to authenticated;
create policy domains_read on tenant_domains for select to authenticated
using (private.tenant_role(tenant_id) in ('owner', 'admin') or private.is_platform_admin());
create policy domains_write on tenant_domains for all to authenticated
using (private.tenant_role(tenant_id) = 'owner' or private.is_platform_admin())
with check (private.tenant_role(tenant_id) = 'owner' or private.is_platform_admin());

grant select on tenant_memberships to authenticated;
create policy memberships_read on tenant_memberships for select to authenticated
using (user_id = auth.uid() or private.tenant_role(tenant_id) in ('owner', 'admin') or private.is_platform_admin());

grant select on platform_admins to authenticated;
create policy platform_admins_read on platform_admins for select to authenticated
using (user_id = auth.uid() or private.is_platform_admin());

grant select, update on tenant_booking_rules to authenticated;
create policy rules_read on tenant_booking_rules for select to authenticated
using (private.tenant_role(tenant_id) is not null);
create policy rules_write on tenant_booking_rules for update to authenticated
using (private.tenant_role(tenant_id) in ('owner', 'admin'))
with check (private.tenant_role(tenant_id) in ('owner', 'admin'));

grant select, insert, update on customer_profiles to authenticated;
create policy profiles_self on customer_profiles for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select on tenant_customers to authenticated;
create policy customers_read on tenant_customers for select to authenticated
using (user_id = auth.uid() or private.tenant_role(tenant_id) in ('owner', 'admin', 'staff'));

grant select, insert, update on services to authenticated;
create policy services_read on services for select to authenticated
using (private.tenant_role(tenant_id) is not null);
create policy services_write on services for all to authenticated
using (private.tenant_role(tenant_id) in ('owner', 'admin'))
with check (private.tenant_role(tenant_id) in ('owner', 'admin'));

grant select, insert, update on staff to authenticated;
create policy staff_read on staff for select to authenticated
using (private.tenant_role(tenant_id) is not null or user_id = auth.uid());
create policy staff_write on staff for all to authenticated
using (private.tenant_role(tenant_id) in ('owner', 'admin'))
with check (private.tenant_role(tenant_id) in ('owner', 'admin'));

grant select, insert, delete on staff_services to authenticated;
create policy staff_services_read on staff_services for select to authenticated
using (private.tenant_role(tenant_id) is not null);
create policy staff_services_write on staff_services for all to authenticated
using (private.tenant_role(tenant_id) in ('owner', 'admin'))
with check (private.tenant_role(tenant_id) in ('owner', 'admin'));

grant select, insert, update, delete on working_hours to authenticated;
create policy hours_read on working_hours for select to authenticated
using (private.tenant_role(tenant_id) is not null);
create policy hours_write on working_hours for all to authenticated
using (private.tenant_role(tenant_id) in ('owner', 'admin') or exists (
  select 1 from staff s where s.id = working_hours.staff_id and s.user_id = auth.uid() and s.tenant_id = working_hours.tenant_id
))
with check (private.tenant_role(tenant_id) in ('owner', 'admin') or exists (
  select 1 from staff s where s.id = working_hours.staff_id and s.user_id = auth.uid() and s.tenant_id = working_hours.tenant_id
));

grant select, insert, delete on availability_overrides to authenticated;
create policy overrides_staff on availability_overrides for all to authenticated
using (private.tenant_role(tenant_id) in ('owner', 'admin', 'staff'))
with check (private.tenant_role(tenant_id) in ('owner', 'admin', 'staff'));

grant select, insert on blocked_times to authenticated;
create policy blocks_staff on blocked_times for select to authenticated
using (private.tenant_role(tenant_id) in ('owner', 'admin', 'staff'));
create policy blocks_insert on blocked_times for insert to authenticated
with check (private.tenant_role(tenant_id) in ('owner', 'admin', 'staff'));

grant select on resource_holds to authenticated;
create policy holds_staff on resource_holds for select to authenticated
using (private.tenant_role(tenant_id) in ('owner', 'admin', 'staff'));

grant select on appointments to authenticated;
create policy appointments_read on appointments for select to authenticated
using (
  private.tenant_role(tenant_id) in ('owner', 'admin', 'staff')
  or exists (
    select 1 from tenant_customers c
    where c.id = appointments.customer_id and c.tenant_id = appointments.tenant_id and c.user_id = auth.uid()
  )
);

grant select on appointment_events to authenticated;
create policy events_read on appointment_events for select to authenticated
using (
  private.tenant_role(tenant_id) in ('owner', 'admin', 'staff')
  or exists (
    select 1 from appointments a
    join tenant_customers c on c.id = a.customer_id
    where a.id = appointment_events.appointment_id and c.user_id = auth.uid()
  )
);

grant select, insert, update on form_definitions to authenticated;
create policy forms_read on form_definitions for select to authenticated
using (private.tenant_role(tenant_id) in ('owner', 'admin', 'staff'));
create policy forms_write on form_definitions for all to authenticated
using (private.tenant_role(tenant_id) in ('owner', 'admin'))
with check (private.tenant_role(tenant_id) in ('owner', 'admin'));

grant select, insert on form_versions to authenticated;
create policy form_versions_read on form_versions for select to authenticated
using (private.tenant_role(tenant_id) in ('owner', 'admin', 'staff'));
create policy form_versions_insert on form_versions for insert to authenticated
with check (private.tenant_role(tenant_id) in ('owner', 'admin'));

grant select, update on submissions to authenticated;
create policy submissions_read on submissions for select to authenticated
using (
  submitter_user_id = auth.uid()
  or private.tenant_role(tenant_id) in ('owner', 'admin', 'staff')
);
create policy submissions_update on submissions for update to authenticated
using (private.tenant_role(tenant_id) in ('owner', 'admin', 'staff'))
with check (private.tenant_role(tenant_id) in ('owner', 'admin', 'staff'));

grant select, insert on submission_notes to authenticated;
create policy notes_staff on submission_notes for all to authenticated
using (private.tenant_role(tenant_id) in ('owner', 'admin', 'staff'))
with check (private.tenant_role(tenant_id) in ('owner', 'admin', 'staff'));

grant select, insert, update on website_versions to authenticated;
create policy website_read on website_versions for select to authenticated
using (
  private.tenant_role(tenant_id) in ('owner', 'admin')
  or (status = 'published' and private.tenant_role(tenant_id) is not null)
);
create policy website_insert on website_versions for insert to authenticated
with check (status = 'draft' and private.tenant_role(tenant_id) in ('owner', 'admin'));
create policy website_update on website_versions for update to authenticated
using (status = 'draft' and private.tenant_role(tenant_id) in ('owner', 'admin'))
with check (status = 'draft' and private.tenant_role(tenant_id) in ('owner', 'admin'));

grant select, insert on assets to authenticated;
create policy assets_read on assets for select to authenticated
using (private.tenant_role(tenant_id) in ('owner', 'admin', 'staff') or visibility = 'public');
create policy assets_insert on assets for insert to authenticated
with check (private.tenant_role(tenant_id) in ('owner', 'admin'));

grant select, insert, update on policy_documents to authenticated;
create policy policy_docs on policy_documents for all to authenticated
using (private.tenant_role(tenant_id) in ('owner', 'admin'))
with check (private.tenant_role(tenant_id) in ('owner', 'admin'));

grant select, insert on policy_versions to authenticated;
create policy policy_versions_read on policy_versions for select to authenticated
using (private.tenant_role(tenant_id) in ('owner', 'admin') or status = 'published');
create policy policy_versions_insert on policy_versions for insert to authenticated
with check (private.tenant_role(tenant_id) in ('owner', 'admin'));

grant select on policy_acceptances to authenticated;
create policy acceptances_read on policy_acceptances for select to authenticated
using (user_id = auth.uid() or private.tenant_role(tenant_id) in ('owner', 'admin', 'staff'));

grant select, update on notification_settings to authenticated;
create policy notifications_admin on notification_settings for all to authenticated
using (private.tenant_role(tenant_id) in ('owner', 'admin'))
with check (private.tenant_role(tenant_id) in ('owner', 'admin'));

grant select on notification_outbox to authenticated;
create policy outbox_admin on notification_outbox for select to authenticated
using (private.tenant_role(tenant_id) in ('owner', 'admin'));

grant select on audit_events to authenticated;
create policy audit_read on audit_events for select to authenticated
using (
  (tenant_id is not null and private.tenant_role(tenant_id) in ('owner', 'admin'))
  or private.is_platform_admin()
);
