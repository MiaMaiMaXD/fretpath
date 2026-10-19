-- Row Level Security (spec 4.3), role/permission helpers and practice-date validation.

-- ---------------------------------------------------------------- helpers
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
$$;

create function public.is_enrolled(p_course uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.enrollments e
    where e.user_id = (select auth.uid()) and e.course_id = p_course)
$$;

-- published lesson + enrolled in its course + a lesson_progress row for the caller
create function public.is_lesson_unlocked(p_lesson uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.lessons l
    join public.lesson_progress lp on lp.lesson_id = l.id and lp.user_id = (select auth.uid())
    join public.enrollments e on e.course_id = l.course_id and e.user_id = (select auth.uid())
    where l.id = p_lesson and l.status = 'published')
$$;

create function public.set_user_role(p_user uuid, p_role public.user_role) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN';
  end if;
  update public.profiles set role = p_role where id = p_user;
end $$;

-- ---------------------------------------------------------------- practice date
create function public.validate_practice_log() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.practiced_on > (now() at time zone 'Asia/Bangkok')::date then
    raise exception 'FUTURE_DATE';
  end if;
  return new;
end $$;

create trigger validate_practice_log
  before insert or update on public.practice_logs
  for each row execute function public.validate_practice_log();

-- ---------------------------------------------------------------- privileges
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

grant execute on function public.is_admin(), public.is_enrolled(uuid),
  public.is_lesson_unlocked(uuid), public.set_user_role(uuid, public.user_role) to authenticated;

-- anon: published courses; select on lessons is granted but no anon policy exists, so it sees no rows
grant select on public.courses, public.lessons to anon;

-- content: members read (policy-filtered), admins write (policy-filtered)
grant select, insert, update, delete on public.courses, public.lessons, public.lesson_contents,
  public.quiz_questions, public.quiz_choices, public.quiz_answer_keys to authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, avatar_url, weekly_goal_minutes) on public.profiles to authenticated;

-- results: read only; writes via security-definer triggers/functions
grant select on public.enrollments, public.lesson_progress, public.quiz_attempts,
  public.quiz_attempt_answers to authenticated;

grant select, insert, update, delete on public.practice_logs to authenticated;

-- ---------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_contents enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_choices enable row level security;
alter table public.quiz_answer_keys enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_attempt_answers enable row level security;
alter table public.practice_logs enable row level security;

-- courses
create policy courses_read_published on public.courses for select to anon, authenticated
  using (status = 'published');
create policy courses_admin_all on public.courses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- lessons: published lessons of enrolled courses (locked ones included)
create policy lessons_member_read on public.lessons for select to authenticated
  using (status = 'published' and public.is_enrolled(course_id));
create policy lessons_admin_all on public.lessons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- lesson content / questions / choices: only when the lesson is unlocked
create policy lesson_contents_member_read on public.lesson_contents for select to authenticated
  using (public.is_lesson_unlocked(lesson_id));
create policy lesson_contents_admin_all on public.lesson_contents for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy quiz_questions_member_read on public.quiz_questions for select to authenticated
  using (public.is_lesson_unlocked(lesson_id));
create policy quiz_questions_admin_all on public.quiz_questions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy quiz_choices_member_read on public.quiz_choices for select to authenticated
  using (public.is_lesson_unlocked(
    (select q.lesson_id from public.quiz_questions q where q.id = question_id)));
create policy quiz_choices_admin_all on public.quiz_choices for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- answer keys: admin only (no member/anon policy)
create policy quiz_answer_keys_admin_all on public.quiz_answer_keys for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- results tables: own rows or admin, read only
create policy enrollments_select on public.enrollments for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy lesson_progress_select on public.lesson_progress for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy quiz_attempts_select on public.quiz_attempts for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy quiz_attempt_answers_select on public.quiz_attempt_answers for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.quiz_attempts a
    where a.id = attempt_id and a.user_id = (select auth.uid())));

-- practice logs: member CRUD on own rows, admin read all
create policy practice_logs_own_all on public.practice_logs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy practice_logs_admin_select on public.practice_logs for select to authenticated
  using (public.is_admin());
