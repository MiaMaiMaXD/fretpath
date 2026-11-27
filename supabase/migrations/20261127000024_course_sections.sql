-- Course sections ("ช่วง"): admins group lessons into named sections, replacing the fixed unit ranges
-- that used to live in lib/path-frets.ts. Invariant: lessons.sort_order follows (section order, order
-- inside the section), so every existing reader that orders lessons by sort_order keeps working.
-- A section's published/draft badge is derived (published when it holds a published lesson).

create table public.course_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null default ''
    constraint course_sections_title_len check (char_length(title) <= 120),
  sort_order int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index course_sections_course_idx on public.course_sections (course_id, sort_order);

alter table public.lessons
  add column section_id uuid references public.course_sections (id) on delete restrict;
create index lessons_section_idx on public.lessons (section_id);

create trigger course_sections_set_updated_at before update on public.course_sections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- access
grant select, insert, update, delete on public.course_sections to authenticated;
alter table public.course_sections enable row level security;
create policy course_sections_member_read on public.course_sections for select to authenticated
  using (public.is_enrolled(course_id));
create policy course_sections_admin_all on public.course_sections for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- helpers (not callable by clients)

-- Renumber a course's lessons 1..n in (section order, current order) and re-run unlocks.
create function public.renumber_course_lessons(p_course uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  set constraints public.lessons_course_id_sort_order_key deferred;
  update public.lessons l set sort_order = o.rn::int
    from (
      select l2.id, row_number() over (order by s.sort_order nulls last, l2.sort_order, l2.created_at) as rn
      from public.lessons l2 left join public.course_sections s on s.id = l2.section_id
      where l2.course_id = p_course
    ) o
    where l.id = o.id and l.sort_order is distinct from o.rn::int;
  set constraints public.lessons_course_id_sort_order_key immediate;
  perform public.resync_course_unlocks(p_course);
end $$;

-- A lesson inserted without a section joins the course's last section (one is created if needed).
create function public.lessons_default_section() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_section uuid;
begin
  if new.section_id is null then
    select id into v_section from public.course_sections
      where course_id = new.course_id order by sort_order desc limit 1;
    if v_section is null then
      insert into public.course_sections (course_id, title, sort_order)
        values (new.course_id, '', 1) returning id into v_section;
    end if;
    new.section_id := v_section;
  end if;
  return new;
end $$;

create trigger lessons_default_section before insert on public.lessons
  for each row execute function public.lessons_default_section();

-- Section must belong to the lesson's course.
create function public.lessons_section_same_course() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.section_id is not null and not exists (
    select 1 from public.course_sections where id = new.section_id and course_id = new.course_id) then
    raise exception 'SECTION_COURSE_MISMATCH' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger lessons_section_same_course before insert or update of section_id, course_id on public.lessons
  for each row execute function public.lessons_section_same_course();

-- Rebuild a course's sections from consecutive runs of lessons: names[i] gets the next sizes[i]
-- lessons in sort order (the last section takes any remainder). Used for the backfill and seeds.
create function public.split_course_into_sections(p_course uuid, p_names text[], p_sizes int[]) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_ids uuid[] := '{}';
  v_id uuid;
  i int;
  v_from int := 0;
  v_ord uuid[];
begin
  select coalesce(array_agg(id order by sort_order), '{}') into v_ord from public.lessons where course_id = p_course;
  for i in 1 .. cardinality(p_names) loop
    insert into public.course_sections (course_id, title, sort_order)
      values (p_course, p_names[i], 1000 + i) returning id into v_id;
    v_ids := v_ids || v_id;
  end loop;
  for i in 1 .. cardinality(p_names) loop
    update public.lessons set section_id = v_ids[i]
      where id = any (v_ord[v_from + 1 : case when i = cardinality(p_names) then cardinality(v_ord) else v_from + p_sizes[i] end]);
    v_from := v_from + p_sizes[i];
  end loop;
  delete from public.course_sections s
    where s.course_id = p_course and not (s.id = any (v_ids))
      and not exists (select 1 from public.lessons l where l.section_id = s.id);
  update public.course_sections set sort_order = sort_order - 1000 where id = any (v_ids);
  perform public.renumber_course_lessons(p_course);
end $$;

revoke execute on function public.renumber_course_lessons(uuid), public.lessons_default_section(),
  public.lessons_section_same_course(), public.split_course_into_sections(uuid, text[], int[])
  from public, anon, authenticated;

-- ---------------------------------------------------------------- admin RPCs

create function public.admin_add_section(p_course uuid, p_title text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  perform 1 from public.courses where id = p_course for update;
  if not found then raise exception 'COURSE_NOT_FOUND' using errcode = 'P0001'; end if;
  insert into public.course_sections (course_id, title, sort_order)
    values (p_course, coalesce(btrim(p_title), ''),
      coalesce((select max(sort_order) from public.course_sections where course_id = p_course), 0) + 1)
    returning id into v_id;
  return v_id;
end $$;

create function public.admin_rename_section(p_section uuid, p_title text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  update public.course_sections set title = coalesce(btrim(p_title), '') where id = p_section;
  if not found then raise exception 'SECTION_NOT_FOUND' using errcode = 'P0001'; end if;
end $$;

-- Only an empty section can be deleted (lessons hold learner progress; delete or move them first).
create function public.admin_delete_section(p_section uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  if exists (select 1 from public.lessons where section_id = p_section) then
    raise exception 'SECTION_NOT_EMPTY' using errcode = 'P0001';
  end if;
  delete from public.course_sections where id = p_section;
  if not found then raise exception 'SECTION_NOT_FOUND' using errcode = 'P0001'; end if;
end $$;

-- New draft lesson "บทเรียนใหม่!" at the end of a section; returns its id.
create function public.admin_add_lesson(p_section uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_course uuid;
  v_id uuid := gen_random_uuid();
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  select course_id into v_course from public.course_sections where id = p_section;
  if v_course is null then raise exception 'SECTION_NOT_FOUND' using errcode = 'P0001'; end if;
  perform 1 from public.courses where id = v_course for update;
  insert into public.lessons (id, course_id, section_id, slug, title, sort_order, status)
    values (v_id, v_course, p_section, 'lesson-' || left(replace(v_id::text, '-', ''), 10), 'บทเรียนใหม่!',
      coalesce((select max(sort_order) from public.lessons where course_id = v_course), 0) + 1, 'draft');
  insert into public.lesson_contents (lesson_id, content_md) values (v_id, '');
  perform public.renumber_course_lessons(v_course);
  return v_id;
end $$;

revoke execute on function public.admin_add_section(uuid, text), public.admin_rename_section(uuid, text),
  public.admin_delete_section(uuid), public.admin_add_lesson(uuid) from public, anon;
grant execute on function public.admin_add_section(uuid, text), public.admin_rename_section(uuid, text),
  public.admin_delete_section(uuid), public.admin_add_lesson(uuid) to authenticated;

-- ---------------------------------------------------------------- backfill existing courses
do $$
declare
  c record;
begin
  for c in select id, slug from public.courses loop
    if not exists (select 1 from public.lessons where course_id = c.id) then
      continue;
    elsif c.slug = 'guitar-basics' then
      perform public.split_course_into_sections(c.id,
        array['จับกีตาร์ครั้งแรก', 'เล่นเพลงแรก', 'เข้าใจคอร์ด', 'ทั่วคอกีตาร์'], array[5, 5, 5, 7]);
    else
      perform public.split_course_into_sections(c.id, array[''], array[0]);
    end if;
  end loop;
end $$;
