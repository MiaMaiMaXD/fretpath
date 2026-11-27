-- Quiz quota (2026-11 "Quiz Quota Field" design): a learner who has not passed may take a lesson's quiz
-- lessons.quiz_max_attempts times; the attempt that uses up the quota locks the quiz for 24 hours from
-- that attempt ("ทำได้อีกครั้งในอีก 23 ชั่วโมง 59 นาที"), after which the quota starts again. A quota cycle
-- that is never used up also starts again 24 hours after its first attempt. Passed = unlimited.
-- Replaces the calendar-day rule of 20261127000027 (submit_quiz keeps calling quiz_attempts_left_for).

create function public.quiz_quota_for(p_user uuid, p_lesson uuid)
returns table (used int, max_attempts int, retry_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_max int;
  v_used int := 0;
  v_start timestamptz;
  v_lock timestamptz;
  a record;
begin
  select l.quiz_max_attempts into v_max from public.lessons l where l.id = p_lesson;
  if v_max is null or exists (
       select 1 from public.lesson_progress p
       where p.user_id = p_user and p.lesson_id = p_lesson and p.status = 'completed') then
    return query select 0, null::int, null::timestamptz;
    return;
  end if;

  for a in select q.submitted_at from public.quiz_attempts q
           where q.user_id = p_user and q.lesson_id = p_lesson order by q.submitted_at loop
    if (v_lock is not null and a.submitted_at >= v_lock)
       or (v_lock is null and v_start is not null and a.submitted_at >= v_start + interval '24 hours') then
      v_used := 0; v_start := null; v_lock := null;
    end if;
    v_used := v_used + 1;
    v_start := coalesce(v_start, a.submitted_at);
    if v_used >= v_max then v_lock := a.submitted_at + interval '24 hours'; end if;
  end loop;

  if (v_lock is not null and now() >= v_lock)
     or (v_lock is null and v_start is not null and now() >= v_start + interval '24 hours') then
    v_used := 0; v_lock := null;
  end if;
  return query select v_used, v_max, v_lock;
end $$;
revoke execute on function public.quiz_quota_for(uuid, uuid) from public, anon, authenticated;

-- same signature as before, so submit_quiz uses the new rule unchanged
create or replace function public.quiz_attempts_left_for(p_user uuid, p_lesson uuid) returns int
language sql stable security definer set search_path = '' as $$
  select case when q.max_attempts is null then null else greatest(0, q.max_attempts - q.used) end
  from public.quiz_quota_for(p_user, p_lesson) q
$$;

-- The signed-in learner's quota for the quiz page: used, limit (null = unlimited) and when it reopens.
create function public.quiz_quota(p_lesson uuid)
returns table (used int, max_attempts int, retry_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select * from public.quiz_quota_for((select auth.uid()), p_lesson)
$$;
revoke execute on function public.quiz_quota(uuid) from public, anon;
grant execute on function public.quiz_quota(uuid) to authenticated;
