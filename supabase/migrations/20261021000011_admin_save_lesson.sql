-- Empty summary/video_url are stored as NULL.
-- Atomic lesson save: lessons + lesson_contents in one transaction, and sort_order assigned under a course lock.

create function public.admin_create_lesson(
  p_course uuid, p_slug text, p_title text, p_summary text, p_pass_score int,
  p_content_md text, p_video_url text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN';
  end if;
  -- serialize concurrent creates in the same course so max+1 cannot collide
  perform 1 from public.courses where id = p_course for update;
  insert into public.lessons (course_id, slug, title, summary, pass_score, sort_order, status)
    values (p_course, p_slug, p_title, nullif(p_summary, ''), p_pass_score,
      coalesce((select max(sort_order) from public.lessons where course_id = p_course), 0) + 1, 'draft')
    returning id into v_id;
  insert into public.lesson_contents (lesson_id, content_md, video_url)
    values (v_id, coalesce(p_content_md, ''), nullif(p_video_url, ''));
  return v_id;
end $$;

create function public.admin_update_lesson(
  p_id uuid, p_slug text, p_title text, p_summary text, p_pass_score int,
  p_content_md text, p_video_url text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN';
  end if;
  update public.lessons
    set slug = p_slug, title = p_title, summary = nullif(p_summary, ''), pass_score = p_pass_score
    where id = p_id;
  if not found then
    raise exception 'LESSON_NOT_FOUND' using errcode = 'P0001';
  end if;
  insert into public.lesson_contents (lesson_id, content_md, video_url)
    values (p_id, coalesce(p_content_md, ''), nullif(p_video_url, ''))
    on conflict (lesson_id) do update
      set content_md = excluded.content_md, video_url = excluded.video_url;
end $$;

revoke execute on function public.admin_create_lesson(uuid, text, text, text, int, text, text),
  public.admin_update_lesson(uuid, text, text, text, int, text, text) from public, anon;
grant execute on function public.admin_create_lesson(uuid, text, text, text, int, text, text),
  public.admin_update_lesson(uuid, text, text, text, int, text, text) to authenticated;
