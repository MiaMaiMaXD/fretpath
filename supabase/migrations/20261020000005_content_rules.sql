-- Content rules (spec 4.4): publish validation, delete guard, unlock-after-publish, answer-key integrity.

-- A lesson may only be published with >= 1 question, each with an answer key and 2-6 choices.
create function public.validate_lesson_publish() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'published' then
    if not exists (select 1 from public.quiz_questions q where q.lesson_id = new.id)
       or exists (
         select 1 from public.quiz_questions q
         where q.lesson_id = new.id
           and (not exists (select 1 from public.quiz_answer_keys k where k.question_id = q.id)
                or (select count(*) from public.quiz_choices c where c.question_id = q.id) not between 2 and 6))
    then
      raise exception 'LESSON_INCOMPLETE' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

create trigger validate_lesson_publish
  before insert or update of status on public.lessons
  for each row execute function public.validate_lesson_publish();

-- Lessons with learner data cannot be deleted.
create function public.guard_lesson_delete() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.lesson_progress p where p.lesson_id = old.id)
     or exists (select 1 from public.quiz_attempts a where a.lesson_id = old.id) then
    raise exception 'LESSON_HAS_LEARNERS' using errcode = 'P0001';
  end if;
  return old;
end $$;

create trigger guard_lesson_delete
  before delete on public.lessons
  for each row execute function public.guard_lesson_delete();

-- On draft -> published, unlock for learners who completed the previous published lesson
-- (greatest lower sort_order, drafts skipped); the course's first lesson unlocks for all enrolled users.
create function public.unlock_after_publish() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_prev uuid;
begin
  select l.id into v_prev
    from public.lessons l
    where l.course_id = new.course_id and l.status = 'published' and l.sort_order < new.sort_order
    order by l.sort_order desc limit 1;

  if v_prev is null then
    insert into public.lesson_progress (user_id, lesson_id)
      select e.user_id, new.id from public.enrollments e where e.course_id = new.course_id
      on conflict do nothing;
  else
    insert into public.lesson_progress (user_id, lesson_id)
      select p.user_id, new.id
      from public.lesson_progress p
      join public.enrollments e on e.user_id = p.user_id and e.course_id = new.course_id
      where p.lesson_id = v_prev and p.status = 'completed'
      on conflict do nothing;
  end if;
  return null;
end $$;

create trigger unlock_after_publish
  after update of status on public.lessons
  for each row
  when (old.status = 'draft' and new.status = 'published')
  execute function public.unlock_after_publish();

-- The correct choice must belong to the same question (fires before the composite FK check).
create function public.validate_answer_key() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.quiz_choices c
                 where c.id = new.correct_choice_id and c.question_id = new.question_id) then
    raise exception 'INVALID_ANSWERS' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger validate_answer_key
  before insert or update on public.quiz_answer_keys
  for each row execute function public.validate_answer_key();

revoke execute on function public.validate_lesson_publish(), public.guard_lesson_delete(),
  public.unlock_after_publish(), public.validate_answer_key() from public, anon, authenticated;
