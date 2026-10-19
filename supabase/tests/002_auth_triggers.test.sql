begin;
\ir helpers/auth.psql
select plan(14);

-- fixtures: one published free course, one draft free course, one published paid course
with c as (
  insert into courses (slug, title, status, is_free) values ('t3-published', 'Published', 'published', true) returning id
) select id as published_course from c \gset
with c as (
  insert into courses (slug, title, status, is_free) values ('t3-draft', 'Draft', 'draft', true) returning id
) select id as draft_course from c \gset
with c as (
  insert into courses (slug, title, status, is_free, price_thb) values ('t3-paid', 'Paid', 'published', false, 500) returning id
) select id as paid_course from c \gset
select tests.make_lesson(:'published_course', 1) as first_lesson \gset
select tests.make_lesson(:'published_course', 2) as second_lesson \gset
select tests.make_lesson(:'draft_course', 1) as draft_lesson \gset
select tests.make_lesson(:'paid_course', 1) as paid_lesson \gset

-- user created via auth.users; trigger provisions the rest
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
  'newbie@test.local', 'x', now(), '{}', '{}', now(), now(), '', '', '', '')
returning id as u \gset

-- test_new_user_gets_profile
select results_eq(format('select role::text, display_name from profiles where id = %L', :'u'),
  $$ values ('member', 'newbie') $$, 'test_new_user_gets_profile');
-- test_new_user_enrolled_in_published_free_courses_only
select results_eq(
  format('select course_id, source::text from enrollments where user_id = %L and course_id in (%L, %L, %L)',
    :'u', :'published_course', :'draft_course', :'paid_course'),
  format('values (%L::uuid, ''free'')', :'published_course'),
  'test_new_user_enrolled_in_published_free_courses_only');
-- test_first_lesson_unlocked_only
select results_eq(
  format('select lesson_id, status::text from lesson_progress where user_id = %L and lesson_id in (%L, %L, %L, %L)',
    :'u', :'first_lesson', :'second_lesson', :'draft_lesson', :'paid_lesson'),
  format('values (%L::uuid, ''unlocked'')', :'first_lesson'),
  'test_first_lesson_unlocked_only');

-- display_name from metadata wins
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
  'meta@test.local', 'x', now(), '{}', '{"display_name":"สมชาย"}', now(), now(), '', '', '', '')
returning id as u2 \gset
select is((select display_name from profiles where id = :'u2'), 'สมชาย', 'test_display_name_from_metadata');

-- tests.create_user still works after the trigger (profile upsert sets role)
select tests.create_user('adm@test.local', 'admin') as u3 \gset
select is((select role::text from profiles where id = :'u3'), 'admin', 'test_create_user_role_upsert');

-- test_deleting_user_cascades (Review Focus 5)
insert into practice_logs(user_id, practiced_on, minutes, activity, lesson_id)
  values (:'u', current_date - 1, 10, 'x', :'first_lesson');
insert into quiz_attempts(user_id, lesson_id, score_pct, passed) values (:'u', :'first_lesson', 100, true)
  returning id as attempt \gset
select q.id as q, k.correct_choice_id as ch from quiz_questions q
  join quiz_answer_keys k on k.question_id = q.id
  where q.lesson_id = :'first_lesson' order by q.sort_order limit 1 \gset
insert into quiz_attempt_answers(attempt_id, question_id, choice_id, is_correct)
  values (:'attempt', :'q', :'ch', true);

select cmp_ok((select count(*) from profiles where id = :'u')::int, '=', 1, 'precondition: profile exists');
select cmp_ok((select count(*) from enrollments where user_id = :'u')::int, '>', 0, 'precondition: enrollments exist');
select cmp_ok((select count(*) from lesson_progress where user_id = :'u')::int, '>', 0, 'precondition: progress exists');

delete from auth.users where id = :'u';
select is((select count(*) from profiles where id = :'u')::int, 0, 'test_deleting_user_cascades: profiles');
select is((select count(*) from enrollments where user_id = :'u')::int, 0, 'test_deleting_user_cascades: enrollments');
select is((select count(*) from lesson_progress where user_id = :'u')::int, 0, 'test_deleting_user_cascades: lesson_progress');
select is((select count(*) from practice_logs where user_id = :'u')::int, 0, 'test_deleting_user_cascades: practice_logs');
select is((select count(*) from quiz_attempts where user_id = :'u')::int
  + (select count(*) from quiz_attempt_answers where attempt_id = :'attempt')::int, 0,
  'test_deleting_user_cascades: quiz attempts and answers');

-- test_deleting_lesson_keeps_practice_log (on delete set null)
insert into practice_logs(user_id, practiced_on, minutes, activity, lesson_id)
  values (:'u2', current_date - 1, 5, 'y', :'second_lesson') returning id as log_id \gset
delete from lessons where id = :'second_lesson';
select results_eq(format('select count(*)::int, count(lesson_id)::int from practice_logs where id = %L', :'log_id'),
  $$ values (1, 0) $$, 'test_deleting_lesson_keeps_practice_log');

select * from finish();
rollback;
