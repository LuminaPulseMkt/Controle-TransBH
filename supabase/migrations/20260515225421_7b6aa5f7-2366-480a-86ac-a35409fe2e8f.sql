-- 1. transport-photos: DELETE only admins
drop policy if exists "Authenticated delete photos" on storage.objects;
create policy "Admins delete transport photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'transport-photos'
    and public.has_role(auth.uid(), 'administrator'::public.app_role)
  );

-- 2. documents bucket: admin can UPDATE/DELETE
create policy "Admins update documents bucket"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'documents'
    and public.has_role(auth.uid(), 'administrator'::public.app_role)
  );

create policy "Admins delete documents bucket"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and public.has_role(auth.uid(), 'administrator'::public.app_role)
  );

-- 3. Revoke EXECUTE from anon/public on internal SECURITY DEFINER functions
revoke execute on function public.handle_new_user() from anon, public;
revoke execute on function public.update_updated_at_column() from anon, public;
revoke execute on function public.mark_overdue_receivables() from anon, public;
revoke execute on function public.has_role(uuid, public.app_role) from anon, public;
revoke execute on function public.can_manage_settings(uuid) from anon, public;
revoke execute on function public.is_authenticated() from anon, public;