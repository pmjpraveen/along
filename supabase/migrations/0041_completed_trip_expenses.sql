-- Adding an expense to a completed trip is the owner's alone.
create or replace function create_expense(
  p_trip uuid, p_title text, p_amount_minor bigint, p_expense_date date, p_split jsonb,
  p_idempotency_key text, p_paid_by uuid default null, p_split_method split_method default 'equal'
) returns expenses
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid;
  v_row expenses;
  v_payer uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  v_me := my_member_id(p_trip);
  if v_me is null then raise exception 'not a member of this trip' using errcode = '42501'; end if;
  -- Once a trip is completed, only its owner can add expenses; everyone else can still see them.
  if exists (select 1 from trips where id = p_trip and status in ('completed', 'archived')) and not is_trip_owner(p_trip) then
    raise exception 'only the owner can add expenses to a completed trip' using errcode = '42501';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'idempotency key required' using errcode = '22023';
  end if;

  select * into v_row from expenses where created_by_member_id = v_me and idempotency_key = p_idempotency_key;
  if found then return v_row; end if;

  v_payer := coalesce(p_paid_by, v_me);
  perform check_expense_input(p_trip, p_amount_minor, p_split, p_split_method, v_payer);

  insert into expenses (trip_id, created_by_member_id, paid_by_member_id, title, amount_minor, currency, expense_date, split_method, idempotency_key)
  select p_trip, v_me, v_payer, trim(p_title), p_amount_minor, t.primary_currency, p_expense_date, p_split_method, p_idempotency_key
  from trips t where t.id = p_trip
  returning * into v_row;

  insert into expense_participants (trip_id, expense_id, trip_member_id, split_value, owed_amount_minor)
  select p_trip, v_row.id, (e ->> 'member_id')::uuid, (e ->> 'split_value')::bigint, (e ->> 'owed_minor')::bigint
  from jsonb_array_elements(p_split) e;
  return v_row;
end $$;
