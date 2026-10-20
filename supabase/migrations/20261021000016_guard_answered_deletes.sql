-- Learners' recorded answers must survive any admin write path (FR-04.5): quiz_attempt_answers cascades
-- from choices and questions, so refuse deleting an answered choice/question at the table itself.
-- Deleting a user/attempt removes the answers first and leaves choices untouched, so it is unaffected.

create function public.guard_answered_delete() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'quiz_choices' then
    if exists (select 1 from public.quiz_attempt_answers a where a.choice_id = old.id) then
      raise exception 'QUESTION_HAS_ANSWERS' using errcode = 'P0001';
    end if;
  elsif exists (select 1 from public.quiz_attempt_answers a where a.question_id = old.id) then
    raise exception 'QUESTION_HAS_ANSWERS' using errcode = 'P0001';
  end if;
  return old;
end $$;

create trigger guard_answered_delete before delete on public.quiz_choices
  for each row execute function public.guard_answered_delete();
create trigger guard_answered_delete before delete on public.quiz_questions
  for each row execute function public.guard_answered_delete();

revoke execute on function public.guard_answered_delete() from public, anon, authenticated;
