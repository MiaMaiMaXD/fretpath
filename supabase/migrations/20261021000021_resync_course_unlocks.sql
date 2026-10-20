-- Final review: reordering or unpublishing lessons must not strand learners mid-course.
-- resync_course_unlocks only ever inserts 'unlocked' rows; it never deletes or downgrades progress.
create or replace function public.resync_course_unlocks(p_course uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.lesson_progress (user_id, lesson_id, status)
  select e.user_id, o.id, 'unlocked'
  from (
    select l.id,
           row_number() over (order by l.sort_order) as rn,
           lag(l.id) over (order by l.sort_order) as prev_id
    from public.lessons l
    where l.course_id = p_course and l.status = 'published'
  ) o
  join public.enrollments e on e.course_id = p_course
  where o.rn = 1
     or exists (
       select 1 from public.lesson_progress p
       where p.user_id = e.user_id and p.lesson_id = o.prev_id and p.status = 'completed')
  on conflict (user_id, lesson_id) do nothing;
end $$;

revoke execute on function public.resync_course_unlocks(uuid) from public, anon, authenticated;

create or replace function public.reorder_lessons(p_course uuid, p_lesson_ids uuid[]) returns void
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

  perform public.resync_course_unlocks(p_course);
end $$;

create or replace function public.lessons_resync_on_unpublish() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.resync_course_unlocks(new.course_id);
  return null;
end $$;

revoke execute on function public.lessons_resync_on_unpublish() from public, anon, authenticated;

drop trigger if exists lessons_resync_on_unpublish on public.lessons;
create trigger lessons_resync_on_unpublish
  after update of status on public.lessons
  for each row
  when (old.status = 'published' and new.status = 'draft')
  execute function public.lessons_resync_on_unpublish();

-- guard_avatar_url hygiene: pinned search_path, not callable directly
create or replace function public.guard_avatar_url() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.avatar_url is not null
     and new.avatar_url !~ ('^https?://[^/?#]+/storage/v1/object/public/avatars/' || new.id::text || '/[A-Za-z0-9._-]+(\?v=[0-9]+)?$') then
    raise exception 'INVALID_AVATAR' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.guard_avatar_url() from public, anon, authenticated;
