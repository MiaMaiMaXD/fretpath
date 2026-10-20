begin;
\ir helpers/auth.psql
select plan(9);

select tests.create_user('t21-adm@test.local', 'admin') as adm \gset
select tests.create_user('t21-a@test.local') as ua \gset
select tests.create_user('t21-b@test.local') as ub \gset
select tests.create_user('t21-c@test.local') as uc \gset

with c as (insert into courses (slug, title, status, is_free) values ('t21-c', 'T21', 'published', false) returning id)
  select id as c1 from c \gset
select tests.make_lesson(:'c1', 1, 'published', 60, 1) as l1 \gset
select tests.make_lesson(:'c1', 2, 'published', 60, 1) as l2 \gset
select tests.make_lesson(:'c1', 3, 'published', 60, 1) as l3 \gset

insert into enrollments (user_id, course_id) values (:'ua', :'c1'), (:'ub', :'c1'), (:'uc', :'c1');
insert into lesson_progress (user_id, lesson_id, status, best_score, completed_at) values
  (:'ua', :'l1', 'completed', 100, now()), (:'ua', :'l2', 'unlocked', null, null),
  (:'ub', :'l1', 'unlocked', null, null),
  (:'uc', :'l1', 'completed', 100, now()), (:'uc', :'l2', 'completed', 100, now()), (:'uc', :'l3', 'unlocked', null, null);

select tests.authenticate_as(:'adm');
select lives_ok(format('select reorder_lessons(%L, array[%L, %L, %L]::uuid[])', :'c1', :'l1', :'l3', :'l2'), 'test_reorder_swap_lives');
select tests.clear_auth();

select isnt_empty(format('select 1 from lesson_progress where user_id = %L and lesson_id = %L', :'ua', :'l3'),
  'test_resync_new_second_unlocked_for_completer');
select isnt_empty(format('select 1 from lesson_progress where user_id = %L and lesson_id = %L', :'ua', :'l2'),
  'test_resync_old_unlock_kept');
select is((select count(*)::int from lesson_progress where user_id = :'ub' and lesson_id in (:'l1', :'l2', :'l3')), 1, 'test_resync_nothing_completed_only_first');
select is((select status::text from lesson_progress where user_id = :'ua' and lesson_id = :'l1'), 'completed',
  'test_resync_never_downgrades');
select is((select count(*)::int from lesson_progress where user_id = :'uc' and lesson_id in (:'l1', :'l2', :'l3')), 3, 'test_resync_completer_of_two_unchanged_count');

-- order is now l1, l3, l2: uc completed l1 and l2, l3 was already unlocked; swap back so l2 follows l1
select tests.authenticate_as(:'adm');
select reorder_lessons(:'c1', array[:'l2', :'l1', :'l3']::uuid[]);
select tests.clear_auth();
select is((select status::text from lesson_progress where user_id = :'uc' and lesson_id = :'l3'), 'unlocked',
  'test_resync_completer_keeps_next_unlock');

-- unpublishing the first lesson unlocks the new first published lesson for everyone enrolled
select tests.create_user('t21-d@test.local') as ud \gset
insert into enrollments (user_id, course_id) values (:'ud', :'c1');
select is((select count(*)::int from lesson_progress where user_id = :'ud' and lesson_id in (:'l1', :'l2', :'l3')), 0, 'test_unpublish_precondition_no_progress');
update lessons set status = 'draft' where id = :'l2';
select is((select status::text from lesson_progress where user_id = :'ud' and lesson_id = :'l1'), 'unlocked',
  'test_unpublish_first_unlocks_new_first');

select * from finish();
rollback;
