create table users (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null unique,
  display_name  text not null,
  avatar_url    text,
  status        text not null default 'active' check (status in ('active', 'disabled')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger users_touch before update on users
  for each row execute function touch_updated_at();

create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into users (id, email, display_name, avatar_url)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
          new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- own row only; profile edits go through update_profile (later story)
alter table users enable row level security;
create policy users_select on users for select to authenticated using (id = auth.uid());
revoke insert, update, delete on users from authenticated, anon;
