-- FretPath course content: practical (microphone) questions for the lessons that teach chords the
-- verifier knows (2026-11-28). Learners hold each chord and pluck it string by string; the quiz can
-- only be sent once every chord has passed (components/lesson/PracticalCheck.tsx).
--   3 first-chords        Em Am C D
--   4 open-chords-changes G C D Em   (the chords of the instructor's pilot study)
--   8 f-chord-first-song  F          (4-string F, as taught in the lesson)
--  17 barre-a-shape       Bm         (A-shape barre at fret 2)
--  20 caged-system        C A G E D  (the five CAGED shapes in open position)
-- SAFE FOR PRODUCTION: contains no user accounts and no passwords.
-- Idempotent: a lesson that already has a practical question is skipped (one per lesson).
-- Runs as a single script (psql, Supabase CLI seed, or Supabase SQL Editor), after guitar-basics-round3.sql.
-- Deploy the microphone grading (feat/mic-chord-grading) before running this on production.

create or replace function pg_temp.add_practical(p_lesson_slug text, p_chords text[]) returns void
language plpgsql as $$
declare
  v_lesson uuid;
begin
  select id into v_lesson from public.lessons where slug = p_lesson_slug;
  if v_lesson is null then
    raise notice 'skip (lesson not found): %', p_lesson_slug;
    return;
  end if;
  if exists (select 1 from public.quiz_questions where lesson_id = v_lesson and kind = 'practical') then
    return; -- already has one
  end if;
  insert into public.quiz_questions (lesson_id, prompt, kind, practical_chords, sort_order)
  values (v_lesson, 'แบบทดสอบดีดคอร์ดไล่ทีละสายให้ผ่าน', 'practical', p_chords,
          coalesce((select max(sort_order) from public.quiz_questions where lesson_id = v_lesson), 0) + 1);
end $$;

do $content$
begin
perform pg_temp.add_practical('first-chords', array['Em', 'Am', 'C', 'D']);
perform pg_temp.add_practical('open-chords-changes', array['G', 'C', 'D', 'Em']);
perform pg_temp.add_practical('f-chord-first-song', array['F']);
perform pg_temp.add_practical('barre-a-shape', array['Bm']);
perform pg_temp.add_practical('caged-system', array['C', 'A', 'G', 'E', 'D']);
end
$content$;
