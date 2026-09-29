create type memory_type as enum ('photo', 'note', 'favorite_place');

-- Photos, notes and favourite places, scoped to one trip. No financial table ever references a memory, so deleting one
-- can never touch the ledger. A photo's file lives in the private 'memories' bucket under {trip_id}/.
create table memories (
  id                    uuid primary key default gen_random_uuid(),
  trip_id               uuid not null references trips (id) on delete cascade,
  created_by_member_id  uuid not null,
  type                  memory_type not null,
  media_path            text,
  caption               text,
  body                  text,
  place_name            text,
  place_id              text,
  latitude              numeric(9,6),
  longitude             numeric(9,6),
  idempotency_key       text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,
  foreign key (created_by_member_id, trip_id) references trip_members (id, trip_id),
  constraint memory_has_content check (
    case type
      when 'photo'          then media_path is not null
      when 'note'           then body is not null
      when 'favorite_place' then place_name is not null
    end),
  constraint memory_coords_paired check ((latitude is null) = (longitude is null)),
  -- a photo can only point at a file inside its own trip's folder
  constraint memory_media_in_trip check (media_path is null or media_path like trip_id::text || '/%')
);
create unique index memories_idempotency on memories (created_by_member_id, idempotency_key) where idempotency_key is not null;
create index memories_by_trip on memories (trip_id, created_at desc) where deleted_at is null;
create trigger memories_touch before update on memories for each row execute function touch_updated_at();

alter table memories enable row level security;
create policy memories_select on memories for select to authenticated using (is_trip_member(trip_id));
revoke insert, update, delete on memories from authenticated, anon;

-- Any member can add a memory as themselves, whatever the trip's status. A retry with the same key returns the first one.
create function add_memory(
  p_trip uuid, p_type memory_type, p_idempotency_key text,
  p_media_path text default null, p_caption text default null, p_body text default null, p_place_name text default null
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

  insert into memories (trip_id, created_by_member_id, type, media_path, caption, body, place_name, idempotency_key)
  values (p_trip, v_me, p_type, nullif(trim(p_media_path), ''), nullif(trim(p_caption), ''), nullif(trim(p_body), ''), nullif(trim(p_place_name), ''), p_idempotency_key)
  returning * into v_row;
  return v_row;
end $$;
revoke execute on function add_memory from public, anon;
grant execute on function add_memory to authenticated;

-- Photo storage: private bucket, images only, 10 MB each, and members of a trip can read and add files under that trip's folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memories', 'memories', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create function safe_uuid(p text) returns uuid language plpgsql immutable as $$
begin return p::uuid; exception when others then return null; end $$;

create policy memories_files_read on storage.objects for select to authenticated
  using (bucket_id = 'memories' and is_trip_member(safe_uuid((storage.foldername(name))[1])));
create policy memories_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'memories' and is_trip_member(safe_uuid((storage.foldername(name))[1])));
