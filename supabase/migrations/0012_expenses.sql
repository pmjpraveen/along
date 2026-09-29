create type expense_category as enum ('food', 'stay', 'transport', 'activities', 'shopping', 'tickets', 'groceries', 'fuel', 'other');
create type split_method     as enum ('equal', 'custom', 'percentage', 'shares');

-- paid_by and created_by (added-by) are separate members; either can be a guest.
create table expenses (
  id                    uuid primary key default gen_random_uuid(),
  trip_id               uuid not null references trips (id) on delete cascade,
  created_by_member_id  uuid not null,
  paid_by_member_id     uuid not null,
  itinerary_item_id     uuid,
  title                 text not null check (length(trim(title)) > 0),
  amount_minor          bigint not null check (amount_minor > 0),
  currency              char(3) not null references currencies (code),
  expense_date          date not null,
  category              expense_category not null default 'other',
  split_method          split_method not null default 'equal',
  receipt_path          text,
  note                  text,
  idempotency_key       text,
  version               int not null default 1,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,
  foreign key (created_by_member_id, trip_id) references trip_members (id, trip_id),
  foreign key (paid_by_member_id, trip_id)    references trip_members (id, trip_id),
  foreign key (itinerary_item_id, trip_id)    references itinerary_items (id, trip_id),
  constraint expenses_id_trip unique (id, trip_id)
);
create unique index expenses_idempotency on expenses (created_by_member_id, idempotency_key) where idempotency_key is not null;
create index expenses_list on expenses (trip_id, expense_date desc, created_at desc) where deleted_at is null;
create index expenses_by_payer on expenses (trip_id, paid_by_member_id) where deleted_at is null;
create trigger expenses_version before update on expenses for each row execute function bump_version();

-- owed_amount_minor is each person's share of the expense; split_value carries the input for non-equal methods.
create table expense_participants (
  id                 uuid primary key default gen_random_uuid(),
  trip_id            uuid not null,
  expense_id         uuid not null,
  trip_member_id     uuid not null,
  split_value        bigint,
  owed_amount_minor  bigint not null check (owed_amount_minor >= 0),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (expense_id, trip_member_id),
  foreign key (expense_id, trip_id)     references expenses (id, trip_id) on delete cascade,
  foreign key (trip_member_id, trip_id) references trip_members (id, trip_id)
);
create index expense_participants_member on expense_participants (trip_id, trip_member_id);
create trigger expense_participants_touch before update on expense_participants for each row execute function touch_updated_at();

-- Backstop: however rows get written, the split must sum to the total when the transaction commits.
create function trg_split_must_sum() returns trigger language plpgsql as $$
declare v_id uuid := coalesce(new.id, old.id);
begin
  if tg_table_name = 'expense_participants' then v_id := coalesce(new.expense_id, old.expense_id); end if;
  if exists (select 1 from expenses e where e.id = v_id and e.deleted_at is null
             and e.amount_minor <> (select coalesce(sum(p.owed_amount_minor), 0) from expense_participants p where p.expense_id = e.id)) then
    raise exception 'split must sum to the expense total' using errcode = '23514';
  end if;
  return null;
end $$;
create constraint trigger expense_participants_sum after insert or update or delete on expense_participants
  deferrable initially deferred for each row execute function trg_split_must_sum();
create constraint trigger expenses_sum after insert or update of amount_minor on expenses
  deferrable initially deferred for each row execute function trg_split_must_sum();

alter table expenses enable row level security;
alter table expense_participants enable row level security;
create policy expenses_select on expenses for select to authenticated using (is_trip_member(trip_id));
create policy expense_participants_select on expense_participants for select to authenticated using (is_trip_member(trip_id));
revoke insert, update, delete on expenses, expense_participants from authenticated, anon;

-- p_split is [{"member_id": uuid, "owed_minor": int}, ...]; the client computes it (src/domain/split.ts), the server verifies it.
-- Payer defaults to the caller; the caller is always recorded as added-by. A retry with the same key returns the first expense.
create function create_expense(
  p_trip uuid, p_title text, p_amount_minor bigint, p_expense_date date, p_split jsonb,
  p_idempotency_key text, p_paid_by uuid default null
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

  v_payer := coalesce(p_paid_by, v_me);
  if not exists (select 1 from trip_members where id = v_payer and trip_id = p_trip and status = 'active') then
    raise exception 'the payer must be an active member of this trip' using errcode = '22023';
  end if;

  insert into expenses (trip_id, created_by_member_id, paid_by_member_id, title, amount_minor, currency, expense_date, split_method, idempotency_key)
  select p_trip, v_me, v_payer, trim(p_title), p_amount_minor, t.primary_currency, p_expense_date, 'equal', p_idempotency_key
  from trips t where t.id = p_trip
  returning * into v_row;

  insert into expense_participants (trip_id, expense_id, trip_member_id, owed_amount_minor)
  select p_trip, v_row.id, (e ->> 'member_id')::uuid, (e ->> 'owed_minor')::bigint from jsonb_array_elements(p_split) e;
  return v_row;
end $$;
revoke execute on function create_expense from public, anon;
grant execute on function create_expense to authenticated;
