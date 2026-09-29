create type settlement_kind as enum ('payment', 'reversal');

-- Append-only record of real-world payments. A correction is a second row of kind 'reversal', never an edit or delete.
create table settlements (
  id                      uuid primary key default gen_random_uuid(),
  trip_id                 uuid not null references trips (id) on delete cascade,
  kind                    settlement_kind not null default 'payment',
  from_member_id          uuid not null,                  -- who paid
  to_member_id            uuid not null,                  -- who received
  amount_minor            bigint not null check (amount_minor > 0),
  currency                char(3) not null references currencies (code),
  settlement_date         date not null default current_date,
  note                    text,
  reverses_settlement_id  uuid,
  created_by_member_id    uuid not null,
  idempotency_key         text,
  created_at              timestamptz not null default now(),
  foreign key (from_member_id, trip_id)         references trip_members (id, trip_id),
  foreign key (to_member_id, trip_id)           references trip_members (id, trip_id),
  foreign key (created_by_member_id, trip_id)   references trip_members (id, trip_id),
  foreign key (reverses_settlement_id, trip_id) references settlements (id, trip_id),
  constraint settlements_id_trip unique (id, trip_id),
  constraint settlements_distinct_parties check (from_member_id <> to_member_id),
  constraint settlements_reversal_link check ((kind = 'reversal') = (reverses_settlement_id is not null))
);
create unique index settlements_idempotency on settlements (created_by_member_id, idempotency_key) where idempotency_key is not null;
create unique index settlements_reversed_once on settlements (reverses_settlement_id) where reverses_settlement_id is not null;
create index settlements_history on settlements (trip_id, settlement_date desc);
create index settlements_from on settlements (trip_id, from_member_id);
create index settlements_to on settlements (trip_id, to_member_id);

create function forbid_mutation() returns trigger language plpgsql as $$
begin
  raise exception '% on % is not allowed; append a compensating row instead', tg_op, tg_table_name using errcode = '42501';
end $$;
create trigger settlements_immutable before update or delete on settlements
  for each row execute function forbid_mutation();

create function check_settlement_reversal() returns trigger language plpgsql as $$
begin
  if not exists (
    select 1 from settlements o
    where o.id = new.reverses_settlement_id and o.trip_id = new.trip_id and o.kind = 'payment'
      and o.from_member_id = new.from_member_id and o.to_member_id = new.to_member_id
      and o.amount_minor = new.amount_minor and o.currency = new.currency) then
    raise exception 'a reversal must mirror an existing payment' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger settlements_reversal_ok before insert on settlements
  for each row when (new.kind = 'reversal') execute function check_settlement_reversal();

alter table settlements enable row level security;
create policy settlements_select on settlements for select to authenticated using (is_trip_member(trip_id));
revoke insert, update, delete on settlements from authenticated, anon;

-- The payer of a settlement moves toward zero; the receiver moves toward zero from the other side. A reversal flips both.
create or replace view ledger_entries with (security_invoker = true) as
  select e.trip_id, e.paid_by_member_id as member_id, e.currency,
         e.amount_minor as delta_minor,
         'expense_paid'::text as source, e.id as source_id, e.expense_date as entry_date
  from expenses e
  where e.deleted_at is null
  union all
  select ep.trip_id, ep.trip_member_id, e.currency,
         -ep.owed_amount_minor,
         'expense_owed', e.id, e.expense_date
  from expense_participants ep
  join expenses e on e.id = ep.expense_id
  where e.deleted_at is null
  union all
  select s.trip_id, s.from_member_id, s.currency,
         case s.kind when 'payment' then s.amount_minor else -s.amount_minor end,
         'settlement', s.id, s.settlement_date
  from settlements s
  union all
  select s.trip_id, s.to_member_id, s.currency,
         case s.kind when 'payment' then -s.amount_minor else s.amount_minor end,
         'settlement', s.id, s.settlement_date
  from settlements s;

-- The caller must be the payer, the receiver, or the trip owner. Unless p_allow_overpayment is set, the amount cannot
-- exceed what the payer still owes the group or what the receiver is still owed (their net balances), so a suggested
-- simplified payment is always allowed. A retry with the same key returns the first settlement.
create function create_settlement(
  p_trip uuid, p_from uuid, p_to uuid, p_amount_minor bigint, p_idempotency_key text,
  p_date date default null, p_note text default null, p_allow_overpayment boolean default false
) returns settlements
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid;
  v_row settlements;
  v_owes bigint;
  v_owed bigint;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  v_me := my_member_id(p_trip);
  if v_me is null then raise exception 'not a member of this trip' using errcode = '42501'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'idempotency key required' using errcode = '22023';
  end if;

  select * into v_row from settlements where created_by_member_id = v_me and idempotency_key = p_idempotency_key;
  if found then return v_row; end if;

  if v_me <> p_from and v_me <> p_to and not is_trip_owner(p_trip) then
    raise exception 'only the payer, the receiver or the owner can record this payment' using errcode = '42501';
  end if;
  if p_from = p_to then raise exception 'payer and receiver must be different people' using errcode = '22023'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 then raise exception 'amount must be positive' using errcode = '22023'; end if;
  if (select count(*) from trip_members where trip_id = p_trip and status = 'active' and id in (p_from, p_to)) <> 2 then
    raise exception 'both people must be active members of this trip' using errcode = '22023';
  end if;

  if not coalesce(p_allow_overpayment, false) then
    select coalesce(-sum(net_minor), 0) into v_owes from trip_member_balances where trip_id = p_trip and member_id = p_from;
    select coalesce(sum(net_minor), 0) into v_owed from trip_member_balances where trip_id = p_trip and member_id = p_to;
    if p_amount_minor > greatest(v_owes, 0) or p_amount_minor > greatest(v_owed, 0) then
      raise exception 'exceeds_outstanding_debt' using errcode = 'P0001';
    end if;
  end if;

  insert into settlements (trip_id, from_member_id, to_member_id, amount_minor, currency, settlement_date, note, created_by_member_id, idempotency_key)
  select p_trip, p_from, p_to, p_amount_minor, t.primary_currency, coalesce(p_date, current_date), nullif(trim(p_note), ''), v_me, p_idempotency_key
  from trips t where t.id = p_trip
  returning * into v_row;
  return v_row;
end $$;
revoke execute on function create_settlement from public, anon;
grant execute on function create_settlement to authenticated;
