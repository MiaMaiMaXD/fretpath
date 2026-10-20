begin;
\ir helpers/auth.psql
select plan(18);

select tests.create_user('t17-admin@test.local', 'admin') as adm \gset
select tests.create_user('t17-a@test.local') as ma \gset
select tests.create_user('t17-b@test.local') as mb \gset

select is((select count(*)::int from storage.buckets where id in ('lesson-images','avatars') and public), 2, 'both buckets public');
select is((select file_size_limit from storage.buckets where id = 'lesson-images'), 2097152::bigint, 'lesson-images limit 2 MB');
select is((select file_size_limit from storage.buckets where id = 'avatars'), 1048576::bigint, 'avatars limit 1 MB');

select tests.authenticate_as(:'ma');
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner) values ('lesson-images', 'l1/a.png', auth.uid())$$,
  '42501', null, 'member cannot insert lesson image');

select tests.authenticate_as(:'adm');
select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner) values ('lesson-images', 'l1/a.png', auth.uid())$$,
  'admin can insert lesson image');
select is((select count(*)::int from storage.objects where bucket_id = 'lesson-images' and name = 'l1/a.png'), 1, 'admin sees lesson image row');

select tests.authenticate_as(:'ma');
select lives_ok(
  format($f$insert into storage.objects (bucket_id, name, owner) values ('avatars', %L, auth.uid())$f$, :'ma' || '/a.png'),
  'member can insert own avatar');
select throws_ok(
  format($f$insert into storage.objects (bucket_id, name, owner) values ('avatars', %L, auth.uid())$f$, :'mb' || '/a.png'),
  '42501', null, 'member cannot insert another user avatar');
select is((select count(*)::int from storage.objects where bucket_id = 'avatars' and name = :'ma' || '/a.png'), 1, 'owner sees own avatar');
select is((select count(*)::int from storage.objects where bucket_id = 'lesson-images'), 0, 'member cannot list lesson images');
select throws_ok(
  format($f$update storage.objects set name = %L where bucket_id = 'avatars' and name = %L$f$, :'mb' || '/x.png', :'ma' || '/a.png'),
  '42501', null, 'cannot move own avatar into another user folder');

select tests.authenticate_anon();
select is((select count(*)::int from storage.objects where bucket_id in ('avatars','lesson-images')), 0, 'anon cannot list either bucket');

select tests.authenticate_as(:'mb');
select is((select count(*)::int from storage.objects where bucket_id = 'avatars'), 0, 'other member cannot list others avatars');

-- deletes: the protect trigger is bypassed per transaction so the policies themselves are tested
select tests.clear_auth();
select is((select count(*)::int from storage.objects where bucket_id = 'avatars' and name = :'ma' || '/a.png'), 1, 'avatar row exists');
set local storage.allow_delete_query = 'true';

select tests.authenticate_as(:'mb');
with d as (delete from storage.objects where bucket_id = 'avatars' and name = :'ma' || '/a.png' returning 1)
  select count(*)::int as n1 from d \gset
select is(:n1, 0, 'other user cannot delete avatar');

select tests.authenticate_as(:'ma');
with d as (delete from storage.objects where bucket_id = 'lesson-images' and name = 'l1/a.png' returning 1)
  select count(*)::int as n2 from d \gset
select is(:n2, 0, 'member cannot delete lesson image');
with d as (delete from storage.objects where bucket_id = 'avatars' and name = :'ma' || '/a.png' returning 1)
  select count(*)::int as n3 from d \gset
select is(:n3, 1, 'owner deletes own avatar');

select tests.authenticate_as(:'adm');
with d as (delete from storage.objects where bucket_id = 'lesson-images' and name = 'l1/a.png' returning 1)
  select count(*)::int as n4 from d \gset
select is(:n4, 1, 'admin deletes lesson image');

select * from finish();
rollback;
