-- Account settings: a country preference, and account deletion.
-- Deleting an account never removes financial history (expenses, settlements and the ledger must stay intact for the people who shared
-- them), so it anonymises: the person becomes "Deleted user", their sign-in is removed and blocked, and their notifications and push
-- tokens are erased. It is refused while they own an open trip that other people are still on, because a trip must keep one owner.

alter table users add column country char(2) check (country ~ '^[A-Z]{2}$');

create function set_my_country(p_country text) returns users
language plpgsql security definer set search_path = public as $$
declare v_row users;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_country is not null and upper(trim(p_country)) !~ '^[A-Z]{2}$' then raise exception 'invalid country' using errcode = '22023'; end if;
  update users set country = nullif(upper(trim(p_country)), '') where id = auth.uid() returning * into v_row;
  return v_row;
end $$;
revoke execute on function set_my_country from public, anon;
grant execute on function set_my_country to authenticated;

create function delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if exists (
    select 1 from trip_members o join trips t on t.id = o.trip_id
     where o.user_id = v_me and o.role = 'owner' and o.status = 'active' and t.deleted_at is null and t.status not in ('completed', 'archived')
       and exists (select 1 from trip_members x where x.trip_id = o.trip_id and x.status = 'active' and x.user_id is distinct from v_me)
  ) then raise exception 'owns_open_trips' using errcode = '55000'; end if;

  update users set display_name = 'Deleted user', email = 'deleted-' || v_me || '@deleted.invalid', avatar_url = null, country = null, status = 'disabled' where id = v_me;
  update trip_members set display_name = 'Deleted user', avatar_url = null where user_id = v_me;
  delete from notifications where user_id = v_me;
  delete from notification_preferences where user_id = v_me;
  delete from push_tokens where user_id = v_me;
  delete from auth.identities where user_id = v_me;
  delete from auth.sessions where user_id = v_me;
  update auth.users set email = 'deleted-' || v_me || '@deleted.invalid', raw_user_meta_data = '{}'::jsonb, banned_until = 'infinity' where id = v_me;
end $$;
revoke execute on function delete_my_account from public, anon;
grant execute on function delete_my_account to authenticated;
