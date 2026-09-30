-- History only recorded new expenses, so editing or removing one left no trace. Now an edit (any change that bumps the version) and a
-- removal are logged too, by whoever made them (the trip owner may edit someone else's expense).
create function trg_feed_expense_change() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into activity_events (trip_id, actor_member_id, entity_type, entity_id, action, summary)
  values (new.trip_id, coalesce(my_member_id(new.trip_id), new.created_by_member_id), 'expense', new.id,
          case when new.deleted_at is not null then 'removed' else 'edited' end,
          jsonb_build_object('title', new.title, 'amount_minor', new.amount_minor, 'currency', new.currency,
            'exponent', (select minor_unit_exponent from currencies where code = new.currency), 'paid_by', member_name(new.paid_by_member_id)));
  return null;
end $$;
create trigger expenses_feed_change after update on expenses
  for each row when (old.version is distinct from new.version or (old.deleted_at is null and new.deleted_at is not null))
  execute function trg_feed_expense_change();
