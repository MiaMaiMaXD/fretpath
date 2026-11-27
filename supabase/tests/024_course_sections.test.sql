begin;
\ir helpers/auth.psql
select plan(14);

with c as (insert into courses (slug, title, status, is_free) values ('t24-c', 'T24', 'published', false) returning id)
  select id as c1 from c \gset
select tests.create_user('t24member@test.local') as mem \gset
select tests.create_user('t24adm@test.local', 'admin') as adm \gset

-- a lesson inserted without a section gets the course's (auto-created) section
insert into lessons (course_id, slug, title, sort_order) values (:'c1', 'a', 'A', 1);
select isnt((select section_id from lessons where course_id = :'c1' and slug = 'a'), null, 'test_lesson_gets_default_section');
select section_id as s1 from lessons where course_id = :'c1' and slug = 'a' \gset

select tests.authenticate_as(:'mem');
select throws_ok(format('select admin_add_section(%L, %L)', :'c1', 'x'), 'P0001', 'NOT_ADMIN', 'test_member_cannot_add_section');
select throws_ok(format('select admin_add_lesson(%L)', :'s1'), 'P0001', 'NOT_ADMIN', 'test_member_cannot_add_lesson');

select tests.authenticate_as(:'adm');
select admin_add_section(:'c1', 'สอง') as s2 \gset
select is((select sort_order from course_sections where id = :'s2'), 2, 'test_add_section_appends');

-- new lessons land at the end of their section and the course stays numbered 1..n in section order
select admin_add_lesson(:'s2') as l2 \gset
select admin_add_lesson(:'s1') as l1b \gset
select is((select array_agg(sort_order order by sort_order) from lessons where course_id = :'c1'), array[1, 2, 3], 'test_course_numbered_1_to_n');
select is((select sort_order from lessons where id = :'l1b'), 2, 'test_lesson_added_to_first_section_goes_before_second_section');
select is((select sort_order from lessons where id = :'l2'), 3, 'test_lesson_in_second_section_moves_down');
select is((select title || ':' || status from lessons where id = :'l2'), 'บทเรียนใหม่!:draft', 'test_new_lesson_is_draft_named_new');

select lives_ok(format('select admin_rename_section(%L, %L)', :'s2', '  เล่นเพลงแรก  '), 'test_rename_section');
select is((select title from course_sections where id = :'s2'), 'เล่นเพลงแรก', 'test_rename_trims');

select throws_ok(format('select admin_delete_section(%L)', :'s2'), 'P0001', 'SECTION_NOT_EMPTY', 'test_cannot_delete_section_with_lessons');
delete from lessons where id = :'l2';
select lives_ok(format('select admin_delete_section(%L)', :'s2'), 'test_delete_empty_section');
select throws_ok(format('select admin_delete_section(%L)', :'s2'), 'P0001', 'SECTION_NOT_FOUND', 'test_delete_missing_section');

-- a section of another course cannot be used
with c as (insert into courses (slug, title) values ('t24-other', 'Other') returning id) select id as c2 from c \gset
select throws_ok(format('update lessons set section_id = %L where id = %L',
  (select admin_add_section(:'c2', '')), :'l1b'), 'P0001', 'SECTION_COURSE_MISMATCH', 'test_section_must_match_course');

select * from finish();
rollback;
