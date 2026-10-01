-- Every trip gets one of the six card colours when it is created, and keeps it for its whole life: the trip page, Home and the Completed trips
-- page all show the same one. Colours are handed out in turn per owner (their 1st trip gets colour 0, the 2nd colour 1 ... the 7th starts over),
-- so two trips made one after another never look alike. The owner can still pick another one (set_trip_card_color).

create function assign_trip_card_color() returns trigger language plpgsql as $$
begin
  if new.card_color is null then
    new.card_color := (select count(*) from trips t where t.created_by_user_id = new.created_by_user_id) % 6;
  end if;
  return new;
end $$;

create trigger trips_card_color before insert on trips
  for each row execute function assign_trip_card_color();

-- Trips that already exist and have no colour yet: oldest first, in turn, per owner.
update trips t set card_color = r.n
from (select id, ((row_number() over (partition by created_by_user_id order by created_at, id)) - 1) % 6 as n from trips) r
where t.id = r.id and t.card_color is null;
