-- Daily quiz attempt limit (lessons.quiz_max_attempts): a learner who has not passed a lesson may submit
-- its quiz at most N times per Bangkok calendar day; the count resets at midnight. Once passed, retakes
-- are unlimited. null = unlimited.

-- Attempts left today for a learner, or null when unlimited (no limit set, or already passed).
create function public.quiz_attempts_left_for(p_user uuid, p_lesson uuid) returns int
language sql stable security definer set search_path = '' as $$
  select case
    when l.quiz_max_attempts is null then null
    when exists (select 1 from public.lesson_progress p
                 where p.user_id = p_user and p.lesson_id = p_lesson and p.status = 'completed') then null
    else greatest(0, l.quiz_max_attempts - (
      select count(*)::int from public.quiz_attempts a
      where a.user_id = p_user and a.lesson_id = p_lesson
        and public.bangkok_date(a.submitted_at) = public.bangkok_date(now())))
  end
  from public.lessons l where l.id = p_lesson
$$;
revoke execute on function public.quiz_attempts_left_for(uuid, uuid) from public, anon, authenticated;

-- The signed-in learner's attempts left today (null = unlimited), for the quiz page.
create function public.quiz_attempts_left(p_lesson uuid) returns int
language sql stable security definer set search_path = '' as $$
  select public.quiz_attempts_left_for((select auth.uid()), p_lesson)
$$;
revoke execute on function public.quiz_attempts_left(uuid) from public, anon;
grant execute on function public.quiz_attempts_left(uuid) to authenticated;

create or replace function public.submit_quiz(p_lesson_id uuid, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_uuid_re constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  v_pass_score int;
  v_course uuid;
  v_sort int;
  v_total int;
  v_n int;
  v_matched int;
  v_correct int;
  v_score int;
  v_passed boolean;
  v_attempt uuid;
  v_next_id uuid;
  v_next_slug text;
  v_results jsonb;
  v_left int;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_lesson_unlocked(p_lesson_id) then
    raise exception 'LESSON_LOCKED';
  end if;

  select l.pass_score, l.course_id, l.sort_order
    into v_pass_score, v_course, v_sort
    from public.lessons l where l.id = p_lesson_id;

  -- daily attempt limit: serialize this learner's submissions for the lesson, then count today's
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text || p_lesson_id::text, 0));
  v_left := public.quiz_attempts_left_for(v_uid, p_lesson_id);
  if v_left is not null and v_left <= 0 then
    raise exception 'ATTEMPTS_EXHAUSTED';
  end if;

  -- integrity: refuse to grade a lesson with no questions, a missing answer key or a bad choice count
  if not exists (select 1 from public.quiz_questions q where q.lesson_id = p_lesson_id and q.kind = 'choice')
     or exists (
       select 1 from public.quiz_questions q
       where q.lesson_id = p_lesson_id and q.kind = 'choice'
         and (not exists (select 1 from public.quiz_answer_keys k where k.question_id = q.id)
              or (select count(*) from public.quiz_choices c where c.question_id = q.id) not between 2 and 6)) then
    raise exception 'LESSON_INCOMPLETE';
  end if;

  -- shape: array of {question_id, choice_id} uuid strings
  if jsonb_typeof(p_answers) is distinct from 'array' then
    raise exception 'INVALID_ANSWERS';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_answers) e
    where jsonb_typeof(e) <> 'object'
       or jsonb_typeof(e->'question_id') is distinct from 'string'
       or jsonb_typeof(e->'choice_id') is distinct from 'string'
       or (e->>'question_id') !~ v_uuid_re
       or (e->>'choice_id') !~ v_uuid_re) then
    raise exception 'INVALID_ANSWERS';
  end if;

  select count(*) into v_total from public.quiz_questions q where q.lesson_id = p_lesson_id and q.kind = 'choice';
  v_n := jsonb_array_length(p_answers);
  if v_n <> v_total then
    raise exception 'INVALID_ANSWERS';
  end if;

  -- every lesson question answered exactly once, with a choice belonging to it
  select count(distinct q.id) into v_matched
    from jsonb_to_recordset(p_answers) as a(question_id uuid, choice_id uuid)
    join public.quiz_questions q on q.id = a.question_id and q.lesson_id = p_lesson_id and q.kind = 'choice'
    join public.quiz_choices c on c.id = a.choice_id and c.question_id = q.id;
  if v_matched <> v_total then
    raise exception 'INVALID_ANSWERS';
  end if;

  select count(*) into v_correct
    from jsonb_to_recordset(p_answers) as a(question_id uuid, choice_id uuid)
    join public.quiz_answer_keys k on k.question_id = a.question_id and k.correct_choice_id = a.choice_id;

  v_score := round(v_correct * 100.0 / v_total)::int;
  v_passed := v_score >= v_pass_score;

  insert into public.quiz_attempts (user_id, lesson_id, score_pct, passed)
    values (v_uid, p_lesson_id, v_score, v_passed)
    returning id into v_attempt;

  insert into public.quiz_attempt_answers (attempt_id, question_id, choice_id, is_correct)
    select v_attempt, a.question_id, a.choice_id, (k.correct_choice_id = a.choice_id)
    from jsonb_to_recordset(p_answers) as a(question_id uuid, choice_id uuid)
    join public.quiz_answer_keys k on k.question_id = a.question_id;

  insert into public.lesson_progress as lp (user_id, lesson_id, status, best_score, completed_at)
    values (v_uid, p_lesson_id, case when v_passed then 'completed' else 'unlocked' end::public.progress_status,
            v_score, case when v_passed then now() end)
    on conflict (user_id, lesson_id) do update set
      best_score = greatest(lp.best_score, excluded.best_score),
      status = case when lp.status = 'completed' or excluded.status = 'completed'
                    then 'completed'::public.progress_status else lp.status end,
      completed_at = coalesce(lp.completed_at, excluded.completed_at);

  if v_passed then
    select l.id, l.slug into v_next_id, v_next_slug
      from public.lessons l
      where l.course_id = v_course and l.status = 'published' and l.sort_order > v_sort
      order by l.sort_order limit 1;
    if v_next_id is not null then
      insert into public.lesson_progress (user_id, lesson_id, status)
        values (v_uid, v_next_id, 'unlocked')
        on conflict (user_id, lesson_id) do nothing;
    end if;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'question_id', q.id,
      'choice_id', ans.choice_id,
      'correct_choice_id', k.correct_choice_id,
      'is_correct', ans.is_correct,
      'explanation', k.explanation) order by q.sort_order, q.id), '[]'::jsonb)
    into v_results
    from public.quiz_attempt_answers ans
    join public.quiz_questions q on q.id = ans.question_id
    join public.quiz_answer_keys k on k.question_id = q.id
    where ans.attempt_id = v_attempt;

  return jsonb_build_object(
    'attempt_id', v_attempt,
    'score_pct', v_score,
    'passed', v_passed,
    'pass_score', v_pass_score,
    'next_lesson_slug', v_next_slug,
    'attempts_left', public.quiz_attempts_left_for(v_uid, p_lesson_id),
    'results', v_results);
end $$;
