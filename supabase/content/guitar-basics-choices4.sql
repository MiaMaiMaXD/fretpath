-- FretPath course content: every multiple-choice question gets 4 choices (2026-11-28).
-- 46 questions of guitar-basics had 3 choices; this adds one wrong choice to each. The new choice is
-- inserted at a chosen position (not always last), so the right answers spread over all four slots.
-- SAFE FOR PRODUCTION: contains no user accounts and no passwords. Answer keys are not touched.
-- Idempotent: a question is skipped when it already has this choice or already has 4 choices.
-- Runs as a single script (psql, Supabase CLI seed, or Supabase SQL Editor), after guitar-basics-round3.sql.
-- Questions are found by lesson slug + prompt (question ids are random per database).

create or replace function pg_temp.add_choice(p_lesson_slug text, p_prompt text, p_text text, p_pos int)
returns void language plpgsql as $$
declare
  v_q uuid;
begin
  select q.id into v_q
  from public.quiz_questions q
  join public.lessons l on l.id = q.lesson_id
  where l.slug = p_lesson_slug and q.prompt = p_prompt and q.kind = 'choice';
  if v_q is null then
    raise notice 'skip (question not found): % / %', p_lesson_slug, p_prompt;
    return;
  end if;
  if exists (select 1 from public.quiz_choices where question_id = v_q and text = p_text) then
    return; -- already added
  end if;
  if (select count(*) from public.quiz_choices where question_id = v_q) >= 4 then
    raise notice 'skip (already 4 choices): % / %', p_lesson_slug, p_prompt;
    return;
  end if;
  update public.quiz_choices set sort_order = sort_order + 1 where question_id = v_q and sort_order >= p_pos;
  insert into public.quiz_choices (id, question_id, text, sort_order) values (gen_random_uuid(), v_q, p_text, p_pos);
end $$;

do $content$
begin
-- 1 guitar-anatomy-tuning
perform pg_temp.add_choice('guitar-anatomy-tuning', 'ลูกบิดของกีตาร์อยู่ที่ส่วนใด', 'คอกีตาร์', 2);
perform pg_temp.add_choice('guitar-anatomy-tuning', 'สายที่เล็กที่สุดและมีเสียงสูงที่สุดคือสายที่เท่าไร', 'สาย 4', 1);
perform pg_temp.add_choice('guitar-anatomy-tuning', 'ควรตั้งสายเมื่อใด', 'ตั้งครั้งเดียวตอนซื้อกีตาร์ใหม่', 4);
-- 2 read-tab-chord-charts
perform pg_temp.add_choice('read-tab-chord-charts', 'ในแท็บกีตาร์ เส้นบนสุดแทนสายใด', 'สาย 4 (D)', 1);
perform pg_temp.add_choice('read-tab-chord-charts', 'ตัวเลขที่ซ้อนกันในแนวตั้งในแท็บ ต้องเล่นอย่างไร', 'เล่นจากล่างขึ้นบนทีละตัว', 2);
perform pg_temp.add_choice('read-tab-chord-charts', 'ในแผนผังคอร์ด สัญลักษณ์ x เหนือสายหมายถึงอะไร', 'ดีดสายนั้นเบา ๆ', 1);
-- 3 first-chords
perform pg_temp.add_choice('first-chords', 'ในการนับนิ้วของกีตาร์ นิ้วที่ 3 คือนิ้วอะไร', 'นิ้วชี้', 1);
perform pg_temp.add_choice('first-chords', 'คอร์ด Am ไม่ควรดีดสายใด', 'สาย 5', 2);
perform pg_temp.add_choice('first-chords', 'ควรกดสายตรงตำแหน่งไหนของช่องเฟร็ตจึงจะเสียงใสที่สุด', 'กดทับบนแถบโลหะพอดี', 1);
perform pg_temp.add_choice('first-chords', 'ถ้าเสียงสายบางเส้นตึบไม่ดัง ควรแก้อย่างไร', 'ดีดให้แรงขึ้น', 2);
-- 4 open-chords-changes
perform pg_temp.add_choice('open-chords-changes', 'คอร์ดเปิด (Open chord) คืออะไร', 'คอร์ดที่กดด้วยนิ้วเดียว', 1);
perform pg_temp.add_choice('open-chords-changes', 'ข้อใดเป็นลำดับคอร์ดยอดนิยมที่ใช้ G, Em, C, D', 'Am - F - Bm - E', 2);
perform pg_temp.add_choice('open-chords-changes', 'คอร์ด D ควรดีดตั้งแต่สายใด', 'สาย 3 ถึง 1', 1);
perform pg_temp.add_choice('open-chords-changes', 'ใช้เมโทรนอมช่วยฝึกเปลี่ยนคอร์ดอย่างไร', 'เปิดไว้เป็นเสียงประกอบ ไม่ต้องเล่นให้ตรง', 3);
-- 5 strumming-4-4
perform pg_temp.add_choice('strumming-4-4', 'จังหวะ 4/4 หมายถึงอะไร', 'หนึ่งห้องมี 2 จังหวะ', 1);
perform pg_temp.add_choice('strumming-4-4', 'เมื่อนับจังหวะแบบละเอียด คำว่า "และ" ตรงกับการดีดแบบใด', 'ดีดลงสองครั้ง', 1);
perform pg_temp.add_choice('strumming-4-4', 'ถ้ารูปแบบการดีดข้ามบางจังหวะไป ข้อมือควรทำอย่างไร', 'เปลี่ยนไปดีดเฉพาะจังหวะตก', 4);
perform pg_temp.add_choice('strumming-4-4', 'วิธีฝึกดีดสำหรับผู้เริ่มต้นที่เหมาะสมที่สุดคือข้อใด', 'ดีดเร็วเท่าเพลงต้นฉบับตั้งแต่ครั้งแรก', 2);
-- 6 twelve-notes
perform pg_temp.add_choice('twelve-notes', 'บนกีตาร์ ขยับขึ้น 1 เฟรตเท่ากับระยะเท่าใด', 'หนึ่งเสียงครึ่ง', 3);
perform pg_temp.add_choice('twelve-notes', 'C♯ กับ D♭ ต่างกันอย่างไร', 'C♯ ใช้บนสายต่ำ ส่วน D♭ ใช้บนสายสูง', 2);
-- 7 eighth-note-strumming
perform pg_temp.add_choice('eighth-note-strumming', 'เมื่อนับ 1 และ 2 และ คำว่า "และ" ใช้การดีดแบบใด', 'หยุดดีด', 4);
perform pg_temp.add_choice('eighth-note-strumming', 'ทำไมมือขวาต้องแกว่งต่อเนื่องแม้จังหวะนั้นไม่ดีด', 'เพื่อให้มือซ้ายได้พัก', 1);
perform pg_temp.add_choice('eighth-note-strumming', 'ความเร็วเมโทรนอมที่เหมาะสำหรับเริ่มฝึกแพทเทิร์นใหม่คือข้อใด', 'ประมาณ 120 BPM', 2);
-- 8 f-chord-first-song
perform pg_temp.add_choice('f-chord-first-song', 'คอร์ด F แบบเต็มจัดเป็นคอร์ดประเภทใด', 'พาวเวอร์คอร์ด (Power chord)', 1);
perform pg_temp.add_choice('f-chord-first-song', 'F แบบง่ายที่เล่นเฉพาะสาย 4 ถึง 1 ไม่ต้องดีดสายใด', 'สาย 4 และสาย 3', 4);
perform pg_temp.add_choice('f-chord-first-song', 'ในคอร์ด F แบบง่าย นิ้วชี้ (นิ้ว 1) กดสายใด', 'สาย 3 ที่เฟร็ต 2', 2);
perform pg_temp.add_choice('f-chord-first-song', 'ขั้นตอนใดควรทำก่อนเมื่อฝึกเล่นเพลงแรก', 'เลือกเพลงที่มีคอร์ดทาบหลายคอร์ด', 4);
perform pg_temp.add_choice('f-chord-first-song', 'ถ้าเล่นผิดระหว่างเพลง ควรทำอย่างไร', 'กลับไปฝึกบทแรกใหม่ทั้งหมด', 2);
-- 9 seventh-sus-chords
perform pg_temp.add_choice('seventh-sus-chords', 'คอร์ด 7 (เช่น G7) ต่างจากคอร์ดเมเจอร์ (G) อย่างไร', 'เพิ่มโน้ตตัวที่ 5 ซ้ำอีกตัว', 4);
perform pg_temp.add_choice('seventh-sus-chords', 'คอร์ด sus ได้ชื่อนี้เพราะอะไร', 'ต้องทาบนิ้วชี้ทุกสาย', 2);
perform pg_temp.add_choice('seventh-sus-chords', 'คอร์ด E7 แบบสายเปล่าใช้กี่นิ้ว', '1 นิ้ว', 1);
-- 10 c-major-scale
perform pg_temp.add_choice('c-major-scale', 'สูตรบันไดเสียงเมเจอร์คือข้อใด', 'เต็ม เต็ม เต็ม ครึ่ง เต็ม เต็ม ครึ่ง', 1);
perform pg_temp.add_choice('c-major-scale', 'ขั้นคู่ 8 (Octave) ห่างกันกี่เฟรตบนสายเดียวกัน', '5 เฟรต', 1);
-- 11 building-triads
perform pg_temp.add_choice('building-triads', 'ไตรแอดเมเจอร์ต่างจากไตรแอดไมเนอร์ที่โน้ตขั้นใด', 'ขั้นที่ 7', 4);
-- 12 chords-in-a-key
perform pg_temp.add_choice('chords-in-a-key', 'คอร์ดในคีย์เมเจอร์ ขั้น I ถึง vii° มีชนิดเรียงตามข้อใด', 'ไมเนอร์ทั้ง 7 ตัว', 2);
-- 13 capo-octave
perform pg_temp.add_choice('capo-octave', 'เล่นฮาร์โมนิกที่เฟรต 12 อย่างไร', 'ดีดสายเปล่าแล้วรีบกดเฟรต 12 ตาม', 1);
-- 14 fingerpicking-basics
perform pg_temp.add_choice('fingerpicking-basics', 'อาร์เปจโจ (Arpeggio) คืออะไร', 'การไล่สเกลขึ้นลงให้เร็วที่สุด', 1);
perform pg_temp.add_choice('fingerpicking-basics', 'เมื่อเกาคอร์ด D หัวแม่มือควรดีดสายใดเป็นเสียงเบส', 'สาย 3', 2);
-- 15 power-chords-palm-mute
perform pg_temp.add_choice('power-chords-palm-mute', 'ทำไมพาวเวอร์คอร์ดจึงไม่เป็นทั้งเมเจอร์และไมเนอร์', 'เพราะใช้แค่สายเปล่า', 2);
-- 16 barre-e-shape
perform pg_temp.add_choice('barre-e-shape', 'เมื่อทาบนิ้วชี้ ควรวางนิ้วตรงไหนของช่องเฟรต', 'ทับบนลวดเฟรตพอดี', 3);
-- 17 barre-a-shape
perform pg_temp.add_choice('barre-a-shape', 'ในบาร์คอร์ดรูป A ควรทำอย่างไรกับสาย 6', 'ดีดเป็นสายเปล่า', 1);
-- 19 legato-techniques
perform pg_temp.add_choice('legato-techniques', 'เมื่อทำ pull-off ควรเอานิ้วออกอย่างไร', 'วางนิ้วค้างไว้แล้วดีดซ้ำ', 1);
perform pg_temp.add_choice('legato-techniques', 'วิธีใดช่วยให้เบนด์ได้แรงและเสียงตรง', 'ใช้นิ้วชี้ดึงสายลงนิ้วเดียว', 4);
-- 20 caged-system
perform pg_temp.add_choice('caged-system', 'ข้อใดเป็นประโยชน์ของระบบ CAGED', 'ไม่ต้องฝึกสเกลอีกเลย', 3);
-- 21 odd-meters-shuffle
perform pg_temp.add_choice('odd-meters-shuffle', 'จังหวะขัด (Syncopation) คืออะไร', 'การเล่นเร็วขึ้นเรื่อย ๆ จนจบเพลง', 4);
-- 22 final-song-project
perform pg_temp.add_choice('final-song-project', 'เมื่อเริ่มซ้อมเพลงใหม่กับเมโทรนอม ควรตั้งความเร็วเท่าไร', 'ไม่ต้องใช้เมโทรนอม ฟังเพลงต้นฉบับแทน', 1);
end
$content$;
