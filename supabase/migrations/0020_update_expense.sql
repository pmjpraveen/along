-- One place for the rules every expense write must pass (create and update share it): positive amount, at least one
-- person, no duplicates, everyone active in this trip, shares that sum to the total, the payer active in this trip, and
-- the method-specific inputs (percentages total 100%, shares positive).
create function check_expense_input(p_trip uuid, p_amount_minor bigint, p_split jsonb, p_method split_method, p_payer uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_ids uuid[];
begin
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
  if p_method = 'percentage' and (
      exists (select 1 from jsonb_array_elements(p_split) e where coalesce((e ->> 'split_value')::bigint, 0) <= 0)
      or (select sum((e ->> 'split_value')::bigint) from jsonb_array_elements(p_split) e) <> 10000) then
    raise exception 'percentages_must_total_100' using errcode = '22023';
  end if;
  if p_method = 'shares' and exists (select 1 from jsonb_array_elements(p_split) e where coalesce((e ->> 'split_value')::bigint, 0) <= 0) then
    raise exception 'shares_must_be_positive' using errcode = '22023';
  end if;
  if not exists (select 1 from trip_members where id = p_payer and trip_id = p_trip and status = 'active') then
    raise exception 'the payer must be an active member of this trip' using errcode = '22023';
  end if;
end $$;
revoke execute on function check_expense_input from public, anon, authenticated;

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

-- Only the person who added the expense (or the trip owner) can change it. The caller sends the version they read; a stale
-- version is rejected instead of silently overwriting a concurrent edit. Added-by never changes. Balances follow because they
-- are derived from the rows this rewrites, all in one transaction (the sum-to-total backstop is checked at commit).
create function update_expense(
  p_expense uuid, p_version int, p_title text, p_amount_minor bigint, p_expense_date date, p_split jsonb,
  p_paid_by uuid default null, p_split_method split_method default 'equal'
) returns expenses
language plpgsql security definer set search_path = public as $$
declare
  v_row expenses;
  v_payer uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select * into v_row from expenses where id = p_expense and deleted_at is null for update;
  if not found or not coalesce(v_row.created_by_member_id = my_member_id(v_row.trip_id) or is_trip_owner(v_row.trip_id), false) then
    raise exception 'only the person who added this expense or the owner can edit it' using errcode = '42501';
  end if;
  if v_row.version <> p_version then raise exception 'stale_version' using errcode = 'P0001'; end if;

  v_payer := coalesce(p_paid_by, v_row.paid_by_member_id);
  perform check_expense_input(v_row.trip_id, p_amount_minor, p_split, p_split_method, v_payer);

  update expenses set title = trim(p_title), amount_minor = p_amount_minor, expense_date = p_expense_date,
         paid_by_member_id = v_payer, split_method = p_split_method
   where id = p_expense returning * into v_row;
  delete from expense_participants where expense_id = p_expense;
  insert into expense_participants (trip_id, expense_id, trip_member_id, split_value, owed_amount_minor)
  select v_row.trip_id, p_expense, (e ->> 'member_id')::uuid, (e ->> 'split_value')::bigint, (e ->> 'owed_minor')::bigint
  from jsonb_array_elements(p_split) e;
  return v_row;
end $$;
revoke execute on function update_expense from public, anon;
grant execute on function update_expense to authenticated;
