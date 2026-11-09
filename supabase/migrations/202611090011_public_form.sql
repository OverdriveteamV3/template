set search_path = public, extensions;

create or replace function public.get_public_form(p_slug text, p_kind text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select fv.id
  from tenants t
  join form_definitions fd on fd.tenant_id = t.id and fd.kind = p_kind and fd.active
  join form_versions fv on fv.form_id = fd.id
  where t.slug = p_slug and t.status = 'active' and p_kind in ('contact', 'quote', 'booking_intake')
  order by fv.version desc
  limit 1;
$$;

revoke all on function public.get_public_form(text, text) from public;
grant execute on function public.get_public_form(text, text) to anon, authenticated;
