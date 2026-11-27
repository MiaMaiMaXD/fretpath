begin;
\ir helpers/auth.psql
select plan(11);

with c as (insert into courses (slug, title, status, is_free) values ('t27-c', 'T27', 'published', true) returning id)
  select id as crs from c \gset
select tests.make_lesson(:'crs', 1) as l1 \gset
select tests.make_lesson(:'crs', 2) as l2 \gset
update lessons set quiz_max_attempts = 2 where id = :'l1';
select tests.create_user('t27a@test.local') as a \gset

select tests.authenticate_as(:'a');
select is(quiz_attempts_left(:'l1'), 2, 'test_two_attempts_left_at_start');
select is(quiz_attempts_left(:'l2'), null, 'test_no_limit_is_null');
select is((submit_quiz(:'l1', tests.answers(:'l1', 0)) ->> 'attempts_left')::int, 1, 'test_failed_attempt_counts');
select is((submit_quiz(:'l1', tests.answers(:'l1', 0)) ->> 'attempts_left')::int, 0, 'test_second_attempt_counts');
select throws_ok(format('select submit_quiz(%L, %L)', :'l1', tests.answers(:'l1', 5)), 'P0001', 'ATTEMPTS_EXHAUSTED', 'test_third_attempt_refused');

-- locked for 24 hours from the attempt that used up the quota, then the quota starts again
select ok((select retry_at between now() + interval '23 hours 59 minutes' and now() + interval '24 hours' from quiz_quota(:'l1')), 'test_retry_in_24_hours');
reset role;
update quiz_attempts set submitted_at = now() - interval '23 hours' where user_id = :'a' and lesson_id = :'l1';
select tests.authenticate_as(:'a');
select is(quiz_attempts_left(:'l1'), 0, 'test_still_locked_before_24h');
reset role;
update quiz_attempts set submitted_at = now() - interval '25 hours' where user_id = :'a' and lesson_id = :'l1';
select tests.authenticate_as(:'a');
select is(quiz_attempts_left(:'l1'), 2, 'test_reopens_after_24h');

-- after passing, retakes are unlimited
select ok((submit_quiz(:'l1', tests.answers(:'l1', 5)) ->> 'passed')::boolean, 'test_pass');
select is(quiz_attempts_left(:'l1'), null, 'test_unlimited_after_pass');
select lives_ok(format('select submit_quiz(%L, %L)', :'l1', tests.answers(:'l1', 0)), 'test_retake_after_pass_allowed');

select * from finish();
rollback;
