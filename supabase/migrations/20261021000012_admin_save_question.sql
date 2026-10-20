-- Atomic question save (question + whole choice set + answer key + explanation in one transaction)
-- and neighbour swap. Choices are updated in place by position so learners' past attempt answers
-- (which cascade from quiz_choices) survive an edit; only surplus choices are deleted.

create function public.admin_save_question(
  p_lesson uuid, p_question uuid, p_prompt text, p_choices text[], p_correct int,
  p_explanation text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_q uuid := p_question;
  v_n int;
  v_existing uuid[];
  v_ids uuid[] := '{}';
  v_id uuid;
  i int;
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN';
  end if;
  v_n := coalesce(cardinality(p_choices), 0);
  if v_n < 1 or v_n > 6 or p_correct is null or p_correct < 0 or p_correct >= v_n
     or exists (select 1 from unnest(p_choices) c where c is null or btrim(c) = '') then
    raise exception 'INVALID_ANSWERS' using errcode = 'P0001';
  end if;

  -- serialize edits of one lesson (sort_order assignment, choice replacement)
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

  select coalesce(array_agg(id order by sort_order, created_at, id), '{}') into v_existing
    from public.quiz_choices where question_id = v_q;

  for i in 1..v_n loop
    if i <= cardinality(v_existing) then
      update public.quiz_choices set text = p_choices[i], sort_order = i, updated_at = now()
        where id = v_existing[i];
      v_ids := v_ids || v_existing[i];
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

create function public.admin_move_question(p_question uuid, p_direction text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_lesson uuid;
  v_ids uuid[];
  v_pos int;
  v_swap int;
  v_tmp uuid;
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN';
  end if;
  if p_direction not in ('up', 'down') then
    raise exception 'INVALID_ORDER' using errcode = 'P0001';
  end if;
  select lesson_id into v_lesson from public.quiz_questions where id = p_question;
  if v_lesson is null then
    raise exception 'QUESTION_NOT_FOUND' using errcode = 'P0001';
  end if;
  perform 1 from public.lessons where id = v_lesson for update;

  select array_agg(id order by sort_order, created_at, id) into v_ids
    from public.quiz_questions where lesson_id = v_lesson;
  v_pos := array_position(v_ids, p_question);
  v_swap := case when p_direction = 'up' then v_pos - 1 else v_pos + 1 end;
  if v_swap >= 1 and v_swap <= cardinality(v_ids) then
    v_tmp := v_ids[v_pos];
    v_ids[v_pos] := v_ids[v_swap];
    v_ids[v_swap] := v_tmp;
  end if;
  -- renumber densely so the order is stable even if old sort_orders collided
  update public.quiz_questions q set sort_order = t.ord::int
    from unnest(v_ids) with ordinality as t(id, ord)
    where q.id = t.id and q.sort_order <> t.ord::int;
end $$;

revoke execute on function public.admin_save_question(uuid, uuid, text, text[], int, text),
  public.admin_move_question(uuid, text) from public, anon;
grant execute on function public.admin_save_question(uuid, uuid, text, text[], int, text),
  public.admin_move_question(uuid, text) to authenticated;
