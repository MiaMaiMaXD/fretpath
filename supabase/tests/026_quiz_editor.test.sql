begin;
\ir helpers/auth.psql
select plan(13);

with c as (insert into courses (slug, title, status, is_free) values ('t26-c', 'T26', 'published', false) returning id)
  select id as c1 from c \gset
select tests.create_user('t26member@test.local') as mem \gset
select tests.create_user('t26adm@test.local', 'admin') as adm \gset
insert into lessons (course_id, slug, title, sort_order) values (:'c1', 'a', 'A', 1);
select id as la from lessons where slug = 'a' and course_id = :'c1' \gset

select tests.authenticate_as(:'mem');
select throws_ok(format('select admin_save_quiz(%L, 60, null, %L)', :'la', '[]'), 'P0001', 'NOT_ADMIN', 'test_member_cannot_save_quiz');

select tests.authenticate_as(:'adm');
select admin_save_quiz(:'la', 70, 3, '[
  {"kind":"choice","prompt":"Q1","choices":["a","b","c","d"],"correct":2},
  {"kind":"practical","prompt":"ดีด","chords":["C","G"]}
]'::jsonb) as ids \gset
select is(cardinality(:'ids'::uuid[]), 2, 'test_save_quiz_returns_ids');
select is((select pass_score || ':' || quiz_max_attempts from lessons where id = :'la'), '70:3', 'test_quiz_settings_saved');
select is((select array_agg(kind order by sort_order) from quiz_questions where lesson_id = :'la'), array['choice', 'practical'], 'test_question_kinds_in_order');
select is((select c.text from quiz_answer_keys k join quiz_choices c on c.id = k.correct_choice_id
  join quiz_questions q on q.id = k.question_id where q.lesson_id = :'la'), 'c', 'test_correct_choice_saved');
select is((select practical_chords from quiz_questions where lesson_id = :'la' and kind = 'practical'), array['C', 'G'], 'test_practical_chords_saved');

-- publish rules ignore practical questions but need chords on them
select is(lesson_publish_problems(:'la'), '{}'::text[], 'test_publishable_with_practical');
update quiz_questions set practical_chords = '{}' where lesson_id = :'la' and kind = 'practical';
select ok((lesson_publish_problems(:'la'))[1] like 'PRACTICAL_NO_CHORDS:%', 'test_practical_needs_chords');

select throws_ok(format('select admin_save_quiz(%L, 60, null, %L)', :'la',
  '[{"kind":"practical","prompt":"a","chords":["C"]},{"kind":"practical","prompt":"b","chords":["G"]}]'), '23505', null, 'test_one_practical_per_lesson');

-- reorder + delete through the save
select (:'ids'::uuid[])[1] as q1 \gset
select admin_save_quiz(:'la', 60, null, jsonb_build_array(
  jsonb_build_object('id', :'q1', 'kind', 'choice', 'prompt', 'Q1b', 'choices', jsonb_build_array('x', 'y'), 'correct', 0))) as ids2 \gset
select is((select count(*)::int from quiz_questions where lesson_id = :'la'), 1, 'test_missing_question_deleted');
select is((select quiz_max_attempts from lessons where id = :'la'), null, 'test_unlimited_attempts');
select throws_ok(format('select admin_save_quiz(%L, 60, null, %L)', :'la',
  jsonb_build_array(jsonb_build_object('id', :'q1', 'kind', 'practical', 'prompt', 'x', 'chords', jsonb_build_array('C')))),
  'P0001', 'INVALID_ANSWERS', 'test_cannot_change_question_kind');

-- whole editor in one call
select ok(admin_save_lesson_editor(:'la', 'A', '', '{}', '[{"kind":"text","title":"t","body_html":"<p>x</p>"}]', 60, null,
  jsonb_build_array(jsonb_build_object('id', :'q1', 'kind', 'choice', 'prompt', 'Q', 'choices', jsonb_build_array('x', 'y'), 'correct', 1)))
  ? 'questions', 'test_save_lesson_editor');

select * from finish();
rollback;
