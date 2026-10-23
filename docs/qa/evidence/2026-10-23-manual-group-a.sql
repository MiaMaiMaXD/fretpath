-- Evidence for manual TCs SEC-15, QZ-08, QZ-11, QZ-13, QZ-15 (run 2026-10-23 on local Supabase). Rolls back.
-- Run: { echo "begin;"; cat supabase/tests/helpers/auth.psql docs/qa/evidence/2026-10-23-manual-group-a.sql; echo "rollback;"; } | docker exec -i supabase_db_fretpath psql -U postgres -q -t -v ON_ERROR_STOP=1
create extension if not exists pgtap with schema extensions;
select plan(17);

-- fixtures
with c as (insert into courses (slug, title, status, is_free) values ('ga-main', 'GA main', 'published', true) returning id)
  select id as crs from c \gset
with c as (insert into courses (slug, title, status, is_free) values ('ga-17', 'GA 17q', 'published', true) returning id)
  select id as crs17 from c \gset
with c as (insert into courses (slug, title, status, is_free) values ('ga-8', 'GA 8q', 'published', true) returning id)
  select id as crs8 from c \gset
select tests.make_lesson(:'crs', 1) as l1 \gset
select tests.make_lesson(:'crs', 2) as llast \gset
select tests.make_lesson(:'crs17', 1, 'published', 60, 17) as l17 \gset
select tests.make_lesson(:'crs8', 1, 'published', 60, 8) as l8 \gset
select tests.create_user('ga-a@test.local') as a \gset
select tests.create_user('ga-b@test.local') as b \gset
select tests.create_user('ga-c@test.local') as c \gset

-- ===== TC-SEC-15: B creates progress/attempts/answers/enrollments, A must not read them
select tests.authenticate_as(:'b');
select submit_quiz(:'l1', tests.answers(:'l1', 5));
select tests.clear_auth();
select ok((select count(*) from lesson_progress where user_id = :'b') > 0
      and (select count(*) from quiz_attempts where user_id = :'b') > 0
      and (select count(*) from quiz_attempt_answers qa join quiz_attempts t on t.id = qa.attempt_id where t.user_id = :'b') > 0
      and (select count(*) from enrollments where user_id = :'b') > 0,
  'SEC-15 precondition: B has rows in all 4 tables');
select tests.authenticate_as(:'a');
select is_empty(format('select 1 from lesson_progress where user_id = %L', :'b'), 'SEC-15 lesson_progress of B hidden from A');
select is_empty(format('select 1 from quiz_attempts where user_id = %L', :'b'), 'SEC-15 quiz_attempts of B hidden from A');
select is_empty(format('select 1 from quiz_attempt_answers qa where qa.attempt_id in (select id from quiz_attempts where user_id = %L)', :'b'),
  'SEC-15 quiz_attempt_answers of B hidden from A (via attempt filter)');
select is_empty(format('select 1 from quiz_attempt_answers qa join quiz_attempts t on t.id = qa.attempt_id where t.user_id <> %L', :'a'),
  'SEC-15 A sees no attempt answers other than own');
select is_empty(format('select 1 from enrollments where user_id = %L', :'b'), 'SEC-15 enrollments of B hidden from A');

-- ===== TC-QZ-08: repeat pass on the last lesson
select tests.authenticate_as(:'a');
select submit_quiz(:'l1', tests.answers(:'l1', 5));
select submit_quiz(:'llast', tests.answers(:'llast', 5));
select count(*) as before_08 from quiz_attempts where user_id = auth.uid() and lesson_id = :'llast' \gset
select submit_quiz(:'llast', tests.answers(:'llast', 5)) as r08 \gset
select is((:'r08'::jsonb)->'next_lesson_slug', 'null'::jsonb, 'QZ-08 next_lesson_slug is null');
select is((:'r08'::jsonb)->>'passed', 'true', 'QZ-08 passed again');
select is((select status::text from lesson_progress where user_id = auth.uid() and lesson_id = :'llast'), 'completed', 'QZ-08 still completed');
select is((select count(*) from quiz_attempts where user_id = auth.uid() and lesson_id = :'llast')::int, :before_08 + 1, 'QZ-08 one more attempt recorded');

-- ===== TC-QZ-11: repeat fail on the last lesson (user C, never passed it)
select tests.authenticate_as(:'c');
select submit_quiz(:'l1', tests.answers(:'l1', 5));
select submit_quiz(:'llast', tests.answers(:'llast', 1));
select submit_quiz(:'llast', tests.answers(:'llast', 1)) as r11 \gset
select is((:'r11'::jsonb)->'next_lesson_slug', 'null'::jsonb, 'QZ-11 next_lesson_slug is null');
select is((:'r11'::jsonb)->>'passed', 'false', 'QZ-11 failed again');
select isnt((select status::text from lesson_progress where user_id = auth.uid() and lesson_id = :'llast'), 'completed', 'QZ-11 not completed');
select is((select count(*) from quiz_attempts where user_id = auth.uid() and lesson_id = :'llast')::int, 2, 'QZ-11 both attempts recorded');

-- ===== TC-QZ-13: 10/17 at pass_score 60 -> 59, not passed
select submit_quiz(:'l17', tests.answers(:'l17', 10)) as r13 \gset
select is((:'r13'::jsonb)->>'score_pct', '59', 'QZ-13 score_pct = 59');
select is((:'r13'::jsonb)->>'passed', 'false', 'QZ-13 passed = false');

-- ===== TC-QZ-15: 1/8 -> 12.5 rounds half-up to 13
select submit_quiz(:'l8', tests.answers(:'l8', 1)) as r15 \gset
select is((:'r15'::jsonb)->>'score_pct', '13', 'QZ-15 score_pct = 13 (half-up)');

select * from finish();
