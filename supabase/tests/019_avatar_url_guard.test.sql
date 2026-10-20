begin;
\ir helpers/auth.psql
select plan(6);

select tests.create_user('t19-a@test.local') as ma \gset
select tests.create_user('t19-b@test.local') as mb \gset

select tests.authenticate_as(:'ma');
select lives_ok(
  format($f$update profiles set avatar_url = %L where id = %L$f$,
    'http://127.0.0.1:54321/storage/v1/object/public/avatars/' || :'ma' || '/avatar.png', :'ma'),
  'test_avatar_own_path_ok');
select throws_ok(
  format($f$update profiles set avatar_url = %L where id = %L$f$,
    'http://127.0.0.1:54321/storage/v1/object/public/avatars/' || :'mb' || '/avatar.png', :'ma'),
  'P0001', 'INVALID_AVATAR', 'test_avatar_other_user_path_rejected');
select throws_ok(
  format($f$update profiles set avatar_url = %L where id = %L$f$, 'https://evil.example/x.png', :'ma'),
  'P0001', 'INVALID_AVATAR', 'test_avatar_arbitrary_url_rejected');
select throws_ok(
  format($f$update profiles set avatar_url = %L where id = %L$f$,
    'https://evil.example/?/storage/v1/object/public/avatars/' || :'ma' || '/a.png', :'ma'),
  'P0001', 'INVALID_AVATAR', 'test_avatar_url_smuggled_in_query_rejected');
select throws_ok(
  format($f$update profiles set avatar_url = %L where id = %L$f$,
    'http://127.0.0.1:54321/storage/v1/object/public/avatars/' || :'ma' || '/../' || :'mb' || '/a.png', :'ma'),
  'P0001', 'INVALID_AVATAR', 'test_avatar_path_traversal_rejected');
select lives_ok(format($f$update profiles set avatar_url = null where id = %L$f$, :'ma'), 'test_avatar_null_ok');

select * from finish();
rollback;
