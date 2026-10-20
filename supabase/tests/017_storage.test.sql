begin;
\ir helpers/auth.psql
select plan(9);

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

select tests.authenticate_as(:'ma');
select lives_ok(
  format($f$insert into storage.objects (bucket_id, name, owner) values ('avatars', %L, auth.uid())$f$, :'ma' || '/a.png'),
  'member can insert own avatar');
select throws_ok(
  format($f$insert into storage.objects (bucket_id, name, owner) values ('avatars', %L, auth.uid())$f$, :'mb' || '/a.png'),
  '42501', null, 'member cannot insert another user avatar');

-- delete is guarded by a storage trigger (API only), so UPDATE proves the write policies.
select tests.authenticate_as(:'mb');
with u as (update storage.objects set name = name where bucket_id = 'avatars' and name = :'ma' || '/a.png' returning 1)
  select count(*)::int as n_avatar from u \gset
select is(:n_avatar, 0, 'member cannot update another user avatar');

select tests.authenticate_as(:'ma');
with u as (update storage.objects set name = name where bucket_id = 'lesson-images' and name = 'l1/a.png' returning 1)
  select count(*)::int as n_lesson from u \gset
select is(:n_lesson, 0, 'member cannot update lesson image');

select * from finish();
rollback;
