begin;
\ir helpers/auth.psql
select plan(4);

select tests.create_user('t18member@test.local') as mem \gset
select tests.create_user('t18adm@test.local', 'admin') as adm \gset
insert into practice_logs (user_id, activity, minutes, practiced_on) values
  (:'mem', 'chords', 10, '2026-01-05'),
  (:'mem', 'chords', 5, '2026-02-09'),
  (:'mem', 'chords', 7, '2026-01-20');

select tests.authenticate_as(:'mem');
select throws_ok('select * from admin_last_practice()', 'P0001', 'NOT_ADMIN', 'test_member_cannot_read_last_practice');

select tests.authenticate_as(:'adm');
select is((select last_practiced_on from admin_last_practice() where user_id = :'mem'), '2026-02-09'::date, 'test_returns_max_per_user');
select is((select count(*)::int from admin_last_practice() where user_id = :'mem'), 1, 'test_one_row_per_user');
select is((select count(*)::int from admin_last_practice() where user_id = :'adm'), 0, 'test_user_without_logs_absent');

select * from finish();
rollback;
