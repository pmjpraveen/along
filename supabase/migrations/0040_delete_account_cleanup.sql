-- Deleting an account now also clears the preferred currency, and a person can remove their own profile pictures from storage
-- (the app deletes the files after the account is anonymised).
create policy avatars_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if exists (
    select 1 from trip_members o join trips t on t.id = o.trip_id
     where o.user_id = v_me and o.role = 'owner' and o.status = 'active' and t.deleted_at is null and t.status not in ('completed', 'archived')
       and exists (select 1 from trip_members x where x.trip_id = o.trip_id and x.status = 'active' and x.user_id is distinct from v_me)
  ) then raise exception 'owns_open_trips' using errcode = '55000'; end if;

  update users set display_name = 'Deleted user', email = 'deleted-' || v_me || '@deleted.invalid', avatar_url = null, country = null, preferred_currency = null, status = 'disabled' where id = v_me;
  update trip_members set display_name = 'Deleted user', avatar_url = null where user_id = v_me;
  delete from notifications where user_id = v_me;
  delete from notification_preferences where user_id = v_me;
  delete from push_tokens where user_id = v_me;
  delete from auth.identities where user_id = v_me;
  delete from auth.sessions where user_id = v_me;
  update auth.users set email = 'deleted-' || v_me || '@deleted.invalid', raw_user_meta_data = '{}'::jsonb, banned_until = 'infinity' where id = v_me;
end $$;

notify pgrst, 'reload schema';
