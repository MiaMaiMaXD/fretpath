begin;
\ir helpers/auth.psql
select plan(21);

-- fixtures (as postgres)
with c as (
  insert into courses (slug, title, status, is_free) values ('t4-course', 'T4', 'published', true) returning id
) select id as crs from c \gset
select tests.create_user('t4a@test.local') as a \gset
select tests.create_user('t4b@test.local') as b \gset
select tests.create_user('t4adm@test.local', 'admin') as adm \gset
select tests.make_lesson(:'crs', 1) as l1 \gset
select tests.make_lesson(:'crs', 2) as l2 \gset
select tests.make_lesson(:'crs', 3, 'draft') as draft \gset
select tests.make_lesson(:'crs', 4) as lu \gset
insert into enrollments (user_id, course_id) values (:'a', :'crs'), (:'b', :'crs') on conflict do nothing;
insert into lesson_progress (user_id, lesson_id, status) values (:'a', :'l1', 'unlocked'), (:'a', :'lu', 'unlocked') on conflict do nothing;
update lessons set status = 'draft' where id = :'lu';
insert into practice_logs (user_id, practiced_on, minutes, activity) values (:'b', current_date - 1, 20, 'b log');

select tests.authenticate_as(:'a');
-- test_member_cannot_read_answer_keys
select is_empty($$ select * from quiz_answer_keys $$, 'test_member_cannot_read_answer_keys');
-- test_member_reads_only_own_practice_logs
select is((select count(*) from practice_logs where user_id = :'b')::int, 0, 'test_member_reads_only_own_practice_logs');
-- test_member_cannot_update_others_logs
select is_empty(format('update practice_logs set minutes = 1 where user_id = %L returning id', :'b'),
  'test_member_cannot_update_others_logs');
-- test_member_cannot_change_own_role
select throws_ok($$ update profiles set role = 'admin' where id = auth.uid() $$, '42501', null,
  'test_member_cannot_change_own_role');
select throws_ok(format('select set_user_role(%L, ''admin'')', :'a'), 'P0001', 'NOT_ADMIN',
  'test_member_cannot_call_set_user_role');
-- test_member_cannot_write_progress_or_attempts
select throws_ok(format('insert into lesson_progress(user_id, lesson_id, status) values (%L, %L, ''unlocked'')', :'a', :'l2'),
  '42501', null, 'test_member_cannot_write_progress');
select throws_ok(format('insert into quiz_attempts(user_id, lesson_id, score_pct, passed) values (%L, %L, 100, true)', :'a', :'l1'),
  '42501', null, 'test_member_cannot_write_attempts');
-- test_locked_lesson_title_visible_content_hidden
select isnt_empty(format('select 1 from lessons where id = %L', :'l2'), 'test_locked_lesson_title_visible');
select is_empty(format('select 1 from lesson_contents where lesson_id = %L', :'l2'), 'test_locked_lesson_content_hidden');
select is_empty(format('select 1 from quiz_questions where lesson_id = %L', :'l2'), 'test_locked_lesson_questions_hidden');
select isnt_empty(format('select 1 from lesson_contents where lesson_id = %L', :'l1'), 'test_unlocked_lesson_content_visible');
-- test_member_cannot_see_draft_lessons
select is_empty(format('select 1 from lessons where id = %L', :'draft'), 'test_member_cannot_see_draft_lessons');
-- test_unpublished_lesson_content_hidden
select is_empty(format('select 1 from lessons where id = %L', :'lu'), 'test_unpublished_lesson_hidden');
select is_empty(format('select 1 from lesson_contents where lesson_id = %L', :'lu'), 'test_unpublished_lesson_content_hidden');
-- test_practice_date_uses_bangkok_today
select lives_ok($$ insert into practice_logs(user_id, practiced_on, minutes, activity)
  values (auth.uid(), (now() at time zone 'Asia/Bangkok')::date, 10, 'x') $$, 'test_practice_date_today_ok');
select throws_ok($$ insert into practice_logs(user_id, practiced_on, minutes, activity)
  values (auth.uid(), (now() at time zone 'Asia/Bangkok')::date + 1, 10, 'x') $$, 'P0001', 'FUTURE_DATE',
  'test_practice_date_tomorrow_rejected');
select tests.authenticate_anon();
-- test_anon_cannot_read_lessons
select is_empty($$ select 1 from lessons $$, 'test_anon_cannot_read_lessons');
select isnt_empty($$ select 1 from courses $$, 'test_anon_reads_published_courses');
select tests.authenticate_as(:'adm');
-- test_admin_reads_answer_keys_and_all_logs
select isnt_empty($$ select 1 from quiz_answer_keys $$, 'test_admin_reads_answer_keys');
select isnt_empty(format('select 1 from practice_logs where user_id = %L', :'b'), 'test_admin_reads_all_logs');
select lives_ok(format('select set_user_role(%L, ''admin'')', :'a'), 'test_admin_can_set_user_role');

select * from finish();
rollback;
