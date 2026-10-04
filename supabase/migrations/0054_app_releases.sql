-- What the newest build in each store is, so an installed app can tell it is out of date and offer the store page. One row per platform. The build
-- number is compared, not the version, because the version stays "1.0.0" while the build number goes up with every EAS build.
-- Releasing: after a build is live in the store, set its number here (see below). A prompt only appears for people whose build is older.
--   update app_releases set latest_build = <build number>, updated_at = now() where platform = 'ios';   -- or 'android'
create table app_releases (
  platform      text primary key check (platform in ('ios', 'android')),
  latest_build  int not null default 0 check (latest_build >= 0),
  store_url     text not null check (store_url ~ '^https://'),
  updated_at    timestamptz not null default now()
);
alter table app_releases enable row level security;
revoke all on app_releases from anon, authenticated;
insert into app_releases (platform, latest_build, store_url) values
  ('ios',     0, 'https://apps.apple.com/app/id6817977368'),
  ('android', 0, 'https://play.google.com/store/apps/details?id=xyz.getalong.app');

-- Readable before sign-in too (the prompt can show on any screen), and it only ever returns the store address and the number.
create function latest_app_release(p_platform text) returns table (latest_build int, store_url text)
language sql stable security definer set search_path = public as $$
  select r.latest_build, r.store_url from app_releases r where r.platform = p_platform
$$;
revoke execute on function latest_app_release from public;
grant execute on function latest_app_release to anon, authenticated;
