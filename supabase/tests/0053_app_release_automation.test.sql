begin;
select plan(8);

reset role;
select lives_ok($$ select record_built_build('ios', 7) $$, 'US-30 a finished production build is remembered');
select is((select latest_build from latest_app_release('ios')), 0, 'US-30 but nobody is told yet: being built is not being in the store');
select is((select promote_released_build('ios')), 7, 'US-30 a finished store submission makes it the newest release');
select is((select latest_build from latest_app_release('ios')), 7, 'US-30 and the app now sees it');
select record_built_build('ios', 5);
select is((select built_build from app_releases where platform = 'ios'), 7, 'US-30 an older build number never lowers it');
select is((select latest_build from latest_app_release('android')), 0, 'US-30 the other platform is untouched');

set local role authenticated;
select throws_ok($$ select record_built_build('ios', 99) $$, '42501', null, 'US-30 the app cannot call the recorder');
select throws_ok($$ select promote_released_build('ios') $$, '42501', null, 'US-30 or the promoter');

select * from finish();
rollback;
