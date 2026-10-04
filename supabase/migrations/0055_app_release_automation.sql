-- Automatic release tracking. EAS tells us when a production build finishes (its build number) and when a store submission finishes. A finished build
-- is remembered as built_build; a finished submission promotes the newest built number to latest_build, which is what the app compares against.
-- Numbers only ever go up. Only the webhook (service role) can call these; nothing about them is reachable from the app.
alter table app_releases add column built_build int not null default 0 check (built_build >= 0);

create function record_built_build(p_platform text, p_build int) returns void
language sql security definer set search_path = public as $$
  update app_releases set built_build = greatest(built_build, p_build), updated_at = now() where platform = p_platform and p_build > built_build
$$;

create function promote_released_build(p_platform text) returns int
language sql security definer set search_path = public as $$
  update app_releases set latest_build = greatest(latest_build, built_build), updated_at = now() where platform = p_platform returning latest_build
$$;

revoke execute on function record_built_build, promote_released_build from public, anon, authenticated;
grant execute on function record_built_build, promote_released_build to service_role;
