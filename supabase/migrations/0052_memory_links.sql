-- A link to a shared Google Photos album or photo. The app reads the page's title and picture once when the link is added and keeps them with the
-- memory, so everyone on the trip sees the same preview card without each phone fetching it. Only Google Photos addresses over https are accepted.
alter table memories add column link_url text, add column link_title text, add column link_image_url text;
alter table memories drop constraint memory_has_content;
alter table memories add constraint memory_has_content check (
  case type
    when 'photo'          then media_path is not null
    when 'note'           then body is not null
    when 'favorite_place' then place_name is not null
    when 'link'           then link_url is not null
  end);
alter table memories add constraint memory_link_is_google_photos check (link_url is null or link_url ~* '^https://(photos\.app\.goo\.gl|photos\.google\.com)/');
alter table memories add constraint memory_link_image_is_https check (link_image_url is null or link_image_url ~* '^https://');

drop function add_memory(uuid, memory_type, text, text, text, text, text);
create function add_memory(
  p_trip uuid, p_type memory_type, p_idempotency_key text,
  p_media_path text default null, p_caption text default null, p_body text default null, p_place_name text default null,
  p_link_url text default null, p_link_title text default null, p_link_image_url text default null
) returns memories
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid;
  v_row memories;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  v_me := my_member_id(p_trip);
  if v_me is null then raise exception 'not a member of this trip' using errcode = '42501'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'idempotency key required' using errcode = '22023';
  end if;
  select * into v_row from memories where created_by_member_id = v_me and idempotency_key = p_idempotency_key;
  if found then return v_row; end if;

  insert into memories (trip_id, created_by_member_id, type, media_path, caption, body, place_name, link_url, link_title, link_image_url, idempotency_key)
  values (p_trip, v_me, p_type, nullif(trim(p_media_path), ''), nullif(trim(p_caption), ''), nullif(trim(p_body), ''), nullif(trim(p_place_name), ''),
          nullif(trim(p_link_url), ''), nullif(left(trim(p_link_title), 200), ''), nullif(trim(p_link_image_url), ''), p_idempotency_key)
  returning * into v_row;
  return v_row;
end $$;
revoke execute on function add_memory from public, anon;
grant execute on function add_memory to authenticated;
