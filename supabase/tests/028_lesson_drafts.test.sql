begin;
\ir helpers/auth.psql
select plan(4);

with c as (insert into courses (slug, title, status, is_free) values ('t28-c', 'T28', 'published', true) returning id)
  select id as crs from c \gset
select tests.make_lesson(:'crs', 1) as l1 \gset
select tests.create_user('t28m@test.local') as mem \gset
select tests.create_user('t28a@test.local', 'admin') as adm \gset

select tests.authenticate_as(:'adm');
select lives_ok(format('insert into lesson_drafts (lesson_id, data) values (%L, %L)', :'l1', '{"info":{}}'), 'test_admin_saves_draft');
select throws_ok(format('insert into lesson_drafts (lesson_id, data) values (%L, %L)', :'l1', '[]'), '23514', null, 'test_draft_must_be_object');

select tests.authenticate_as(:'mem');
select is((select count(*)::int from lesson_drafts), 0, 'test_member_cannot_read_drafts');
delete from lesson_drafts where lesson_id = :'l1';
select tests.authenticate_as(:'adm');
select is((select count(*)::int from lesson_drafts where lesson_id = :'l1'), 1, 'test_member_delete_has_no_effect');

select * from finish();
rollback;
