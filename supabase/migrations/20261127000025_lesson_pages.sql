-- Lesson pages (2026-11 lesson editor): a lesson is an ordered list of pages — text, video or quiz —
-- plus a set of example chords shown in the learner's chord lab. Text pages store sanitized HTML from
-- the rich-text editor; pages carried over from the old single-markdown lessons keep body_md until an
-- admin edits them. lesson_contents stays for now as the legacy source (seed files still write it).

alter table public.lessons
  add column example_chords text[] not null default '{}'
    constraint lessons_example_chords_known check (
      example_chords <@ array['C', 'G', 'Am', 'F', 'Em', 'D', 'Dm', 'A', 'E', 'Bm']::text[]);

create table public.lesson_pages (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  kind text not null constraint lesson_pages_kind check (kind in ('text', 'video', 'quiz')),
  title text not null default '' constraint lesson_pages_title_len check (char_length(title) <= 200),
  body_html text constraint lesson_pages_body_len check (char_length(body_html) <= 200000),
  body_md text,
  video_url text
    constraint lesson_pages_video_url_youtube check (
      video_url is null
      or video_url ~ '^https://(www\.)?(youtube\.com/watch\?v=|youtu\.be/)[A-Za-z0-9_-]{11}'),
  sort_order int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lesson_pages_lesson_idx on public.lesson_pages (lesson_id, sort_order);
-- one quiz page per lesson (the quiz is still lesson-level)
create unique index lesson_pages_one_quiz on public.lesson_pages (lesson_id) where kind = 'quiz';

create trigger lesson_pages_set_updated_at before update on public.lesson_pages
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.lesson_pages to authenticated;
alter table public.lesson_pages enable row level security;
create policy lesson_pages_member_read on public.lesson_pages for select to authenticated
  using (public.is_lesson_unlocked(lesson_id));
create policy lesson_pages_admin_all on public.lesson_pages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- legacy content -> pages

-- Pages for a lesson that has none yet, built from its lesson_contents row: a video page (when it
-- has a video), a text page with the markdown, and a quiz page.
create function public.pages_from_legacy_content(p_lesson uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_title text;
  v_md text;
  v_video text;
  v_n int := 0;
begin
  if exists (select 1 from public.lesson_pages where lesson_id = p_lesson) then return; end if;
  select l.title, c.content_md, c.video_url into v_title, v_md, v_video
    from public.lessons l left join public.lesson_contents c on c.lesson_id = l.id
    where l.id = p_lesson;
  if not found then return; end if;
  if v_video is not null then
    v_n := v_n + 1;
    insert into public.lesson_pages (lesson_id, kind, title, video_url, sort_order)
      values (p_lesson, 'video', 'คลิป' || v_title, v_video, v_n);
  end if;
  if coalesce(v_md, '') <> '' then
    v_n := v_n + 1;
    insert into public.lesson_pages (lesson_id, kind, title, body_md, sort_order)
      values (p_lesson, 'text', left(v_title, 200), v_md, v_n);
  end if;
  insert into public.lesson_pages (lesson_id, kind, title, sort_order)
    values (p_lesson, 'quiz', 'แบบทดสอบท้ายบท', v_n + 1);
end $$;

-- Content written the old way (seed files, tests) becomes pages automatically.
create function public.lesson_contents_to_pages() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.pages_from_legacy_content(new.lesson_id);
  return null;
end $$;

create trigger lesson_contents_to_pages after insert on public.lesson_contents
  for each row execute function public.lesson_contents_to_pages();

revoke execute on function public.pages_from_legacy_content(uuid), public.lesson_contents_to_pages()
  from public, anon, authenticated;

-- ---------------------------------------------------------------- save from the editor

-- Saves lesson info and the full ordered page list in one transaction. p_pages is a JSON array of
-- {id?, kind, title, body_html?, video_url?}; pages missing from the list are deleted, new ones get ids.
-- Returns the page ids in order (new pages included).
create function public.admin_save_lesson_pages(
  p_lesson uuid, p_title text, p_summary text, p_chords text[], p_pages jsonb) returns uuid[]
language plpgsql security definer set search_path = '' as $$
declare
  v_page jsonb;
  v_id uuid;
  v_ids uuid[] := '{}';
  v_n int := 0;
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  if jsonb_typeof(p_pages) <> 'array' then raise exception 'INVALID_PAGES' using errcode = 'P0001'; end if;

  update public.lessons
    set title = p_title, summary = nullif(p_summary, ''), example_chords = coalesce(p_chords, '{}')
    where id = p_lesson;
  if not found then raise exception 'LESSON_NOT_FOUND' using errcode = 'P0001'; end if;

  -- keep only listed pages
  delete from public.lesson_pages
    where lesson_id = p_lesson
      and id not in (
        select (e ->> 'id')::uuid from jsonb_array_elements(p_pages) e where e ? 'id' and e ->> 'id' <> '');

  -- park existing rows out of the way, then write in order
  update public.lesson_pages set sort_order = sort_order + 100000 where lesson_id = p_lesson;

  for v_page in select * from jsonb_array_elements(p_pages) loop
    v_n := v_n + 1;
    v_id := nullif(v_page ->> 'id', '')::uuid;
    if v_id is not null and exists (select 1 from public.lesson_pages where id = v_id and lesson_id = p_lesson) then
      update public.lesson_pages set
          kind = v_page ->> 'kind',
          title = coalesce(v_page ->> 'title', ''),
          body_html = case when v_page ->> 'kind' = 'text' and v_page ? 'body_html' then v_page ->> 'body_html' else body_html end,
          body_md = case when v_page ->> 'kind' = 'text' and v_page ? 'body_html' then null else body_md end,
          video_url = case when v_page ->> 'kind' = 'video' then nullif(v_page ->> 'video_url', '') else null end,
          sort_order = v_n
        where id = v_id;
    else
      insert into public.lesson_pages (lesson_id, kind, title, body_html, video_url, sort_order)
        values (p_lesson, v_page ->> 'kind', coalesce(v_page ->> 'title', ''),
          case when v_page ->> 'kind' = 'text' then v_page ->> 'body_html' end,
          case when v_page ->> 'kind' = 'video' then nullif(v_page ->> 'video_url', '') end,
          v_n)
        returning id into v_id;
    end if;
    v_ids := v_ids || v_id;
  end loop;
  return v_ids;
end $$;

revoke execute on function public.admin_save_lesson_pages(uuid, text, text, text[], jsonb) from public, anon;
grant execute on function public.admin_save_lesson_pages(uuid, text, text, text[], jsonb) to authenticated;

-- ---------------------------------------------------------------- backfill
update public.lessons set example_chords = array['Em', 'Am', 'C', 'D', 'G', 'F']
  where slug in ('first-chords', 'open-chords-changes', 'strumming-4-4', 'f-chord-first-song');

do $$
declare
  l record;
begin
  for l in select id from public.lessons loop
    perform public.pages_from_legacy_content(l.id);
  end loop;
end $$;
