begin;
\ir helpers/auth.psql
select plan(27);

select tests.create_user('schema-test@example.com') as u \gset
with c as (
  insert into courses (slug, title) values ('schema-course', 'Schema course') returning id
) select id as c from c \gset
select tests.make_lesson(:'c', 1) as l1 \gset
select tests.make_lesson(:'c', 2) as l2 \gset
select :'l1' as l \gset

select has_table('public', t, t) from unnest(array['profiles','courses','enrollments','lessons',
  'lesson_contents','quiz_questions','quiz_choices','quiz_answer_keys','lesson_progress',
  'quiz_attempts','quiz_attempt_answers','practice_logs']) t;
select col_default_is('public','lessons','pass_score','60','lessons.pass_score default');
select col_default_is('public','profiles','role','member'::user_role,'profiles.role default');
select col_default_is('public','courses','is_free','true','courses.is_free default');
-- test_pass_score_range
select throws_ok(format('update lessons set pass_score = 0 where id = %L', :'l'), '23514');
select throws_ok(format('update lessons set pass_score = 101 where id = %L', :'l'), '23514');
-- test_practice_minutes_boundaries
select throws_ok(format('insert into practice_logs(user_id, practiced_on, minutes, activity) values (%L, current_date - 1, 0, ''x'')', :'u'), '23514');
select lives_ok (format('insert into practice_logs(user_id, practiced_on, minutes, activity) values (%L, current_date - 1, 1, ''x'')', :'u'));
select lives_ok (format('insert into practice_logs(user_id, practiced_on, minutes, activity) values (%L, current_date - 1, 600, ''x'')', :'u'));
select throws_ok(format('insert into practice_logs(user_id, practiced_on, minutes, activity) values (%L, current_date - 1, 601, ''x'')', :'u'), '23514');
select throws_ok(format('insert into practice_logs(user_id, practiced_on, minutes, activity, note) values (%L, current_date - 1, 5, ''x'', repeat(''ก'', 501))', :'u'), '23514');
-- test_video_url_must_be_youtube
select throws_ok(format('update lesson_contents set video_url = ''https://vimeo.com/123'' where lesson_id = %L', :'l'), '23514');
-- test_sort_order_unique_but_swappable (Review Focus 4)
select throws_ok(format('update lessons set sort_order = 1 where id = %L', :'l2'), '23505');
-- the swap must fail without deferral ...
select throws_ok(format('update lessons set sort_order = 2 where id = %L; update lessons set sort_order = 1 where id = %L', :'l1', :'l2'), '23505');
-- ... and succeed with deferral (constraints re-checked immediately at the end)
select lives_ok (format('set constraints all deferred; update lessons set sort_order = 2 where id = %L; update lessons set sort_order = 1 where id = %L; set constraints all immediate', :'l1', :'l2'));

-- helpers work while authenticated (security definer)
select tests.authenticate_as(:'u');
select lives_ok(format('select tests.make_lesson(%L, 3)', :'c'), 'make_lesson works as authenticated');
select tests.clear_auth();

select * from finish();
rollback;
