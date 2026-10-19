begin;
\ir helpers/auth.psql
select plan(16);

-- fixtures (as postgres). Course and its published lessons first, users after so handle_new_user unlocks sort 1.
with c as (insert into courses (slug, title, status, is_free) values ('t6-main', 'T6 main', 'published', true) returning id)
  select id as c from c \gset
select tests.make_lesson(:'c', 1) as l1 \gset
select tests.make_lesson(:'c', 3) as l3 \gset
select tests.make_lesson(:'c', 2, 'draft') as inserted_sort_2 \gset
select tests.make_lesson(:'c', 10, 'draft', 60, 0) as empty_draft \gset
select tests.make_lesson(:'c', 11, 'draft', 60, 2) as draft_missing_key \gset
select tests.make_lesson(:'c', 12, 'draft', 60, 2) as draft_one_choice \gset
select tests.make_lesson(:'c', 13, 'draft', 60, 2) as draft_ok \gset
select tests.make_lesson(:'c', 14, 'draft', 60, 2) as draft_admin \gset
select tests.make_lesson(:'c', 15, 'draft', 60, 1) as l_with_attempts \gset
select tests.make_lesson(:'c', 16, 'draft', 60, 1) as l_untouched \gset

delete from quiz_answer_keys where question_id = (select id from quiz_questions where lesson_id = :'draft_missing_key' limit 1);
delete from quiz_choices where id in (
  select ch.id from quiz_choices ch
  join quiz_answer_keys k on k.question_id = ch.question_id and k.correct_choice_id <> ch.id
  where ch.question_id = (select id from quiz_questions where lesson_id = :'draft_one_choice' order by sort_order limit 1));

with c as (insert into courses (slug, title, status, is_free) values ('t6-skip', 'T6 skip', 'published', true) returning id)
  select id as c_skip from c \gset
select tests.make_lesson(:'c_skip', 1) as skip_l1 \gset
select tests.make_lesson(:'c_skip', 2, 'draft') as skip_draft \gset
select tests.make_lesson(:'c_skip', 3, 'draft') as skip_l3 \gset
with c as (insert into courses (slug, title, status, is_free) values ('t6-first', 'T6 first', 'published', true) returning id)
  select id as c_first from c \gset
select tests.make_lesson(:'c_first', 1, 'draft') as first_l1 \gset

select tests.create_user('t6a@test.local') as a \gset
select tests.create_user('t6b@test.local') as b \gset
select tests.create_user('t6adm@test.local', 'admin') as adm \gset
update lesson_progress set status = 'completed', completed_at = now(), best_score = 100
  where user_id = :'a' and lesson_id = :'l1';
insert into lesson_progress (user_id, lesson_id) values (:'a', :'l_with_attempts');
update lesson_progress set status = 'completed', completed_at = now(), best_score = 100
  where user_id = :'a' and lesson_id = :'skip_l1';

select id as q1 from quiz_questions where lesson_id = :'draft_admin' order by sort_order limit 1 \gset
select ch.id as choice_of_q2 from quiz_choices ch
  where ch.question_id = (select id from quiz_questions where lesson_id = :'draft_admin' order by sort_order offset 1 limit 1)
  limit 1 \gset

-- test_cannot_insert_as_published
select throws_ok(format($$ insert into lessons(course_id, slug, title, sort_order, status) values (%L, 'x', 'x', 99, 'published') $$, :'c'),
  'P0001', 'LESSON_INCOMPLETE', 'test_cannot_insert_as_published');
-- test_cannot_publish_without_questions
select throws_ok(format($$ update lessons set status = 'published' where id = %L $$, :'empty_draft'),
  'P0001', 'LESSON_INCOMPLETE', 'test_cannot_publish_without_questions');
-- test_cannot_publish_question_without_key
select throws_ok(format($$ update lessons set status = 'published' where id = %L $$, :'draft_missing_key'),
  'P0001', 'LESSON_INCOMPLETE', 'test_cannot_publish_question_without_key');
-- test_cannot_publish_question_with_one_choice
select throws_ok(format($$ update lessons set status = 'published' where id = %L $$, :'draft_one_choice'),
  'P0001', 'LESSON_INCOMPLETE', 'test_cannot_publish_question_with_one_choice');
-- test_complete_draft_publishes
select lives_ok(format($$ update lessons set status = 'published' where id = %L $$, :'draft_ok'), 'test_complete_draft_publishes');
-- test_cannot_delete_lesson_with_learners
select throws_ok(format($$ delete from lessons where id = %L $$, :'l_with_attempts'),
  'P0001', 'LESSON_HAS_LEARNERS', 'test_cannot_delete_lesson_with_learners');
-- test_can_delete_untouched_lesson
select lives_ok(format($$ delete from lessons where id = %L $$, :'l_untouched'), 'test_can_delete_untouched_lesson');
-- test_publish_unlocks_for_learners_past_previous_lesson (FR-03.5): :a completed sort 1, :b not
update lessons set status = 'published' where id = :'inserted_sort_2';
select isnt_empty(format($$ select 1 from lesson_progress where user_id = %L and lesson_id = %L $$, :'a', :'inserted_sort_2'),
  'test_publish_unlocks_for_completed_learner');
select is_empty(format($$ select 1 from lesson_progress where user_id = %L and lesson_id = %L $$, :'b', :'inserted_sort_2'),
  'test_publish_does_not_unlock_for_incomplete_learner');
-- test_publish_unlock_skips_draft_previous_lesson (Review Focus 3)
update lessons set status = 'published' where id = :'skip_l3';
select isnt_empty(format($$ select 1 from lesson_progress where user_id = %L and lesson_id = %L $$, :'a', :'skip_l3'),
  'test_unlock_skips_draft_for_completed_learner');
select is_empty(format($$ select 1 from lesson_progress where user_id = %L and lesson_id = %L $$, :'b', :'skip_l3'),
  'test_unlock_skips_draft_not_for_incomplete_learner');
-- test_first_lesson_publish_unlocks_for_all_enrolled
update lessons set status = 'published' where id = :'first_l1';
select isnt_empty(format($$ select 1 from lesson_progress where user_id = %L and lesson_id = %L $$, :'a', :'first_l1'),
  'test_first_lesson_unlocked_for_a');
select isnt_empty(format($$ select 1 from lesson_progress where user_id = %L and lesson_id = %L $$, :'b', :'first_l1'),
  'test_first_lesson_unlocked_for_b');
-- :a completed draft_ok (published above) so the admin's publish of draft_admin must unlock it for :a
insert into lesson_progress (user_id, lesson_id, status, completed_at, best_score)
  values (:'a', :'draft_ok', 'completed', now(), 100);

-- test_answer_key_must_belong_to_question
select throws_ok(format($$ insert into quiz_answer_keys(question_id, correct_choice_id) values (%L, %L) $$, :'q1', :'choice_of_q2'),
  'P0001', 'INVALID_ANSWERS', 'test_answer_key_must_belong_to_question');
-- test_admin_can_publish_through_rls
select tests.authenticate_as(:'adm');
select lives_ok(format($$ update lessons set status = 'published' where id = %L $$, :'draft_admin'), 'test_admin_can_publish_through_rls');
select tests.clear_auth();
select isnt_empty(format($$ select 1 from lesson_progress where user_id = %L and lesson_id = %L $$, :'a', :'draft_admin'),
  'test_admin_publish_wrote_unlock_row');

select * from finish();
rollback;
