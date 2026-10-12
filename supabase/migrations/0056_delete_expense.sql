-- Delete an expense. The person who added it or the trip owner can, the same rule as editing. The expense is hidden (deleted_at), never erased, so the
-- history stays intact, and balances are derived from the ledger view that already skips hidden expenses: everyone's balances update by themselves.
-- Payments that were already recorded stay exactly as they are (they are never edited). Deleting one that is already gone is a plain not-found.
create function delete_expense(p_expense uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_row expenses;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select * into v_row from expenses where id = p_expense and deleted_at is null for update;
  if not found then raise exception 'expense not found' using errcode = 'P0002'; end if;
  if not coalesce(v_row.created_by_member_id = my_member_id(v_row.trip_id) or is_trip_owner(v_row.trip_id), false) then
    raise exception 'only the person who added this expense or the owner can delete it' using errcode = '42501';
  end if;
  update expenses set deleted_at = now() where id = p_expense;
end $$;
revoke execute on function delete_expense from public, anon;
grant execute on function delete_expense to authenticated;
