begin;
select plan(6);

select is((select count(*)::int from app_releases), 2, 'US-30 there is one release row for each platform');
select is((select latest_build from latest_app_release('ios')), 0, 'US-30 nothing is announced until a build number is set');

set local role anon;
select lives_ok($$ select * from latest_app_release('android') $$, 'US-30 the check works before sign-in');
select is((select store_url from latest_app_release('android')), 'https://play.google.com/store/apps/details?id=xyz.getalong.app', 'US-30 and returns the store page');
select is((select count(*)::int from latest_app_release('web')), 0, 'US-30 an unknown platform returns nothing');
select throws_ok($$ select * from app_releases $$, '42501', null, 'US-30 the table itself cannot be read or changed from the app');

select * from finish();
rollback;
