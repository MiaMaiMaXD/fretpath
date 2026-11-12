-- Display names are at most 50 characters (same rule as lib/validation.ts validateDisplayName).
-- RLS lets a user update their own profile row straight through the API, so the app check alone
-- can be bypassed; this constraint makes the database enforce it too.

-- 1. New users: the signup trigger copies a Google full_name or the email local part, which can be
--    longer than 50, so cut it to 50 here or the insert would fail and block sign-up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_course record;
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(
      coalesce(
        nullif(new.raw_user_meta_data ->> 'display_name', ''),
        nullif(new.raw_user_meta_data ->> 'full_name', ''),
        split_part(new.email, '@', 1)),
      50))
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

-- 2. Existing rows: shorten any name that is already too long, so the constraint can be added.
update public.profiles set display_name = left(display_name, 50) where char_length(display_name) > 50;

-- 3. The rule itself (char_length counts characters, like the app does).
alter table public.profiles
  add constraint profiles_display_name_length check (char_length(display_name) <= 50);
