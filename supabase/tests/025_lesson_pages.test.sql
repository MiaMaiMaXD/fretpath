begin;
\ir helpers/auth.psql
select plan(12);

with c as (insert into courses (slug, title, status, is_free) values ('t25-c', 'T25', 'published', false) returning id)
  select id as c1 from c \gset
select tests.create_user('t25member@test.local') as mem \gset
select tests.create_user('t25adm@test.local', 'admin') as adm \gset

-- legacy content becomes pages: video, text, quiz
insert into lessons (course_id, slug, title, sort_order) values (:'c1', 'a', 'A', 1);
select id as la from lessons where slug = 'a' and course_id = :'c1' \gset
insert into lesson_contents (lesson_id, content_md, video_url) values (:'la', '# hi', 'https://youtu.be/dQw4w9WgXcQ');
select is((select array_agg(kind order by sort_order) from lesson_pages where lesson_id = :'la'), array['video', 'text', 'quiz'], 'test_legacy_content_to_pages');
select is((select body_md from lesson_pages where lesson_id = :'la' and kind = 'text'), '# hi', 'test_legacy_markdown_kept');

select tests.authenticate_as(:'mem');
select throws_ok(format('select admin_save_lesson_pages(%L, %L, %L, %L, %L)', :'la', 'x', '', '{}', '[]'), 'P0001', 'NOT_ADMIN', 'test_member_cannot_save_pages');

select tests.authenticate_as(:'adm');
select id as pt from lesson_pages where lesson_id = :'la' and kind = 'text' \gset
select id as pq from lesson_pages where lesson_id = :'la' and kind = 'quiz' \gset

-- reorder, edit, drop the video page, add a new text page
select admin_save_lesson_pages(:'la', 'A2', 'สรุป', array['C', 'G'],
  jsonb_build_array(
    jsonb_build_object('id', :'pq', 'kind', 'quiz', 'title', 'Q'),
    jsonb_build_object('id', :'pt', 'kind', 'text', 'title', 'T', 'body_html', '<p>x</p>'),
    jsonb_build_object('kind', 'text', 'title', 'ใหม่', 'body_html', '<p>y</p>'))) as ids \gset
select is(cardinality(:'ids'::uuid[]), 3, 'test_save_returns_ids');
select is((select array_agg(title order by sort_order) from lesson_pages where lesson_id = :'la'), array['Q', 'T', 'ใหม่'], 'test_save_order');
select is((select count(*)::int from lesson_pages where lesson_id = :'la' and kind = 'video'), 0, 'test_missing_page_deleted');
select is((select body_md from lesson_pages where id = :'pt'), null, 'test_editing_html_clears_markdown');
select is((select title || '|' || summary || '|' || array_to_string(example_chords, ',') from lessons where id = :'la'), 'A2|สรุป|C,G', 'test_save_lesson_info');

select throws_ok(format('select admin_save_lesson_pages(%L, %L, %L, %L, %L)', :'la', 'x', '', '{Zz}', '[]'), '23514', null, 'test_unknown_chord_rejected');
select throws_ok(format('select admin_save_lesson_pages(%L, %L, %L, %L, %L)', :'la', 'x', '', '{}',
  '[{"kind":"video","title":"v","video_url":"https://www.youtube.com/FretPath"}]'), '23514', null, 'test_channel_link_rejected');
select throws_ok(format('select admin_save_lesson_pages(%L, %L, %L, %L, %L)', :'la', 'x', '', '{}',
  '[{"kind":"quiz","title":"a"},{"kind":"quiz","title":"b"}]'), '23505', null, 'test_one_quiz_page');

-- members only see pages of unlocked lessons
select tests.authenticate_as(:'mem');
select is((select count(*)::int from lesson_pages where lesson_id = :'la'), 0, 'test_member_cannot_read_locked_pages');

select * from finish();
rollback;
