set search_path = public, extensions;

create or replace function public.resolve_public_host(p_host text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select t.slug
  from tenant_domains d
  join tenants t on t.id = d.tenant_id
  where lower(d.hostname) = lower(p_host)
    and d.verification_status = 'verified'
    and t.status = 'active'
  limit 1;
$$;

revoke all on function public.resolve_public_host(text) from public;
grant execute on function public.resolve_public_host(text) to anon, authenticated;
