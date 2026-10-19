begin;
\ir helpers/auth.psql
select plan(10);

-- bangkok_date is deterministic (Asia/Bangkok = UTC+7)
select is(public.bangkok_date('2026-10-19 17:30+00'), '2026-10-20'::date, 'test_bangkok_date_after_midnight_is_next_day');
select is(public.bangkok_date('2026-10-19 16:59+00'), '2026-10-19'::date, 'test_bangkok_date_before_midnight_is_same_day');
select matches(pg_get_functiondef('public.validate_practice_log'::regproc), 'bangkok_date',
  'test_practice_trigger_uses_bangkok_date');

-- fixtures (as postgres): users exist BEFORE the courses are published
select tests.create_user('t7a@test.local') as a \gset
with c as (insert into courses (slug, title, status, is_free) values ('t7-free', 'T7 free', 'draft', true) returning id)
  select id as free_c from c \gset
with c as (insert into courses (slug, title, status, is_free) values ('t7-paid', 'T7 paid', 'draft', false) returning id)
  select id as paid_c from c \gset
select tests.make_lesson(:'free_c', 2) as free_l2 \gset
select tests.make_lesson(:'free_c', 1) as free_l1 \gset
select tests.make_lesson(:'paid_c', 1) as paid_l1 \gset

-- test_draft_course_does_not_enroll
select is_empty(format('select 1 from enrollments where user_id = %L and course_id = %L', :'a', :'free_c'),
  'test_draft_course_does_not_enroll');
update courses set status = 'published' where id in (:'free_c', :'paid_c');
-- test_publishing_free_course_enrolls_existing_users
select isnt_empty(format('select 1 from enrollments where user_id = %L and course_id = %L and source = ''free''', :'a', :'free_c'),
  'test_publish_free_course_enrolls_existing_user');
select is((select status::text from lesson_progress where user_id = :'a' and lesson_id = :'free_l1'), 'unlocked',
  'test_publish_free_course_unlocks_first_lesson');
select is_empty(format('select 1 from lesson_progress where user_id = %L and lesson_id = %L', :'a', :'free_l2'),
  'test_publish_free_course_does_not_unlock_second_lesson');
-- test_publishing_paid_course_does_not_enroll
select is_empty(format('select 1 from enrollments where user_id = %L and course_id = %L', :'a', :'paid_c'),
  'test_publish_paid_course_does_not_enroll');

-- submit_quiz refuses incomplete lessons
select tests.create_user('t7b@test.local') as b \gset
select tests.make_lesson(:'free_c', 5) as inc_key \gset
select tests.make_lesson(:'free_c', 6) as inc_empty \gset
insert into lesson_progress (user_id, lesson_id, status) values (:'b', :'inc_key', 'unlocked'), (:'b', :'inc_empty', 'unlocked');
insert into enrollments (user_id, course_id) values (:'b', :'free_c') on conflict do nothing;
select tests.answers(:'inc_key', 5) as inc_answers \gset
delete from quiz_answer_keys where question_id = (select id from quiz_questions where lesson_id = :'inc_key' order by sort_order limit 1);
delete from quiz_questions where lesson_id = :'inc_empty';
select tests.authenticate_as(:'b');
select throws_ok(format('select submit_quiz(%L, %L::jsonb)', :'inc_key', :'inc_answers'),
  'P0001', 'LESSON_INCOMPLETE', 'test_missing_answer_key_lesson_incomplete');
select throws_ok(format('select submit_quiz(%L, ''[]''::jsonb)', :'inc_empty'),
  'P0001', 'LESSON_INCOMPLETE', 'test_zero_question_lesson_incomplete');

select * from finish();
rollback;
