-- Share-based splits store each person's whole-number shares in split_value; every listed person must have at least one.
create or replace function create_expense(
  p_trip uuid, p_title text, p_amount_minor bigint, p_expense_date date, p_split jsonb,
  p_idempotency_key text, p_paid_by uuid default null, p_split_method split_method default 'equal'
) returns expenses
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid;
  v_row expenses;
  v_payer uuid;
  v_ids uuid[];
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  v_me := my_member_id(p_trip);
  if v_me is null then raise exception 'not a member of this trip' using errcode = '42501'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'idempotency key required' using errcode = '22023';
  end if;

  select * into v_row from expenses where created_by_member_id = v_me and idempotency_key = p_idempotency_key;
  if found then return v_row; end if;

  if p_amount_minor is null or p_amount_minor <= 0 then raise exception 'amount must be positive' using errcode = '22023'; end if;
  if jsonb_typeof(p_split) <> 'array' or jsonb_array_length(p_split) = 0 then
    raise exception 'pick at least one person to split with' using errcode = '22023';
  end if;
  select array_agg((e ->> 'member_id')::uuid) into v_ids from jsonb_array_elements(p_split) e;
  if (select count(distinct x) from unnest(v_ids) x) <> cardinality(v_ids) then
    raise exception 'a person appears twice in the split' using errcode = '22023';
  end if;
  if (select count(*) from trip_members where trip_id = p_trip and status = 'active' and id = any(v_ids)) <> cardinality(v_ids) then
    raise exception 'everyone in the split must be an active member of this trip' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_split) e where (e ->> 'owed_minor')::bigint < 0)
     or (select sum((e ->> 'owed_minor')::bigint) from jsonb_array_elements(p_split) e) <> p_amount_minor then
    raise exception 'split_must_sum' using errcode = '22023';
  end if;

  if p_split_method = 'percentage' and (
      exists (select 1 from jsonb_array_elements(p_split) e where coalesce((e ->> 'split_value')::bigint, 0) <= 0)
      or (select sum((e ->> 'split_value')::bigint) from jsonb_array_elements(p_split) e) <> 10000) then
    raise exception 'percentages_must_total_100' using errcode = '22023';
  end if;

  if p_split_method = 'shares' and exists (select 1 from jsonb_array_elements(p_split) e where coalesce((e ->> 'split_value')::bigint, 0) <= 0) then
    raise exception 'shares_must_be_positive' using errcode = '22023';
  end if;

  v_payer := coalesce(p_paid_by, v_me);
  if not exists (select 1 from trip_members where id = v_payer and trip_id = p_trip and status = 'active') then
    raise exception 'the payer must be an active member of this trip' using errcode = '22023';
  end if;

  insert into expenses (trip_id, created_by_member_id, paid_by_member_id, title, amount_minor, currency, expense_date, split_method, idempotency_key)
  select p_trip, v_me, v_payer, trim(p_title), p_amount_minor, t.primary_currency, p_expense_date, p_split_method, p_idempotency_key
  from trips t where t.id = p_trip
  returning * into v_row;

  insert into expense_participants (trip_id, expense_id, trip_member_id, split_value, owed_amount_minor)
  select p_trip, v_row.id, (e ->> 'member_id')::uuid, (e ->> 'split_value')::bigint, (e ->> 'owed_minor')::bigint
  from jsonb_array_elements(p_split) e;
  return v_row;
end $$;
revoke execute on function create_expense from public, anon;
grant execute on function create_expense to authenticated;
