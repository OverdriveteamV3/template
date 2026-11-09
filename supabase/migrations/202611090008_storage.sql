set search_path = public, extensions;

insert into storage.buckets (id, name, public)
values ('brand', 'brand', true), ('private', 'private', false)
on conflict (id) do nothing;

create policy brand_public_read on storage.objects
for select to anon, authenticated
using (bucket_id = 'brand');

create policy brand_admin_write on storage.objects
for insert to authenticated
with check (
  bucket_id = 'brand'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'pdf')
  and private.tenant_role(((storage.foldername(name))[1])::uuid) in ('owner', 'admin')
);

create policy private_staff_read on storage.objects
for select to authenticated
using (
  bucket_id = 'private'
  and private.tenant_role(((storage.foldername(name))[1])::uuid) in ('owner', 'admin', 'staff')
);

create policy private_admin_write on storage.objects
for insert to authenticated
with check (
  bucket_id = 'private'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'pdf')
  and private.tenant_role(((storage.foldername(name))[1])::uuid) in ('owner', 'admin')
);
