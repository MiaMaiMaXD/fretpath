-- Google (OAuth) users carry their name in raw_user_meta_data->>'full_name'.
-- display_name metadata still wins, then full_name, then the email local part.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_course record;
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  for v_course in
    select id from public.courses where status = 'published' and is_free = true
  loop
    insert into public.enrollments (user_id, course_id, source)
    values (new.id, v_course.id, 'free')
    on conflict (user_id, course_id) do nothing;

    insert into public.lesson_progress (user_id, lesson_id, status)
    select new.id, l.id, 'unlocked'
    from public.lessons l
    where l.course_id = v_course.id and l.status = 'published'
    order by l.sort_order
    limit 1
    on conflict (user_id, lesson_id) do nothing;
  end loop;

  return new;
end $$;
