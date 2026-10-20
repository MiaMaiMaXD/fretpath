begin;
\ir helpers/auth.psql
select plan(27);

-- fixtures (as postgres)
with c as (insert into courses (slug, title, status, is_free) values ('t7-cx', 'T7 cx', 'published', false) returning id)
  select id as cx from c \gset
select tests.make_lesson(:'cx', 1, 'published', 60, 2) as published_lesson \gset
select tests.make_lesson(:'cx', 2, 'published', 60, 1) as single_q_lesson \gset
select tests.make_lesson(:'cx', 3, 'published', 60, 2) as p_to_draft \gset
select tests.make_lesson(:'cx', 4, 'published', 60, 2) as untouched_lesson \gset
select tests.make_lesson(:'cx', 10, 'draft', 60, 0) as empty_draft \gset
select tests.make_lesson(:'cx', 11, 'draft', 60, 2) as draft_missing_key \gset
select tests.make_lesson(:'cx', 12, 'draft', 60, 2) as draft_one_choice \gset
select tests.make_lesson(:'cx', 13, 'draft', 60, 2) as draft_ok \gset

select id as q_nokey from quiz_questions where lesson_id = :'draft_missing_key' order by sort_order limit 1 \gset
delete from quiz_answer_keys where question_id = :'q_nokey';
select id as q_onechoice from quiz_questions where lesson_id = :'draft_one_choice' order by sort_order limit 1 \gset
delete from quiz_choices ch using quiz_answer_keys k
  where ch.question_id = :'q_onechoice' and k.question_id = ch.question_id and k.correct_choice_id <> ch.id;

select q.id as pq1, k.correct_choice_id as pq1_key_choice from quiz_questions q
  join quiz_answer_keys k on k.question_id = q.id
  where q.lesson_id = :'published_lesson' order by q.sort_order limit 1 \gset

with c as (insert into courses (slug, title, status, is_free) values ('t7-c2', 'T7 c2', 'published', true) returning id)
  select id as c2 from c \gset
select tests.make_lesson(:'c2', 1) as c2_l1 \gset
select tests.make_lesson(:'c2', 2) as c2_l2 \gset
with c as (insert into courses (slug, title, status, is_free) values ('t7-dc', 'T7 draft course', 'published', true) returning id)
  select id as draft_course from c \gset
select tests.make_lesson(:'draft_course', 1) as dc_l1 \gset

select tests.create_user('t7member@test.local') as enrolled_user \gset
select tests.create_user('t7viewer@test.local') as viewer \gset
select tests.create_user('t7adm@test.local', 'admin') as adm \gset
update courses set status = 'draft' where id = :'draft_course';

-- test_publish_problems_lists_each_gap (as admin)
select tests.authenticate_as(:'adm');
select is(lesson_publish_problems(:'empty_draft'), array['NO_QUESTIONS'], 'test_publish_problems_no_questions');
select ok('QUESTION_NO_KEY:' || :'q_nokey' = any(lesson_publish_problems(:'draft_missing_key')), 'test_publish_problems_no_key');
select ok('QUESTION_CHOICE_COUNT:' || :'q_onechoice' = any(lesson_publish_problems(:'draft_one_choice')), 'test_publish_problems_choice_count');
select is(lesson_publish_problems(:'draft_ok'), '{}'::text[], 'test_publish_problems_ok');

-- test_published_lesson_stays_complete (as admin)
select throws_ok(format($$ delete from quiz_choices where question_id = %L and id <> %L; set constraints all immediate $$, :'pq1', :'pq1_key_choice'),
  'P0001', 'LESSON_PUBLISHED_INCOMPLETE', 'test_published_cannot_drop_to_one_choice');
select throws_ok(format($$ delete from quiz_answer_keys where question_id = %L; set constraints all immediate $$, :'pq1'),
  'P0001', 'LESSON_PUBLISHED_INCOMPLETE', 'test_published_cannot_delete_key');
select throws_ok(format($$ delete from quiz_questions where lesson_id = %L; set constraints all immediate $$, :'single_q_lesson'),
  'P0001', 'LESSON_PUBLISHED_INCOMPLETE', 'test_published_cannot_delete_last_question');
select lives_ok(format($$ update quiz_questions set prompt = %L where id = %L; set constraints all immediate $$, 'แก้คำผิด', :'pq1'),
  'test_published_prompt_edit_ok');
select lives_ok(format($$ update lessons set status = 'draft' where id = %L; delete from quiz_choices where question_id = (select id from quiz_questions where lesson_id = %L order by sort_order limit 1) and id not in (select correct_choice_id from quiz_answer_keys); set constraints all immediate $$, :'p_to_draft', :'p_to_draft'),
  'test_draft_lesson_editable');
select lives_ok(format($$ delete from lessons where id = %L; set constraints all immediate $$, :'untouched_lesson'),
  'test_delete_untouched_published_lesson_ok');

-- member cannot call admin functions
select tests.authenticate_as(:'viewer');
select throws_ok(format('select lesson_publish_problems(%L)', :'draft_ok'), 'P0001', 'NOT_ADMIN', 'test_member_cannot_call_problems');
select throws_ok(format('select reorder_lessons(%L, array[%L, %L]::uuid[])', :'c2', :'c2_l2', :'c2_l1'), 'P0001', 'NOT_ADMIN', 'test_member_cannot_reorder');
select throws_ok(format('select lesson_publish_problems_internal(%L)', :'draft_ok'), '42501', null, 'test_member_cannot_call_internal');

-- test_reorder_swaps_and_unlocks_new_first (as admin)
select tests.authenticate_as(:'adm');
select throws_ok(format('select reorder_lessons(%L, array[%L]::uuid[])', :'c2', :'c2_l1'), 'P0001', 'INVALID_ORDER', 'test_reorder_missing_lesson');
select throws_ok(format('select reorder_lessons(%L, array[%L, %L, %L]::uuid[])', :'c2', :'c2_l1', :'c2_l1', :'c2_l2'), 'P0001', 'INVALID_ORDER', 'test_reorder_duplicate');
select throws_ok(format('select reorder_lessons(%L, array[%L, %L]::uuid[])', :'c2', :'c2_l1', :'dc_l1'), 'P0001', 'INVALID_ORDER', 'test_reorder_foreign_lesson');
select lives_ok(format('select reorder_lessons(%L, array[%L, %L]::uuid[])', :'c2', :'c2_l2', :'c2_l1'), 'test_reorder_swap_lives');
select is((select sort_order from lessons where id = :'c2_l2'), 1, 'test_reorder_new_first_sort');
select is((select sort_order from lessons where id = :'c2_l1'), 2, 'test_reorder_old_first_sort');
select isnt_empty(format('select 1 from lesson_progress where user_id = %L and lesson_id = %L', :'enrolled_user', :'c2_l2'), 'test_reorder_unlocks_new_first');
select isnt_empty(format('select 1 from lesson_progress where user_id = %L and lesson_id = %L', :'enrolled_user', :'c2_l1'), 'test_reorder_keeps_old_unlock');

-- test_last_admin_cannot_demote
select tests.clear_auth();
update profiles set role = 'member' where role = 'admin' and id <> :'adm';
select tests.authenticate_as(:'adm');
select throws_ok(format('select set_user_role(%L, %L)', :'adm', 'member'), 'P0001', 'LAST_ADMIN', 'test_last_admin_cannot_demote');
select throws_ok(format('select set_user_role(%L, %L)', gen_random_uuid(), 'admin'), 'P0001', 'USER_NOT_FOUND', 'test_set_role_unknown_user');
select lives_ok(format('select set_user_role(%L, %L)', :'enrolled_user', 'admin'), 'test_promote_member_lives');
select lives_ok(format('select set_user_role(%L, %L)', :'adm', 'member'), 'test_demote_when_other_admin_exists');

-- test_draft_course_hides_lessons (as enrolled member)
select tests.authenticate_as(:'viewer');
select is_empty(format('select 1 from lessons where course_id = %L', :'draft_course'), 'test_draft_course_hides_lessons');
select is(is_lesson_unlocked(:'dc_l1'), false, 'test_draft_course_lesson_locked');

select * from finish();
rollback;
