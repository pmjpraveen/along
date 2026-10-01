-- A preferred currency: the currency new trips start with. Existing trips keep theirs.
alter table users add column preferred_currency char(3) references currencies (code);

create function set_my_currency(p_currency text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_currency is not null and not exists (select 1 from currencies where code = upper(trim(p_currency))) then
    raise exception 'unknown currency' using errcode = '22023';
  end if;
  update users set preferred_currency = upper(trim(p_currency)) where id = auth.uid();
end $$;
revoke execute on function set_my_currency from public, anon;
grant execute on function set_my_currency to authenticated;

notify pgrst, 'reload schema';
