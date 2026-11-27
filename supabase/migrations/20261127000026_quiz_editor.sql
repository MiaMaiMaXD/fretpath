-- Quiz page (2026-11 lesson editor): multiple-choice ("ปรนัย") and practical ("ปฏิบัติ": play the listed
-- chords) questions, a retake setting, and one save for the whole editor. Practical questions are
-- authored now but not graded yet (mic grading comes later), so grading and publish rules only count
-- multiple-choice questions.

alter table public.quiz_questions
  add column kind text not null default 'choice'
    constraint quiz_questions_kind check (kind in ('choice', 'practical')),
  add column practical_chords text[] not null default '{}'
    constraint quiz_questions_practical_chords_known check (
      practical_chords <@ array['C', 'G', 'Am', 'F', 'Em', 'D', 'Dm', 'A', 'E', 'Bm']::text[]);
-- at most one practical question per lesson
create unique index quiz_questions_one_practical on public.quiz_questions (lesson_id) where kind = 'practical';

-- How many times a learner may take the quiz (null = unlimited). Stored only for now.
alter table public.lessons
  add column quiz_max_attempts int constraint lessons_quiz_max_attempts_range check (quiz_max_attempts between 1 and 99);

-- ---------------------------------------------------------------- publish rules
create or replace function public.lesson_publish_problems_internal(p_lesson uuid) returns text[]
language sql stable security definer set search_path = '' as $$
  select case
    when not exists (select 1 from public.quiz_questions q where q.lesson_id = p_lesson and q.kind = 'choice')
      then array['NO_QUESTIONS']
    else coalesce((
      select array_agg(s.p order by s.ord, s.p)
      from (
        select 'QUESTION_NO_KEY:' || q.id::text as p, q.sort_order as ord
          from public.quiz_questions q
          where q.lesson_id = p_lesson and q.kind = 'choice'
            and not exists (select 1 from public.quiz_answer_keys k where k.question_id = q.id)
        union all
        select 'QUESTION_CHOICE_COUNT:' || q.id::text, q.sort_order
          from public.quiz_questions q
          where q.lesson_id = p_lesson and q.kind = 'choice'
            and (select count(*) from public.quiz_choices c where c.question_id = q.id) not between 2 and 6
        union all
        select 'PRACTICAL_NO_CHORDS:' || q.id::text, q.sort_order
          from public.quiz_questions q
          where q.lesson_id = p_lesson and q.kind = 'practical' and cardinality(q.practical_chords) = 0
      ) s), '{}'::text[])
  end
$$;

-- ---------------------------------------------------------------- grading: multiple choice only
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
    'results', v_results);
end $$;

-- ---------------------------------------------------------------- save the quiz
-- p_questions: ordered JSON array of
--   {id?, kind:'choice', prompt, choices:[text...], choice_ids:[uuid|null...], correct:int, explanation?}
--   {id?, kind:'practical', prompt, chords:[...]}
-- Questions missing from the list are deleted (answered ones are protected by their guard trigger).
create function public.admin_save_quiz(p_lesson uuid, p_pass_score int, p_max_attempts int, p_questions jsonb)
returns uuid[]
language plpgsql security definer set search_path = '' as $$
declare
  v_q jsonb;
  v_id uuid;
  v_ids uuid[] := '{}';
  v_kind text;
  v_choices text[];
  v_choice_ids uuid[];
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  if jsonb_typeof(p_questions) <> 'array' then raise exception 'INVALID_ANSWERS' using errcode = 'P0001'; end if;
  perform 1 from public.lessons where id = p_lesson for update;
  if not found then raise exception 'LESSON_NOT_FOUND' using errcode = 'P0001'; end if;

  update public.lessons set pass_score = p_pass_score, quiz_max_attempts = p_max_attempts where id = p_lesson;

  delete from public.quiz_questions
    where lesson_id = p_lesson
      and id not in (
        select (e ->> 'id')::uuid from jsonb_array_elements(p_questions) e where e ? 'id' and e ->> 'id' <> '');

  for v_q in select * from jsonb_array_elements(p_questions) loop
    v_kind := coalesce(v_q ->> 'kind', 'choice');
    v_id := nullif(v_q ->> 'id', '')::uuid;
    if v_id is not null and not exists (select 1 from public.quiz_questions where id = v_id and lesson_id = p_lesson) then
      raise exception 'QUESTION_NOT_FOUND' using errcode = 'P0001';
    end if;
    if v_id is not null and (select kind from public.quiz_questions where id = v_id) <> v_kind then
      raise exception 'INVALID_ANSWERS' using errcode = 'P0001';
    end if;

    if v_kind = 'choice' then
      select coalesce(array_agg(x order by o), '{}') into v_choices
        from jsonb_array_elements_text(coalesce(v_q -> 'choices', '[]')) with ordinality as t(x, o);
      -- choice ids keep learners' recorded answers attached to the same choice after edits/reorders
      select array_agg(nullif(x, '')::uuid order by o) into v_choice_ids
        from jsonb_array_elements_text(coalesce(v_q -> 'choice_ids', '[]')) with ordinality as t(x, o);
      if v_choice_ids is not null and cardinality(v_choice_ids) <> cardinality(v_choices) then
        raise exception 'INVALID_ANSWERS' using errcode = 'P0001';
      end if;
      v_id := public.admin_save_question(p_lesson, v_id, coalesce(v_q ->> 'prompt', ''), v_choices,
        v_choice_ids, (v_q ->> 'correct')::int, v_q ->> 'explanation');
    elsif v_kind = 'practical' then
      if v_id is null then
        insert into public.quiz_questions (lesson_id, kind, prompt, practical_chords, sort_order)
          values (p_lesson, 'practical', coalesce(v_q ->> 'prompt', ''),
            array(select jsonb_array_elements_text(coalesce(v_q -> 'chords', '[]'))), 0)
          returning id into v_id;
      else
        update public.quiz_questions
          set prompt = coalesce(v_q ->> 'prompt', ''),
              practical_chords = array(select jsonb_array_elements_text(coalesce(v_q -> 'chords', '[]'))),
              updated_at = now()
          where id = v_id;
      end if;
    else
      raise exception 'INVALID_ANSWERS' using errcode = 'P0001';
    end if;
    v_ids := v_ids || v_id;
  end loop;

  update public.quiz_questions q set sort_order = t.ord::int
    from unnest(v_ids) with ordinality as t(id, ord)
    where q.id = t.id and q.sort_order is distinct from t.ord::int;
  return v_ids;
end $$;

-- One transaction for the whole editor: lesson info + pages + quiz.
create function public.admin_save_lesson_editor(
  p_lesson uuid, p_title text, p_summary text, p_chords text[], p_pages jsonb,
  p_pass_score int, p_max_attempts int, p_questions jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_pages uuid[];
  v_questions uuid[];
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  v_pages := public.admin_save_lesson_pages(p_lesson, p_title, p_summary, p_chords, p_pages);
  v_questions := public.admin_save_quiz(p_lesson, p_pass_score, p_max_attempts, p_questions);
  return jsonb_build_object('pages', to_jsonb(v_pages), 'questions', to_jsonb(v_questions));
end $$;

revoke execute on function public.admin_save_quiz(uuid, int, int, jsonb),
  public.admin_save_lesson_editor(uuid, text, text, text[], jsonb, int, int, jsonb) from public, anon;
grant execute on function public.admin_save_quiz(uuid, int, int, jsonb),
  public.admin_save_lesson_editor(uuid, text, text, text[], jsonb, int, int, jsonb) to authenticated;
