-- A person's display name, set by them. Sign in with Apple gives the name only to the app, only the first time, and after the users row was already made
-- (from the token, which has no name), so the app sends it here once it has it.
create function set_my_name(p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare v_name text := btrim(coalesce(p_name, ''));
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if char_length(v_name) not between 1 and 60 then raise exception 'invalid name' using errcode = '22023'; end if;
  update users set display_name = v_name where id = auth.uid();
end $$;
revoke execute on function set_my_name from public, anon;
grant execute on function set_my_name to authenticated;
