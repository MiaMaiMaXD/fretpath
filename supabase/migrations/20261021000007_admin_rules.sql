-- Admin content rules: publish-problem listing, published-lesson integrity, safe reordering,
-- role-change guards, and draft-course visibility.

-- ---------------------------------------------------------------- publish problems
create function public.lesson_publish_problems_internal(p_lesson uuid) returns text[]
language sql stable security definer set search_path = '' as $$
  select case
    when not exists (select 1 from public.quiz_questions q where q.lesson_id = p_lesson)
      then array['NO_QUESTIONS']
    else coalesce((
      select array_agg(s.p order by s.ord, s.p)
      from (
        select 'QUESTION_NO_KEY:' || q.id::text as p, q.sort_order as ord
          from public.quiz_questions q
          where q.lesson_id = p_lesson
            and not exists (select 1 from public.quiz_answer_keys k where k.question_id = q.id)
        union all
        select 'QUESTION_CHOICE_COUNT:' || q.id::text, q.sort_order
          from public.quiz_questions q
          where q.lesson_id = p_lesson
            and (select count(*) from public.quiz_choices c where c.question_id = q.id) not between 2 and 6
      ) s), '{}'::text[])
  end
$$;

create function public.lesson_publish_problems(p_lesson uuid) returns text[]
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN';
  end if;
  return public.lesson_publish_problems_internal(p_lesson);
end $$;

create or replace function public.validate_lesson_publish() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'published'
     and cardinality(public.lesson_publish_problems_internal(new.id)) > 0 then
    raise exception 'LESSON_INCOMPLETE' using errcode = 'P0001';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------- published lessons stay complete
create function public.ensure_published_lesson_complete() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_ids uuid[] := '{}';
  v_id uuid;
  v_lesson uuid;
begin
  if tg_table_name = 'quiz_questions' then
    if tg_op in ('UPDATE', 'DELETE') then v_ids := v_ids || old.lesson_id; end if;
    if tg_op in ('UPDATE', 'INSERT') then v_ids := v_ids || new.lesson_id; end if;
  else
    -- choices / answer keys: resolve through the question; a vanished question was handled by its own trigger
    if tg_op in ('UPDATE', 'DELETE') then
      select q.lesson_id into v_lesson from public.quiz_questions q where q.id = old.question_id;
      if v_lesson is not null then v_ids := v_ids || v_lesson; end if;
    end if;
    if tg_op in ('UPDATE', 'INSERT') then
      select q.lesson_id into v_lesson from public.quiz_questions q where q.id = new.question_id;
      if v_lesson is not null then v_ids := v_ids || v_lesson; end if;
    end if;
  end if;

  for v_id in select distinct x from unnest(v_ids) x loop
    -- lesson gone (e.g. cascade from deleting the lesson) or not published: nothing to protect
    if exists (select 1 from public.lessons l where l.id = v_id and l.status = 'published')
       and cardinality(public.lesson_publish_problems_internal(v_id)) > 0 then
      raise exception 'LESSON_PUBLISHED_INCOMPLETE' using errcode = 'P0001';
    end if;
  end loop;
  return null;
end $$;

create constraint trigger ensure_published_lesson_complete
  after insert or update or delete on public.quiz_questions
  deferrable initially deferred
  for each row execute function public.ensure_published_lesson_complete();
create constraint trigger ensure_published_lesson_complete
  after insert or update or delete on public.quiz_choices
  deferrable initially deferred
  for each row execute function public.ensure_published_lesson_complete();
create constraint trigger ensure_published_lesson_complete
  after insert or update or delete on public.quiz_answer_keys
  deferrable initially deferred
  for each row execute function public.ensure_published_lesson_complete();

-- ---------------------------------------------------------------- reorder
create function public.reorder_lessons(p_course uuid, p_lesson_ids uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_existing uuid[];
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN';
  end if;

  perform 1 from public.lessons where course_id = p_course for update;
  select coalesce(array_agg(id), '{}') into v_existing from public.lessons where course_id = p_course;

  if p_lesson_ids is null
     or cardinality(p_lesson_ids) <> cardinality(v_existing)
     or exists (select 1 from unnest(p_lesson_ids) x where x is null)
     or (select count(distinct x) from unnest(p_lesson_ids) x) <> cardinality(p_lesson_ids)
     or exists (select 1 from unnest(p_lesson_ids) x where not (x = any (v_existing))) then
    raise exception 'INVALID_ORDER' using errcode = 'P0001';
  end if;

  set constraints public.lessons_course_id_sort_order_key deferred;
  update public.lessons l set sort_order = t.ord::int
    from unnest(p_lesson_ids) with ordinality as t(id, ord)
    where l.id = t.id and l.course_id = p_course;
  set constraints public.lessons_course_id_sort_order_key immediate;

  -- the (new) first published lesson is unlocked for every enrolled learner; existing unlocks stay
  insert into public.lesson_progress (user_id, lesson_id)
    select e.user_id, f.id
    from (select l.id from public.lessons l
           where l.course_id = p_course and l.status = 'published'
           order by l.sort_order limit 1) f
    join public.enrollments e on e.course_id = p_course
    on conflict do nothing;
end $$;

-- ---------------------------------------------------------------- roles
create or replace function public.set_user_role(p_user uuid, p_role public.user_role) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_current public.user_role;
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN';
  end if;

  -- serialize concurrent role changes so the last-admin check cannot be raced
  perform 1 from public.profiles where role = 'admin' for update;

  select role into v_current from public.profiles where id = p_user;
  if not found then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_current = 'admin' and p_role <> 'admin'
     and not exists (select 1 from public.profiles where role = 'admin' and id <> p_user) then
    raise exception 'LAST_ADMIN' using errcode = 'P0001';
  end if;

  update public.profiles set role = p_role where id = p_user;
end $$;

-- ---------------------------------------------------------------- draft-course visibility
create or replace function public.is_lesson_unlocked(p_lesson uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.lessons l
    join public.courses c on c.id = l.course_id and c.status = 'published'
    join public.lesson_progress lp on lp.lesson_id = l.id and lp.user_id = (select auth.uid())
    join public.enrollments e on e.course_id = l.course_id and e.user_id = (select auth.uid())
    where l.id = p_lesson and l.status = 'published')
$$;

drop policy lessons_member_read on public.lessons;
create policy lessons_member_read on public.lessons for select to authenticated
  using (status = 'published' and public.is_enrolled(course_id)
         and exists (select 1 from public.courses c where c.id = course_id and c.status = 'published'));

-- ---------------------------------------------------------------- privileges
revoke execute on function public.lesson_publish_problems_internal(uuid),
  public.ensure_published_lesson_complete() from public, anon, authenticated;
revoke execute on function public.lesson_publish_problems(uuid), public.reorder_lessons(uuid, uuid[])
  from public, anon;
grant execute on function public.lesson_publish_problems(uuid), public.reorder_lessons(uuid, uuid[])
  to authenticated;
