begin;
\ir helpers/auth.psql
select plan(24);

with c as (insert into courses (slug, title, status, is_free) values ('t12-c', 'T12', 'published', false) returning id)
  select id as c1 from c \gset
select tests.make_lesson(:'c1', 1, 'published', 60, 2) as pub \gset
select tests.make_lesson(:'c1', 2, 'draft', 60, 0) as draft \gset
select tests.create_user('t12member@test.local') as mem \gset
select tests.create_user('t12adm@test.local', 'admin') as adm \gset
select id as pq from quiz_questions where lesson_id = :'pub' order by sort_order limit 1 \gset
select id as pq2 from quiz_questions where lesson_id = :'pub' order by sort_order offset 1 limit 1 \gset

select tests.authenticate_as(:'mem');
select throws_ok(format('select admin_save_question(%L, null, %L, %L::text[], null, 0, null)', :'draft', 'q', '{a,b}'), 'P0001', 'NOT_ADMIN', 'test_member_cannot_save_question');
select throws_ok(format('select admin_move_question(%L, %L)', :'pq', 'down'), 'P0001', 'NOT_ADMIN', 'test_member_cannot_move_question');
select throws_ok(format('select admin_delete_question(%L)', :'pq'), 'P0001', 'NOT_ADMIN', 'test_member_cannot_delete_question');

select tests.authenticate_as(:'adm');
select lives_ok(format('select admin_save_question(%L, null, %L, %L::text[], null, 1, %L)', :'draft', 'ใหม่', '{ก,ข,ค}', 'เพราะ'), 'test_admin_creates_question');
select id as nq from quiz_questions where lesson_id = :'draft' \gset
select is((select count(*)::int from quiz_choices where question_id = :'nq'), 3, 'test_creates_three_choices');
select is((select c.text from quiz_answer_keys k join quiz_choices c on c.id = k.correct_choice_id and c.question_id = k.question_id where k.question_id = :'nq'), 'ข', 'test_key_points_to_same_question_choice');
select is((select explanation from quiz_answer_keys where question_id = :'nq'), 'เพราะ', 'test_explanation_saved');

select lives_ok(format('select admin_save_question(%L, %L, %L, %L::text[], null, 0, null)', :'draft', :'nq', 'แก้', '{x,y}'), 'test_admin_replaces_choices');
select is((select array_agg(text order by sort_order) from quiz_choices where question_id = :'nq'), array['x','y'], 'test_choice_set_replaced');
select is((select c.text from quiz_answer_keys k join quiz_choices c on c.id = k.correct_choice_id where k.question_id = :'nq'), 'x', 'test_key_follows_new_choices');

select throws_ok(format('select admin_save_question(%L, %L, %L, %L::text[], null, 5, null)', :'draft', :'nq', 'q', '{a,b}'), 'P0001', 'INVALID_ANSWERS', 'test_bad_correct_index_rejected');
select throws_ok(format('select admin_save_question(%L, %L, %L, %L::text[], null, 0, null)', :'draft', :'nq', repeat('x', 501), '{a,b}'), 'P0001', 'INVALID_ANSWERS', 'test_long_prompt_rejected');
select lives_ok(format('select admin_save_question(%L, %L, %L, %L::text[], null, 0, null)', :'draft', :'nq', 'q', '{a}'), 'test_draft_may_be_incomplete');

select throws_ok(format($$ select admin_save_question(%L, %L, %L, %L::text[], null, 0, null); set constraints all immediate $$, :'pub', :'pq', 'q', '{only}'),
  'P0001', 'LESSON_PUBLISHED_INCOMPLETE', 'test_published_one_choice_refused');
select lives_ok(format($$ select admin_save_question(%L, null, %L, %L::text[], null, 0, null); set constraints all immediate $$, :'pub', 'ข้อใหม่บนบทเผยแพร่', '{a,b}'), 'test_published_new_question_complete_in_one_call');

select admin_move_question(:'pq', 'down');
select is((select id from quiz_questions where lesson_id = :'pub' order by sort_order, id limit 1), :'pq2'::uuid, 'test_move_down_swaps_with_neighbour');

-- history preservation: ids are stable, answered choices cannot be dropped
select admin_save_question(:'draft', null, 'h', '{p,q,r}', null, 0, null) as hq \gset
select array_agg(id order by sort_order)::text as hids from quiz_choices where question_id = :'hq' \gset
select (:'hids'::uuid[])[2] as hq_choice \gset
select (:'hids'::uuid[])[3] as hq_third \gset
select tests.clear_auth();
insert into quiz_attempts (user_id, lesson_id, score_pct, passed) values (:'mem', :'draft', 100, true);
insert into quiz_attempt_answers (attempt_id, question_id, choice_id, is_correct)
  select id, :'hq', :'hq_choice', false from quiz_attempts where user_id = :'mem' and lesson_id = :'draft';
select tests.authenticate_as(:'adm');
select lives_ok(format('select admin_save_question(%L, %L, %L, %L::text[], %L::uuid[], 2, null)', :'draft', :'hq', 'h',
  '{r2,q2,new}', format('{%s,%s,null}', :'hq_third', :'hq_choice')), 'test_reorder_and_edit_keeps_answered_choice');
select is((select text from quiz_choices where id = :'hq_choice'), 'q2', 'test_answer_still_points_to_same_choice');
select throws_ok(format('select admin_save_question(%L, %L, %L, %L::text[], %L::uuid[], 0, null)', :'draft', :'hq', 'h',
  '{r3,new}', format('{%s,null}', :'hq_third')), 'P0001', 'QUESTION_HAS_ANSWERS', 'test_removing_answered_choice_refused');
select throws_ok(format('delete from quiz_choices where id = %L', :'hq_choice'), 'P0001', 'QUESTION_HAS_ANSWERS', 'test_raw_delete_answered_choice_refused');
select throws_ok(format('delete from quiz_questions where id = %L', :'hq'), 'P0001', 'QUESTION_HAS_ANSWERS', 'test_raw_delete_answered_question_refused');
select tests.clear_auth();
select is((select count(*)::int from quiz_attempt_answers where question_id = :'hq' and choice_id = :'hq_choice'), 1, 'test_attempt_answer_survives_edits_and_refused_deletes');
select tests.authenticate_as(:'adm');
select throws_ok(format('select admin_delete_question(%L)', :'hq'), 'P0001', 'QUESTION_HAS_ANSWERS', 'test_deleting_answered_question_refused');
select lives_ok(format('select admin_delete_question(%L)', :'nq'), 'test_delete_unanswered_question');

select * from finish();
rollback;
