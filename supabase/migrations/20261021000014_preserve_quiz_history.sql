-- Editing a question must never relabel or delete learners' recorded answers (FR-04.5).
-- Choices are identified by id; removing a choice (or the question) that has attempt answers is refused.

drop function public.admin_save_question(uuid, uuid, text, text[], int, text);

create function public.admin_save_question(
  p_lesson uuid, p_question uuid, p_prompt text, p_choices text[], p_choice_ids uuid[],
  p_correct int, p_explanation text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_q uuid := p_question;
  v_n int;
  v_ids uuid[] := '{}';
  v_id uuid;
  i int;
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN';
  end if;
  v_n := coalesce(cardinality(p_choices), 0);
  if v_n < 1 or v_n > 6 or p_correct is null or p_correct < 0 or p_correct >= v_n
     or exists (select 1 from unnest(p_choices) c where c is null or btrim(c) = '' or char_length(c) > 200)
     or p_prompt is null or btrim(p_prompt) = '' or char_length(p_prompt) > 500
     or char_length(coalesce(p_explanation, '')) > 1000
     or (p_choice_ids is not null and cardinality(p_choice_ids) <> v_n)
     or (select count(*) from unnest(coalesce(p_choice_ids, '{}')) x where x is not null)
        <> (select count(distinct x) from unnest(coalesce(p_choice_ids, '{}')) x where x is not null) then
    raise exception 'INVALID_ANSWERS' using errcode = 'P0001';
  end if;

  perform 1 from public.lessons where id = p_lesson for update;
  if not found then
    raise exception 'LESSON_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_q is null then
    insert into public.quiz_questions (lesson_id, prompt, sort_order)
      values (p_lesson, p_prompt,
        coalesce((select max(sort_order) from public.quiz_questions where lesson_id = p_lesson), 0) + 1)
      returning id into v_q;
  else
    update public.quiz_questions set prompt = p_prompt, updated_at = now()
      where id = v_q and lesson_id = p_lesson;
    if not found then
      raise exception 'QUESTION_NOT_FOUND' using errcode = 'P0001';
    end if;
  end if;

  -- every supplied id must be an existing choice of this question
  if p_choice_ids is not null and exists (
       select 1 from unnest(p_choice_ids) x
       where x is not null
         and not exists (select 1 from public.quiz_choices c where c.id = x and c.question_id = v_q)) then
    raise exception 'INVALID_ANSWERS' using errcode = 'P0001';
  end if;

  -- refuse to drop a choice that learners have answered
  if exists (
       select 1 from public.quiz_attempt_answers a
       where a.question_id = v_q
         and not (a.choice_id = any (array_remove(coalesce(p_choice_ids, '{}'), null)))) then
    raise exception 'QUESTION_HAS_ANSWERS' using errcode = 'P0001';
  end if;

  for i in 1..v_n loop
    if p_choice_ids is not null and p_choice_ids[i] is not null then
      update public.quiz_choices set text = p_choices[i], sort_order = i, updated_at = now()
        where id = p_choice_ids[i];
      v_ids := v_ids || p_choice_ids[i];
    else
      insert into public.quiz_choices (question_id, text, sort_order)
        values (v_q, p_choices[i], i) returning id into v_id;
      v_ids := v_ids || v_id;
    end if;
  end loop;

  insert into public.quiz_answer_keys (question_id, correct_choice_id, explanation)
    values (v_q, v_ids[p_correct + 1], nullif(p_explanation, ''))
    on conflict (question_id) do update
      set correct_choice_id = excluded.correct_choice_id, explanation = excluded.explanation,
          updated_at = now();

  delete from public.quiz_choices where question_id = v_q and not (id = any (v_ids));
  return v_q;
end $$;

create function public.admin_delete_question(p_question uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_lesson uuid;
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN';
  end if;
  select lesson_id into v_lesson from public.quiz_questions where id = p_question;
  if v_lesson is null then
    raise exception 'QUESTION_NOT_FOUND' using errcode = 'P0001';
  end if;
  perform 1 from public.lessons where id = v_lesson for update;
  if exists (select 1 from public.quiz_attempt_answers where question_id = p_question) then
    raise exception 'QUESTION_HAS_ANSWERS' using errcode = 'P0001';
  end if;
  delete from public.quiz_questions where id = p_question;
end $$;

revoke execute on function public.admin_save_question(uuid, uuid, text, text[], uuid[], int, text),
  public.admin_delete_question(uuid) from public, anon;
grant execute on function public.admin_save_question(uuid, uuid, text, text[], uuid[], int, text),
  public.admin_delete_question(uuid) to authenticated;
