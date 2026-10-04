-- The person who added a memory, or the trip owner, can delete it, and can edit a note's text. Same rule as plans. Deleting hides the memory (the
-- schema's convention: deleted_at) and everything that lists memories already skips hidden ones; nothing financial ever points at a memory.
create function delete_memory(p_memory uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_row memories;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select * into v_row from memories where id = p_memory and deleted_at is null;
  if not found then raise exception 'memory not found' using errcode = 'P0002'; end if;
  if not coalesce(v_row.created_by_member_id = my_member_id(v_row.trip_id) or is_trip_owner(v_row.trip_id), false) then
    raise exception 'only the person who added this memory or the trip owner can delete it' using errcode = '42501';
  end if;
  update memories set deleted_at = now() where id = p_memory;
end $$;
revoke execute on function delete_memory from public, anon;
grant execute on function delete_memory to authenticated;

create function update_memory_note(p_memory uuid, p_body text) returns memories
language plpgsql security definer set search_path = public as $$
declare v_row memories;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select * into v_row from memories where id = p_memory and deleted_at is null for update;
  if not found then raise exception 'memory not found' using errcode = 'P0002'; end if;
  if not coalesce(v_row.created_by_member_id = my_member_id(v_row.trip_id) or is_trip_owner(v_row.trip_id), false) then
    raise exception 'only the person who added this memory or the trip owner can edit it' using errcode = '42501';
  end if;
  if v_row.type <> 'note' then raise exception 'only notes can be edited' using errcode = 'P0001'; end if;
  if coalesce(trim(p_body), '') = '' then raise exception 'a note cannot be empty' using errcode = '22023'; end if;
  update memories set body = trim(p_body) where id = p_memory returning * into v_row;
  return v_row;
end $$;
revoke execute on function update_memory_note from public, anon;
grant execute on function update_memory_note to authenticated;
