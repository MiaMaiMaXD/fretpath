begin;
\ir helpers/auth.psql
select plan(22);

-- fixtures (as postgres). Courses and lessons first so handle_new_user unlocks the first lesson of each.
with c as (insert into courses (slug, title, status, is_free) values ('t5-main', 'T5 main', 'published', true) returning id)
  select id as crs from c \gset
with c as (insert into courses (slug, title, status, is_free) values ('t5-pass61', 'T5 pass61', 'published', true) returning id)
  select id as crs61 from c \gset
with c as (insert into courses (slug, title, status, is_free) values ('t5-three', 'T5 three', 'published', true) returning id)
  select id as crs3 from c \gset
with c as (insert into courses (slug, title, status, is_free) values ('t5-locked', 'T5 locked', 'published', true) returning id)
  select id as crsl from c \gset
select tests.make_lesson(:'crs', 1) as l1 \gset
select tests.make_lesson(:'crs', 2, 'draft') as ldraft \gset
select tests.make_lesson(:'crs', 3) as l3 \gset
select tests.make_lesson(:'crs61', 1, 'published', 61) as l61 \gset
select tests.make_lesson(:'crs3', 1, 'published', 60, 3) as l3q \gset
select tests.make_lesson(:'crsl', 1) as lfirst \gset
select tests.make_lesson(:'crsl', 2) as locked \gset
select slug as l3_slug from lessons where id = :'l3' \gset
select tests.create_user('t5a@test.local') as a \gset

-- full valid answer set for l1 where the first choice belongs to a different question
select jsonb_set(s.a, '{0,choice_id}',
  to_jsonb((select c.id from quiz_choices c where c.question_id = (s.a->1->>'question_id')::uuid limit 1)))
  as answers_with_foreign_choice
  from (select tests.answers(:'l1', 5) as a) s \gset

select tests.authenticate_as(:'a');
-- test_fail_does_not_unlock (40%)
select is((submit_quiz(:'l1', tests.answers(:'l1', 2))->>'passed')::boolean, false, 'test_fail_does_not_unlock');
select is_empty(format('select 1 from lesson_progress where user_id = auth.uid() and lesson_id = %L', :'l3'),
  'test_fail_does_not_unlock_next');
-- test_exact_pass_score_passes (60% @ 60)
select is(submit_quiz(:'l1', tests.answers(:'l1', 3))->>'score_pct', '60', 'test_exact_pass_score_passes');
select is((select status::text from lesson_progress where user_id = auth.uid() and lesson_id = :'l1'), 'completed',
  'test_exact_pass_score_completes');
-- test_next_lesson_skips_draft (Review Focus 3)
select is(submit_quiz(:'l1', tests.answers(:'l1', 5))->>'next_lesson_slug', :'l3_slug', 'test_next_lesson_skips_draft');
select isnt_empty(format('select 1 from lesson_progress where user_id = auth.uid() and lesson_id = %L', :'l3'),
  'test_next_lesson_unlocked');
-- test_best_score_kept_on_lower_retake
select submit_quiz(:'l1', tests.answers(:'l1', 1));
select is((select best_score from lesson_progress where user_id = auth.uid() and lesson_id = :'l1'), 100,
  'test_best_score_kept_on_lower_retake');
select is((select status::text from lesson_progress where user_id = auth.uid() and lesson_id = :'l1'), 'completed',
  'test_completed_not_downgraded');
-- test_repeat_pass_is_idempotent (Review Focus 2)
select lives_ok(format('select submit_quiz(%L, %L::jsonb); select submit_quiz(%L, %L::jsonb)',
  :'l1', tests.answers(:'l1', 5), :'l1', tests.answers(:'l1', 5)), 'test_repeat_pass_is_idempotent');
select is((select count(*) from lesson_progress where user_id = auth.uid() and lesson_id = :'l3')::int, 1,
  'test_repeat_pass_no_duplicate_progress');
-- test_every_attempt_recorded
select is((select count(*) from quiz_attempts where user_id = auth.uid() and lesson_id = :'l1')::int, 6,
  'test_every_attempt_recorded');
-- test_last_lesson_has_no_next
select is(submit_quiz(:'l3', tests.answers(:'l3', 5))->'next_lesson_slug', 'null'::jsonb, 'test_last_lesson_has_no_next');
-- test_below_pass_score_by_one_fails (60% @ 61)
select is((submit_quiz(:'l61', tests.answers(:'l61', 3))->>'passed')::boolean, false, 'test_below_pass_score_by_one_fails');
-- test_results_include_explanation_and_key
select is(jsonb_array_length(submit_quiz(:'l1', tests.answers(:'l1', 5))->'results'), 5, 'test_results_count');
select ok((submit_quiz(:'l1', tests.answers(:'l1', 5))->'results'->0) ?& array['correct_choice_id','explanation','is_correct'],
  'test_results_include_explanation_and_key');
-- test_locked_lesson_rejected
select throws_ok(format('select submit_quiz(%L, %L::jsonb)', :'locked', tests.answers(:'locked', 5)),
  'P0001', 'LESSON_LOCKED', 'test_locked_lesson_rejected');
-- test_invalid_answers_rejected
select throws_ok(format('select submit_quiz(%L, %L::jsonb)', :'l1', tests.answers(:'l1', 5) - 0),
  'P0001', 'INVALID_ANSWERS', 'test_invalid_answers_missing_question');
select throws_ok(format('select submit_quiz(%L, %L::jsonb)', :'l1', tests.answers(:'l1', 5) || (tests.answers(:'l1', 5)->0)),
  'P0001', 'INVALID_ANSWERS', 'test_invalid_answers_duplicate_question');
select throws_ok(format('select submit_quiz(%L, %L::jsonb)', :'l1', :'answers_with_foreign_choice'),
  'P0001', 'INVALID_ANSWERS', 'test_invalid_answers_foreign_choice');
select tests.authenticate_anon();
-- test_anon_cannot_submit
select throws_ok(format('select submit_quiz(%L, ''[]''::jsonb)', :'l1'), '42501', null, 'test_anon_cannot_submit');
select tests.authenticate_as(:'a');
-- test_rounding_two_of_three
select is(submit_quiz(:'l3q', tests.answers(:'l3q', 2))->>'score_pct', '67', 'test_rounding_two_of_three');
-- test_failed_attempt_has_null_next
select is(submit_quiz(:'l3q', tests.answers(:'l3q', 0))->'next_lesson_slug', 'null'::jsonb, 'test_failed_attempt_has_null_next');

select * from finish();
rollback;
