-- No balance is ever stored: every money movement is a signed ledger entry, and a balance is the sum of entries.
-- Positive = the group owes them, negative = they owe the group. Settlement branches are added with settlements (Sprint 5).
create view ledger_entries with (security_invoker = true) as
  -- the payer is credited the full amount
  select e.trip_id, e.paid_by_member_id as member_id, e.currency,
         e.amount_minor as delta_minor,
         'expense_paid'::text as source, e.id as source_id, e.expense_date as entry_date
  from expenses e
  where e.deleted_at is null
  union all
  -- each participant is debited their share
  select ep.trip_id, ep.trip_member_id, e.currency,
         -ep.owed_amount_minor,
         'expense_owed', e.id, e.expense_date
  from expense_participants ep
  join expenses e on e.id = ep.expense_id
  where e.deleted_at is null;

create view trip_member_balances with (security_invoker = true) as
select trip_id, member_id, currency, sum(delta_minor)::bigint as net_minor
from ledger_entries
group by trip_id, member_id, currency;
