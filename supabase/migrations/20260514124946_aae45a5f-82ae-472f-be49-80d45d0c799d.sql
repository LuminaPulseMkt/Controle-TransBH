
create or replace function public.can_manage_settings(_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_role(_uid, 'administrator'::public.app_role)
    or exists (
      select 1 from public.user_permissions
      where user_id = _uid
        and permission = 'settings.manage'
        and granted = true
    )
$$;

drop policy if exists "Admins upload company assets" on storage.objects;
drop policy if exists "Admins update company assets" on storage.objects;
drop policy if exists "Admins delete company assets" on storage.objects;

create policy "Settings managers upload company assets"
on storage.objects for insert to authenticated
with check (bucket_id = 'company-assets' and public.can_manage_settings(auth.uid()));

create policy "Settings managers update company assets"
on storage.objects for update to authenticated
using (bucket_id = 'company-assets' and public.can_manage_settings(auth.uid()))
with check (bucket_id = 'company-assets' and public.can_manage_settings(auth.uid()));

create policy "Settings managers delete company assets"
on storage.objects for delete to authenticated
using (bucket_id = 'company-assets' and public.can_manage_settings(auth.uid()));
