begin;
\ir helpers/auth.psql
select plan(9);

with c as (insert into courses (slug, title, status, is_free) values ('t11-c', 'T11', 'published', false) returning id)
  select id as c1 from c \gset
select tests.create_user('t11member@test.local') as mem \gset
select tests.create_user('t11adm@test.local', 'admin') as adm \gset

select tests.authenticate_as(:'mem');
select throws_ok(format('select admin_create_lesson(%L, %L, %L, null, 60, %L, null)', :'c1', 'a', 'A', ''), 'P0001', 'NOT_ADMIN', 'test_member_cannot_create_lesson_rpc');

select tests.authenticate_as(:'adm');
select lives_ok(format('select admin_create_lesson(%L, %L, %L, null, 60, %L, null)', :'c1', 'a', 'A', 'x'), 'test_admin_create_lesson');
select lives_ok(format('select admin_create_lesson(%L, %L, %L, null, 60, %L, null)', :'c1', 'b', 'B', 'x'), 'test_create_second_lesson');
select is((select sort_order from lessons where course_id = :'c1' and slug = 'b'), 2, 'test_create_sort_order_max_plus_one');
select throws_ok(format('select admin_create_lesson(%L, %L, %L, null, 60, %L, null)', :'c1', 'a', 'dup', ''), '23505', null, 'test_create_duplicate_slug');

select id as la from lessons where course_id = :'c1' and slug = 'a' \gset
select throws_ok(format('select admin_update_lesson(%L, %L, %L, null, 70, %L, %L)', :'la', 'a2', 'A2', 'new', 'http://youtu.be/dQw4w9WgXcQ'),
  '23514', null, 'test_update_bad_video_rejected');
select is((select slug || ':' || pass_score from lessons where id = :'la'), 'a:60', 'test_failed_update_leaves_lesson_untouched');
select lives_ok(format('select admin_update_lesson(%L, %L, %L, null, 70, %L, %L)', :'la', 'a2', 'A2', 'new', 'https://youtu.be/dQw4w9WgXcQ'), 'test_update_ok');
select is((select content_md from lesson_contents where lesson_id = :'la'), 'new', 'test_update_saves_content');

select * from finish();
rollback;
