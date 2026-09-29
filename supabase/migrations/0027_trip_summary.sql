-- One row per trip for the summary screen: who came, what was planned, what was spent and what is still to settle.
-- security_invoker, so the caller's RLS applies and only members see a trip. Deleted expenses and items are not counted.
-- outstanding_minor is the total still owed across the group (the sum of everyone's positive balance).
create view trip_summary with (security_invoker = true) as
select t.id as trip_id, t.name, t.destination_name, t.start_date, t.end_date, t.status,
       t.primary_currency as currency, c.minor_unit_exponent as exponent,
       (select count(*) from trip_members m where m.trip_id = t.id and m.status = 'active')::int as people,
       (select count(*) from itinerary_items i where i.trip_id = t.id and i.deleted_at is null)::int as activities,
       (select coalesce(sum(e.amount_minor), 0) from expenses e where e.trip_id = t.id and e.deleted_at is null)::bigint as total_spend_minor,
       (select coalesce(sum(b.net_minor), 0) from trip_member_balances b where b.trip_id = t.id and b.net_minor > 0)::bigint as outstanding_minor
from trips t
join currencies c on c.code = t.primary_currency
where t.deleted_at is null;
