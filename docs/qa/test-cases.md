# FretPath — Test Cases

เวอร์ชัน 1.0 · ชุดแรก: FR-03 (เส้นทางการเรียน), FR-04 (แบบทดสอบ), NFR-01 (ความปลอดภัย)
TC ของ FR-01, FR-02, FR-05, FR-06, FR-07 และ NFR-02 … NFR-07 จะเขียนต่อในแผนที่ 2–3 (ดู `rtm.md`)

## 1. รูปแบบและข้อกำหนด

**รหัส TC:** `TC-<พื้นที่>-<ลำดับ 2 หลัก>`

| พื้นที่ | ครอบคลุม | พื้นที่ | ครอบคลุม |
|---|---|---|---|
| AUTH | FR-01 | DSH | FR-06 |
| LSN | FR-02 | ADM | FR-07 |
| PATH | FR-03 | SEC | NFR-01 |
| QZ | FR-04 | MOB | NFR-02 |
| PRC | FR-05 | | |

**ตัวย่อชื่อไฟล์เทสต์อัตโนมัติ** (ทุกไฟล์อยู่ใต้ `supabase/tests/` และ `e2e/api/`)
- `003` = `supabase/tests/003_rls.test.sql` · `004` = `004_submit_quiz.test.sql` · `005` = `005_content_rules.test.sql` · `002` = `002_auth_triggers.test.sql` · `006` = `006_final_review.test.sql`
- `rls.spec` = `e2e/api/rls.spec.ts` · `submit-quiz.spec` = `e2e/api/submit-quiz.spec.ts` (Playwright; อยู่ใน `e2e/api/` แล้ว — ชื่อเทสต์ใช้รหัส TC ในเอกสารนี้)
- ชื่อในวงเล็บคือชื่อเทสต์ pgTAP (`test_...`) ในไฟล์นั้น

**คอลัมน์ "M/A":** Manual หรือ Automated; ถ้าเป็น Automated เฉพาะระดับ pgTAP จะระบุเฉพาะไฟล์ pgTAP; ถ้ายังไม่ได้ automate จะเขียน "ยังไม่ automate" และระบุแผน (ไม่นับเป็นความครอบคลุมอัตโนมัติ)

**รหัส error ที่ใช้อ้างอิง:** `NOT_AUTHENTICATED`, `LESSON_LOCKED`, `INVALID_ANSWERS`, `LESSON_INCOMPLETE`, `LESSON_HAS_LEARNERS`, `FUTURE_DATE`, `NOT_ADMIN`

**ข้อเท็จจริงของระบบที่ใช้ในเอกสารนี้**
- `explanation` เก็บใน `quiz_answer_keys` (อ่านได้เฉพาะแอดมิน) และ `submit_quiz` คืนให้ผู้เรียนหลังส่งเท่านั้น; `quiz_questions` ไม่มีคอลัมน์ `explanation`
- ผู้ไม่ล็อกอินอ่าน `lessons` แล้วได้ผลว่าง (ไม่ใช่ error)
- ผู้ไม่ล็อกอินเรียก `submit_quiz` ถูกปฏิเสธด้วยสิทธิ์ (SQLSTATE `42501`); ผู้ล็อกอินที่ไม่ผ่านเงื่อนไขในฟังก์ชันได้ `P0001` + รหัส error ข้างต้น
- `submit_quiz` ปฏิเสธบทที่ข้อมูลไม่สมบูรณ์ (ไม่มีคำถามเลย, มีคำถามที่ไม่มีแถวใน `quiz_answer_keys`, หรือจำนวนตัวเลือกนอกช่วง 2–6) ด้วย `LESSON_INCOMPLETE` (ตรวจหลังตรวจการล็อก ก่อนตรวจรูปแบบคำตอบ)
- คอร์สฟรีที่เปลี่ยนเป็น published ภายหลัง (ทริกเกอร์ `enroll_after_course_publish`) ลงทะเบียนผู้ใช้ทุกคนที่มีอยู่แล้วและปลดล็อกบทแรกที่ published; คอร์สไม่ฟรีไม่ลงทะเบียนอัตโนมัติ
- วันที่ฝึกเทียบกับ "วันนี้" ตามเวลา `Asia/Bangkok` ผ่านฟังก์ชัน `public.bangkok_date(timestamptz)`
- คะแนน `score_pct = round(ถูก / ทั้งหมด × 100)` ปัดแบบ half-up; ผ่านเมื่อ `score_pct ≥ pass_score` (ค่าเริ่มต้น 60)

---

## 2. NFR-01 ความปลอดภัย (TC-SEC)

| รหัส | ชื่อ | อ้างอิง | เงื่อนไขก่อนเริ่ม | ขั้นตอน | ผลที่คาดหวัง | ความสำคัญ | ประเภท | เทคนิค | M/A | ไฟล์เทสต์อัตโนมัติ |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-SEC-01 | ผู้เรียนอ่านเฉลยไม่ได้ | NFR-01, FR-04.3 | ผู้เรียน A ล็อกอินแล้ว; มีคำถามพร้อมเฉลยใน `quiz_answer_keys` | 1. ส่ง `SELECT` / GET `quiz_answer_keys` ด้วย token ผู้เรียน A | ได้ผลว่าง (ไม่มีแถวใดคืน) | High | Security | Role-based | Automated | `e2e/api/rls.spec.ts`; `003` (`test_member_cannot_read_answer_keys`) |
| TC-SEC-02 | ผู้เรียนเขียนความคืบหน้าหรือผลสอบตรง ๆ ไม่ได้ | NFR-01, FR-03.3, FR-04.3 | ผู้เรียน A ล็อกอิน; บท 2 ยังล็อก | 1. INSERT `lesson_progress` (บท 2, unlocked) ด้วย token A<br>2. INSERT `quiz_attempts` (score 100, passed) ด้วย token A | ทั้งสองคำสั่งถูกปฏิเสธ (สิทธิ์ `42501`); ไม่มีแถวถูกสร้าง บท 2 ยังล็อก | High | Security | Role-based | Automated | `e2e/api/rls.spec.ts`; `003` (`test_member_cannot_write_progress`, `test_member_cannot_write_attempts`) |
| TC-SEC-03 | ผู้เรียนเลื่อนตัวเองเป็นแอดมินไม่ได้ | NFR-01, FR-07.1 | ผู้เรียน A (`role = member`) ล็อกอิน | 1. UPDATE `profiles SET role = 'admin'` ของตัวเองด้วย token A | ถูกปฏิเสธ; `role` ยังเป็น `member` | High | Security | Role-based | Automated | `e2e/api/rls.spec.ts`; `003` (`test_member_cannot_change_own_role`) |
| TC-SEC-04 | ผู้เรียนอ่านบันทึกการฝึกของผู้เรียนอื่นไม่ได้ | NFR-01, FR-05.4 | ผู้เรียน A, B; B มี `practice_logs` 1 แถว | 1. ล็อกอินเป็น A, SELECT `practice_logs` ที่ `user_id` = B | ได้ผลว่าง (0 แถว) | High | Security | Role-based | Automated | `e2e/api/rls.spec.ts`; `003` (`test_member_reads_only_own_practice_logs`) |
| TC-SEC-05 | ผู้ไม่ล็อกอินอ่านบทเรียนไม่ได้ | NFR-01 | ไม่มี session; มีบท published | 1. GET `lessons` ด้วย anon key | ได้ผลว่าง ไม่ใช่ error; ไม่เห็นบทเรียนใดเลย | High | Security | Role-based | Automated | `e2e/api/rls.spec.ts`; `003` (`test_anon_cannot_read_lessons`) |
| TC-SEC-06 | บทที่ล็อกเห็นชื่อแต่ไม่เห็นเนื้อหาและคำถาม | NFR-01, FR-03.1, FR-03.4 | ผู้เรียน A ลงทะเบียนแล้ว; บท 1 ปลดล็อก, บท 2 ล็อก | 1. SELECT `lessons` บท 2<br>2. SELECT `lesson_contents` บท 2<br>3. SELECT `quiz_questions` บท 2<br>4. SELECT `lesson_contents` บท 1 | 1 เห็นหัวบท (ชื่อ, `pass_score`)<br>2–3 ผลว่าง<br>4 เห็นเนื้อหา | High | Security | Role-based, State Transition | Automated | `e2e/api/rls.spec.ts`; `003` (`test_locked_lesson_title_visible`, `test_locked_lesson_content_hidden`, `test_locked_lesson_questions_hidden`, `test_unlocked_lesson_content_visible`) |
| TC-SEC-07 | `submit_quiz` กับบทที่ล็อกได้ `LESSON_LOCKED` | NFR-01, FR-03.4, FR-04.3 | ผู้เรียน A; บท 2 ล็อก (ไม่มีแถว `lesson_progress`) | 1. เรียก RPC `submit_quiz(บท 2, คำตอบครบถูกต้อง)` ด้วย token A | ได้ error `LESSON_LOCKED`; ไม่มี `quiz_attempts` ใหม่ | High | Security | Role-based, Decision Table | Automated | `e2e/api/submit-quiz.spec.ts`; `004` (`test_locked_lesson_rejected`) |
| TC-SEC-08 | ผู้ไม่ล็อกอินเรียก `submit_quiz` ไม่ได้ | NFR-01, FR-04.3 | ไม่มี session | 1. เรียก RPC `submit_quiz(บท 1, [])` ด้วย anon key | ถูกปฏิเสธด้วยสิทธิ์ (`42501`) ไม่มีผลลัพธ์คะแนนและไม่มี attempt ถูกสร้าง | High | Security | Role-based | Automated | `004` (`test_anon_cannot_submit`); e2e: ยังไม่เขียน |
| TC-SEC-09 | ผู้เรียนเรียก `set_user_role` ไม่ได้ | NFR-01, FR-07.1 | ผู้เรียน A | 1. RPC `set_user_role(A, 'admin')` ด้วย token A | error `NOT_ADMIN`; role ไม่เปลี่ยน | High | Security | Role-based | Automated | `003` (`test_member_cannot_call_set_user_role`); e2e: ยังไม่เขียน |
| TC-SEC-10 | ผู้เรียนแก้บันทึกการฝึกของผู้อื่นไม่ได้ | NFR-01, FR-05.4 | ผู้เรียน A, B; B มี log | 1. ล็อกอินเป็น A, UPDATE `practice_logs SET minutes = 1` ที่ `user_id` = B | ไม่มีแถวถูกแก้ (0 rows); log ของ B ไม่เปลี่ยน | High | Security | Role-based | Automated | `003` (`test_member_cannot_update_others_logs`); e2e: ยังไม่เขียน |
| TC-SEC-11 | บทฉบับร่างและบทที่ถูกเปลี่ยนกลับเป็นฉบับร่างมองไม่เห็นสำหรับผู้เรียน | NFR-01, FR-07.4 | บท draft หนึ่งบท; อีกบทที่ A ปลดล็อกแล้วแต่แอดมินเปลี่ยนเป็น draft | 1. A SELECT `lessons` ของทั้งสองบท<br>2. A SELECT `lesson_contents` ของบทที่ถูกเปลี่ยนกลับ | ไม่เห็นทั้งหัวบทและเนื้อหา | High | Security | State Transition (draft ↔ published) | Automated | `003` (`test_member_cannot_see_draft_lessons`, `test_unpublished_lesson_hidden`, `test_unpublished_lesson_content_hidden`) |
| TC-SEC-12 | คำอธิบายเฉลยอ่านไม่ได้ก่อนส่ง | NFR-01, FR-04.3 | ผู้เรียน A ล็อกอิน | 1. SELECT `explanation` จาก `quiz_answer_keys`<br>2. ตรวจว่า `quiz_questions` ไม่มีคอลัมน์ `explanation` | 1 ผลว่าง<br>2 ไม่มีคอลัมน์ดังกล่าว | High | Security | Role-based | Automated | `003` (`test_member_cannot_read_explanations`, `test_quiz_questions_has_no_explanation_column`) |
| TC-SEC-13 | แอดมินอ่านเฉลย อ่านบันทึกทุกคน และตั้ง role ได้ | NFR-01, FR-07.1 | แอดมินล็อกอิน | 1. SELECT `quiz_answer_keys`<br>2. SELECT `practice_logs` ของผู้เรียน B<br>3. RPC `set_user_role` | ทั้งสามสำเร็จ | Medium | Positive | Role-based | Automated | `003` (`test_admin_reads_answer_keys`, `test_admin_reads_all_logs`, `test_admin_can_set_user_role`) |
| TC-SEC-14 | ผู้ไม่ล็อกอินอ่านเฉพาะคอร์สที่เผยแพร่ | NFR-01 | คอร์ส published และ draft | 1. GET `courses` ด้วย anon key | เห็นเฉพาะคอร์ส published | Medium | Positive | Role-based | Automated | `003` (`test_anon_reads_published_courses`) |
| TC-SEC-15 | ผู้เรียนอ่านความคืบหน้า ผลสอบ และ enrollments ของผู้อื่นไม่ได้ | NFR-01, FR-04.5 | ผู้เรียน A, B; B มี `lesson_progress`, `quiz_attempts`, `quiz_attempt_answers`, `enrollments` | 1. A SELECT แต่ละตารางโดยกรอง `user_id` = B | ทุกตารางคืนผลว่าง | High | Security | Role-based | Manual | ยังไม่ automate (นโยบายอยู่ในสเปก 4.3; `003` ยังไม่ครอบคลุมตารางเหล่านี้) |
| TC-SEC-16 | ไม่มี service role key ในโค้ดฝั่งเบราว์เซอร์ | NFR-01 | build production แล้ว | 1. ค้น `SUPABASE_SERVICE_ROLE_KEY` และค่า key ใน `src/` (ยกเว้น `e2e/`) และใน output ของ `next build` (`.next/static`)<br>2. ตรวจว่าตัวแปรไม่มีคำนำหน้า `NEXT_PUBLIC_` | ไม่พบทั้งชื่อตัวแปรและค่า key ในไฟล์ที่ส่งถึงเบราว์เซอร์ | High | Security | Static check | Manual | ยังไม่ automate (วางแผนเป็นขั้นตอน grep ใน CI) |
| TC-SEC-17 | ผู้เรียนเข้าหน้าแอดมินไม่ได้ | NFR-01, FR-07.1 | ผู้เรียนล็อกอิน; หน้า `/admin` พร้อมใช้ (แผนที่ 3) | 1. เปิด `/admin`, `/admin/lessons`, `/admin/lessons/[id]` ด้วยบัญชีผู้เรียน<br>2. เปิดซ้ำด้วยผู้ไม่ล็อกอิน | ผู้เรียนถูกปฏิเสธ/พากลับ; ผู้ไม่ล็อกอินถูกพาไป `/login` | High | Security | Role-based | Automated (แผนที่ 3) | ยังไม่มี — จะเขียนใน `e2e/specs/` พร้อมหลังบ้านแอดมิน |

---

## 3. FR-03 เส้นทางการเรียน (TC-PATH)

| รหัส | ชื่อ | อ้างอิง | เงื่อนไขก่อนเริ่ม | ขั้นตอน | ผลที่คาดหวัง | ความสำคัญ | ประเภท | เทคนิค | M/A | ไฟล์เทสต์อัตโนมัติ |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-PATH-01 | หน้าเส้นทางแสดงทุกบทตามลำดับพร้อมสถานะ | FR-03.1 | ผู้เรียนมีบท 1 จบแล้ว, บท 2 เรียนได้, บท 3 ล็อก; หน้า `/path` พร้อมใช้ | 1. เปิด `/path` | แสดงบทที่ published ทั้งหมดเรียงตาม `sort_order` พร้อมสถานะ "จบแล้ว / เรียนได้ / ล็อก" ตรงตามจริง และบทล็อกแสดงชื่อ | High | Positive | State Transition | Automated (แผนที่ 2) | ยังไม่มี (ข้อมูลระดับ DB ดู TC-SEC-06) |
| TC-PATH-02 | บทฉบับร่างไม่แสดงในเส้นทาง | FR-03.1, FR-07.4 | คอร์สมีบท published 2 บท และ draft 1 บท | 1. ผู้เรียนเปิด `/path` (หรือ SELECT `lessons`) | ไม่เห็นบท draft | Medium | Negative | Equivalence Partitioning | Automated | `003` (`test_member_cannot_see_draft_lessons`); UI: ยังไม่มี (แผนที่ 2) |
| TC-PATH-03 | สมัครสมาชิกแล้วบทแรกปลดล็อกและลงทะเบียนคอร์สฟรี | FR-03.2, FR-01.6 | คอร์สฟรี published, 3 บท | 1. สร้างผู้ใช้ใหม่ใน Auth (ทริกเกอร์ `handle_new_user`)<br>2. ตรวจ `enrollments` และ `lesson_progress` | มี enrollment คอร์สฟรี; มีแถว `lesson_progress` เฉพาะบทแรก (unlocked) บทอื่นไม่มีแถว (ล็อก) | High | Positive | State Transition | Automated | `002` (`test_new_user_enrolled_in_published_free_courses_only`, `test_first_lesson_unlocked_only`) |
| TC-PATH-04 | บทแรกที่เผยแพร่ภายหลังปลดล็อกให้ผู้ลงทะเบียนอยู่แล้ว | FR-03.2, FR-03.5 | ผู้เรียน A, B ลงทะเบียนแล้ว; คอร์สมีบทแรกเป็น draft | 1. แอดมินเผยแพร่บทแรก<br>2. ตรวจ `lesson_progress` ของ A และ B | A และ B มีแถว unlocked ของบทแรก | High | Positive | State Transition | Automated | `005` (`test_first_lesson_unlocked_for_a`, `test_first_lesson_unlocked_for_b`) |
| TC-PATH-05 | สอบผ่านตาม `pass_score` ปลดล็อกบทถัดไป | FR-03.3 | บท 1 เรียนได้, บท 2 ล็อก, `pass_score` = 60 | 1. ส่งแบบทดสอบบท 1 ได้ 60%<br>2. ตรวจสถานะบท 1 และบท 2 | บท 1 completed; บท 2 มีแถว unlocked | High | Positive | Boundary, Decision Table | Automated | ดู TC-QZ-02; `004` (`test_exact_pass_score_completes`, `test_next_lesson_unlocked`) |
| TC-PATH-06 | สอบไม่ถึง `pass_score` ไม่ปลดล็อกบทถัดไป | FR-03.3 | เหมือน TC-PATH-05 | 1. ส่งแบบทดสอบบท 1 ได้ 40%<br>2. ตรวจ `lesson_progress` ของบท 2 | บท 2 ไม่มีแถว (ยังล็อก); บท 1 ไม่เป็น completed | High | Negative | Decision Table | Automated | ดู TC-QZ-01; `004` (`test_fail_does_not_unlock_next`) |
| TC-PATH-07 | การปลดล็อกข้ามบทฉบับร่าง | FR-03.3, FR-07.4 | บท 1, 2 (draft), 3 | 1. สอบบท 1 ผ่าน<br>2. ตรวจบทที่ปลดล็อกและ `next_lesson_slug` | บท 3 ถูกปลดล็อก; `next_lesson_slug` คือ slug บท 3; บท 2 ไม่ถูกปลดล็อก | High | Boundary | Decision Table | Automated | `004` (`test_next_lesson_skips_draft`, `test_next_lesson_unlocked`) |
| TC-PATH-08 | เปิดบทที่ล็อกผ่าน URL ถูกพากลับ `/path` พร้อมข้อความ | FR-03.4 | ผู้เรียนล็อกอิน; บท 2 ล็อก | 1. เปิด `/lessons/<slug-บท-2>` ตรงจาก URL | เซิร์ฟเวอร์ redirect ไป `/path` พร้อมข้อความภาษาไทยบอกบทที่ต้องผ่านก่อน (เช่น "ต้องผ่านแบบทดสอบบท 1 ก่อน"); เนื้อหาบทไม่ถูกส่งมาในหน้า | High | Negative | State Transition | Automated (แผนที่ 2) | ยังไม่มี — E2E ใน `e2e/specs/` แผนที่ 2 |
| TC-PATH-09 | เนื้อหาบทที่ล็อกไม่ถูกส่งจากฐานข้อมูล (การบังคับฝั่งเซิร์ฟเวอร์) | FR-03.4, NFR-01 | บท 2 ล็อก | 1. ผู้เรียนเรียก REST ขอ `lesson_contents`/`quiz_questions` ของบท 2 โดยตรง (ข้ามหน้าเว็บ) | ผลว่าง; การซ่อนปุ่มในหน้าเว็บไม่ใช่กลไกเดียว | High | Security | Role-based | Automated | ดู TC-SEC-06; `003` (`test_locked_lesson_content_hidden`, `test_locked_lesson_questions_hidden`) |
| TC-PATH-10 | เผยแพร่บทใหม่แล้วปลดล็อกให้ผู้ที่ผ่านบทก่อนหน้าแล้ว | FR-03.5 | ผู้เรียน A จบบท 1; บท 2 เป็น draft ครบเงื่อนไขเผยแพร่ | 1. แอดมินเปลี่ยนบท 2 เป็น published<br>2. ตรวจ `lesson_progress` ของ A | A มีแถว unlocked ของบท 2 | High | Positive | State Transition | Automated | `005` (`test_publish_unlocks_for_completed_learner`, `test_admin_publish_wrote_unlock_row`) |
| TC-PATH-11 | เผยแพร่บทใหม่ไม่ปลดล็อกให้ผู้ที่ยังไม่ผ่านบทก่อนหน้า | FR-03.5 | ผู้เรียน B ยังไม่ผ่านบท 1 | 1. แอดมินเผยแพร่บท 2<br>2. ตรวจ `lesson_progress` ของ B | B ไม่มีแถวของบท 2 (ยังล็อก) | High | Negative | Decision Table | Automated | `005` (`test_publish_does_not_unlock_for_incomplete_learner`) |
| TC-PATH-12 | เผยแพร่บทที่อยู่หลังบท draft: ปลดล็อกข้ามบท draft ถูกต้อง | FR-03.5, FR-03.3 | ผู้เรียน A จบบท ก่อนหน้า; มีบท draft คั่นกลาง | 1. เผยแพร่บทที่อยู่หลังบท draft<br>2. ตรวจผู้เรียนที่จบ/ไม่จบ | ผู้ที่จบบท published ก่อนหน้าได้ปลดล็อก; ผู้ที่ไม่จบไม่ได้ | Medium | Boundary | Decision Table | Automated | `005` (`test_unlock_skips_draft_for_completed_learner`, `test_unlock_skips_draft_not_for_incomplete_learner`) |
| TC-PATH-13 | การเปลี่ยนสถานะบท ล็อก → เรียนได้ → จบแล้ว ไม่ถอยกลับ | FR-03.1, FR-04.5 | บทที่ผู้เรียนจบแล้ว | 1. สอบบทเดิมซ้ำได้คะแนนต่ำกว่า `pass_score`<br>2. ตรวจ `status` | `status` ยังเป็น completed และ `best_score` เดิม | High | Boundary | State Transition | Automated | `004` (`test_completed_not_downgraded`, `test_best_score_kept_on_lower_retake`); ดู TC-QZ-09 |
| TC-PATH-14 | เผยแพร่คอร์สฟรีภายหลัง: ลงทะเบียนผู้ใช้เดิมและปลดล็อกบทแรก; คอร์สไม่ฟรีไม่ลงทะเบียน | FR-01.6, FR-03.2 | ผู้ใช้ A มีอยู่แล้ว; คอร์สฟรี (draft) กับคอร์สไม่ฟรี (draft) มีบท published 1–2 บท | 1. เผยแพร่ทั้งสองคอร์ส<br>2. ตรวจ `enrollments` และ `lesson_progress` ของ A | A ลงทะเบียนคอร์สฟรี (`source = free`) และมีแถว unlocked เฉพาะบท sort_order ต่ำสุด; ไม่มี enrollment คอร์สไม่ฟรี | High | Positive | State Transition | Automated | `006` (`test_publish_free_course_enrolls_existing_user`, `test_publish_free_course_unlocks_first_lesson`, `test_publish_paid_course_does_not_enroll`) |

---

## 4. FR-04 แบบทดสอบ (TC-QZ)

### 4.1 Decision Table: การปลดล็อก (สเปก 6.2)
เงื่อนไข: ผล (ผ่าน ≥ `pass_score` / ไม่ผ่าน) × ตำแหน่งบท (มีบทถัดไป / บทสุดท้าย) × ครั้งที่สอบ (ครั้งแรก / สอบซ้ำ) = 8 กรณี

| # | ผล | ตำแหน่ง | ครั้งที่ | ผลที่คาดหวัง | TC | อัตโนมัติ |
|---|---|---|---|---|---|---|
| 1 | ผ่าน | มีบทถัดไป | ครั้งแรก | บทนี้ completed, ปลดล็อกบทถัดไป, `next_lesson_slug` ถูกต้อง | TC-QZ-02, TC-QZ-05 | `004` |
| 2 | ผ่าน | มีบทถัดไป | สอบซ้ำ | ไม่ error, ไม่เกิดแถวซ้ำ, ไม่ลดสถานะ | TC-QZ-06 | `004` |
| 3 | ผ่าน | บทสุดท้าย | ครั้งแรก | completed, `next_lesson_slug` = null | TC-QZ-07 | `004` |
| 4 | ผ่าน | บทสุดท้าย | สอบซ้ำ | ไม่ error, ยัง completed, `next_lesson_slug` = null | TC-QZ-08 | ยังไม่ automate |
| 5 | ไม่ผ่าน | มีบทถัดไป | ครั้งแรก | ไม่ completed, ไม่ปลดล็อกบทถัดไป | TC-QZ-01 | `004` + e2e |
| 6 | ไม่ผ่าน | มีบทถัดไป | สอบซ้ำ (หลังเคยผ่าน) | คะแนนสูงสุดและ completed คงเดิม | TC-QZ-09 | `004` |
| 7 | ไม่ผ่าน | บทสุดท้าย | ครั้งแรก | ไม่ completed, `next_lesson_slug` = null | TC-QZ-10 | `004` |
| 8 | ไม่ผ่าน | บทสุดท้าย | สอบซ้ำ | บันทึก attempt เพิ่ม ไม่เปลี่ยนสถานะ | TC-QZ-11 | ยังไม่ automate |

### 4.2 Test Cases

| รหัส | ชื่อ | อ้างอิง | เงื่อนไขก่อนเริ่ม | ขั้นตอน | ผลที่คาดหวัง | ความสำคัญ | ประเภท | เทคนิค | M/A | ไฟล์เทสต์อัตโนมัติ |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-QZ-01 | คะแนน 40% ไม่ปลดล็อกบทถัดไป | FR-03.3, FR-04.3 | บท 1 มี 5 ข้อ `pass_score` 60; บท 2 ล็อก; ผู้เรียนตอบถูก 2 ข้อ | 1. เรียก `submit_quiz(บท 1, คำตอบถูก 2/5)`<br>2. ตรวจ `lesson_progress` บท 2 | `score_pct` = 40, `passed` = false; บท 2 ไม่มีแถว (ล็อก) | High | Negative | Decision Table (ไม่ผ่าน/มีถัดไป/ครั้งแรก) | Automated | `e2e/api/submit-quiz.spec.ts`; `004` (`test_fail_does_not_unlock`, `test_fail_does_not_unlock_next`) |
| TC-QZ-02 | คะแนน 60% ที่ `pass_score` 60 ปลดล็อกบทถัดไป | FR-03.3, FR-04.4 | เหมือน TC-QZ-01; ตอบถูก 3/5 | 1. เรียก `submit_quiz(บท 1, ถูก 3/5)`<br>2. ตรวจสถานะบท 1 และบท 2 | `score_pct` = 60, `passed` = true; บท 1 completed; บท 2 unlocked | High | Boundary | BVA (ค่าขอบ = pass_score), Decision Table | Automated | `e2e/api/submit-quiz.spec.ts`; `004` (`test_exact_pass_score_passes`, `test_exact_pass_score_completes`) |
| TC-QZ-03 | ผลลัพธ์มีเฉลยและคำอธิบายครบทุกข้อ | FR-04.4, FR-04.3 | ผู้เรียนบท 1 เรียนได้; 5 ข้อ ทุกข้อมีเฉลยและคำอธิบาย | 1. เรียก `submit_quiz` ด้วยคำตอบครบ<br>2. อ่าน `results` | `results` มี 5 รายการ แต่ละรายการมี `correct_choice_id`, `explanation`, `is_correct`; มี `score_pct`, `passed` | High | Positive | Equivalence Partitioning | Automated | `e2e/api/submit-quiz.spec.ts`; `004` (`test_results_count`, `test_results_include_explanation_and_key`) |
| TC-QZ-04 | คำตอบที่ถูกดัดแปลงถูกปฏิเสธ | FR-04.2, FR-04.3, NFR-01 | ผู้เรียนบท 1 เรียนได้ | 1. ส่งคำตอบขาดไป 1 ข้อ<br>2. ส่งคำตอบข้อเดียวซ้ำสองครั้ง<br>3. ส่งตัวเลือกที่เป็นของคำถามอื่น | ทุกกรณีได้ error `INVALID_ANSWERS`; ไม่มี `quiz_attempts` เพิ่ม | High | Negative | Error guessing, Equivalence Partitioning | Automated | `e2e/api/submit-quiz.spec.ts`; `004` (`test_invalid_answers_missing_question`, `test_invalid_answers_duplicate_question`, `test_invalid_answers_foreign_choice`) |
| TC-QZ-05 | สอบผ่านครั้งแรก (มีบทถัดไป): ปลดล็อกและระบุบทถัดไป | FR-03.3, FR-04.4 | บท 1 → บท 3 (บท 2 draft คั่น) | 1. ตอบถูกทั้งหมด 5/5 | `passed` = true; บท 1 completed; บทถัดไปที่ published ถูกปลดล็อก; `next_lesson_slug` ถูกต้อง | High | Positive | Decision Table (กรณี 1) | Automated | `004` (`test_next_lesson_skips_draft`, `test_next_lesson_unlocked`) |
| TC-QZ-06 | สอบผ่านซ้ำหลังจบบทแล้ว (ส่งซ้ำ/สอบซ้ำ) ไม่ error ไม่เกิดแถวซ้ำ | FR-04.5, FR-04.6 | บท 1 completed แล้ว | 1. ส่งคำตอบผ่านซ้ำอีก 2 ครั้ง<br>2. นับแถว `lesson_progress` ของบทถัดไป | ไม่ error; แถวของบทถัดไปมี 1 แถว; ไม่ลดสถานะ completed | High | Boundary | Decision Table (กรณี 2) | Automated | `004` (`test_repeat_pass_is_idempotent`, `test_repeat_pass_no_duplicate_progress`) |
| TC-QZ-07 | สอบผ่านครั้งแรกที่บทสุดท้าย: ไม่มีบทถัดไป | FR-04.4 | ผู้เรียนมีสิทธิ์สอบบทสุดท้ายของคอร์ส | 1. ตอบถูกทั้งหมด | `passed` = true; completed; `next_lesson_slug` = null (หน้าเว็บจะแสดง "จบคอร์สแล้ว") | High | Positive | Decision Table (กรณี 3) | Automated | `004` (`test_last_lesson_has_no_next`) |
| TC-QZ-08 | สอบผ่านซ้ำที่บทสุดท้าย | FR-04.5 | บทสุดท้าย completed แล้ว | 1. ส่งคำตอบผ่านอีกครั้ง | ไม่ error; ยัง completed; `next_lesson_slug` = null; มี attempt เพิ่ม | Medium | Boundary | Decision Table (กรณี 4) | Manual | ยังไม่ automate (ช่องว่างใน `004` — เสนอเพิ่มเคส pgTAP) |
| TC-QZ-09 | สอบซ้ำได้คะแนนต่ำลง คะแนนสูงสุดและสถานะจบคงเดิม | FR-04.5 | บท 1 completed ด้วย best_score 100 | 1. ส่งคำตอบถูก 1/5 (20%)<br>2. ตรวจ `best_score` และ `status` | attempt ใหม่ถูกบันทึก; `best_score` ยัง 100; `status` ยัง completed | High | Boundary | Decision Table (กรณี 6) | Automated | `004` (`test_best_score_kept_on_lower_retake`, `test_completed_not_downgraded`) |
| TC-QZ-10 | สอบไม่ผ่านครั้งแรกที่บทสุดท้าย | FR-04.4 | คอร์สที่บทนั้นเป็นบทเดียว/สุดท้าย | 1. ตอบถูก 0/3 | `passed` = false; `next_lesson_slug` = null; ไม่ completed | Medium | Negative | Decision Table (กรณี 7) | Automated | `004` (`test_failed_attempt_has_null_next`) |
| TC-QZ-11 | สอบไม่ผ่านซ้ำที่บทสุดท้าย | FR-04.5 | บทสุดท้ายสอบไม่ผ่านมาแล้ว 1 ครั้ง | 1. ส่งคำตอบไม่ผ่านอีกครั้ง | บันทึก attempt เพิ่ม; ไม่ completed; `next_lesson_slug` = null | Low | Negative | Decision Table (กรณี 8) | Manual | ยังไม่ automate (ช่องว่างใน `004`) |
| TC-QZ-12 | คะแนน 60% ที่ `pass_score` 61 ไม่ผ่าน (ต่ำกว่าเกณฑ์ 1) | FR-03.3 | บทตั้ง `pass_score` = 61, มี 5 ข้อ | 1. ตอบถูก 3/5 (60%) | `passed` = false; ไม่ปลดล็อกบทถัดไป | High | Boundary | BVA (ขอบล่าง −1) | Automated | `004` (`test_below_pass_score_by_one_fails`) |
| TC-QZ-13 | คะแนน 59% ที่ `pass_score` 60 ไม่ผ่าน | FR-03.3 | บท `pass_score` 60 มี 17 ข้อ (ตอบถูก 10 ข้อ = 58.8% → 59%) | 1. ตอบถูก 10/17 | `score_pct` = 59, `passed` = false | Medium | Boundary | BVA (ค่า 59/60 ตามสเปก 6.2) | Manual | ยังไม่ automate (ต้องใช้บทที่มี 17 ข้อ; TC-QZ-12 ครอบคลุมขอบ −1 ด้วยข้อมูลที่มีใน `004` แล้ว) |
| TC-QZ-14 | การปัดคะแนน 2/3 เป็น 67 | FR-04.3 | บท 3 ข้อ | 1. ตอบถูก 2/3 | `score_pct` = 67 | Medium | Boundary | BVA/Equivalence | Automated | `004` (`test_rounding_two_of_three`) |
| TC-QZ-15 | การปัดแบบ half-up: 1/8 = 12.5 → 13 | FR-04.3 | บท 8 ข้อ | 1. ตอบถูก 1/8 | `score_pct` = 13 (ไม่ใช่ 12) | Low | Boundary | BVA | Manual | ยังไม่ automate (ช่องว่างใน `004`) |
| TC-QZ-16 | เก็บประวัติการสอบทุกครั้ง | FR-04.5 | ผู้เรียนส่งแบบทดสอบบท 1 หลายครั้ง | 1. ส่ง 6 ครั้ง<br>2. นับ `quiz_attempts` ของบทนั้น | มี 6 แถว ทุกครั้งมี `score_pct` และ `passed` | High | Positive | Equivalence Partitioning | Automated | `004` (`test_every_attempt_recorded`) |
| TC-QZ-17 | ฝั่งเซิร์ฟเวอร์บังคับให้ตอบครบทุกข้อ | FR-04.2 | บท 5 ข้อ | 1. เรียก `submit_quiz` ด้วยคำตอบ 4 ข้อ | error `INVALID_ANSWERS` | High | Negative | Error guessing | Automated | `004` (`test_invalid_answers_missing_question`); ดู TC-QZ-04 |
| TC-QZ-18 | ตอบได้เพียง 1 ตัวเลือกต่อข้อ (ปรนัยเลือกเดียว) | FR-04.1 | บท 5 ข้อ | 1. ส่งสองคำตอบให้ข้อเดียวกัน (ฝั่ง API)<br>2. ใน UI คลิกตัวเลือกอื่นของข้อเดียวกัน | 1 `INVALID_ANSWERS`<br>2 ตัวเลือกก่อนหน้าถูกยกเลิก เหลือเลือกได้ 1 | High | Negative | Equivalence Partitioning | Automated (API) / Manual (UI) | API: `004` (`test_invalid_answers_duplicate_question`); UI: ยังไม่มี (แผนที่ 2) |
| TC-QZ-19 | ปุ่มส่งต้องรอตอบครบ และชี้ข้อที่ยังไม่ตอบ | FR-04.2 | หน้า `/lessons/[slug]/quiz` บท 5 ข้อ | 1. ตอบ 3 ข้อแล้วพยายามส่ง | ไม่ส่งคำขอไปเซิร์ฟเวอร์; ข้อที่ 4–5 ถูกไฮไลต์พร้อมข้อความภาษาไทย | High | Negative | Equivalence Partitioning | Automated (แผนที่ 2) | ยังไม่มี — ยังไม่ automate; จะเขียนเป็น E2E ในแผนที่ 2 |
| TC-QZ-20 | ผู้เรียนไม่เห็นเฉลยก่อนส่ง | FR-04.3 | ผู้เรียนเปิดแบบทดสอบบท 1 | 1. ตรวจข้อมูลที่ส่งมากับหน้าและ response ของ `quiz_questions`/`quiz_choices`<br>2. อ่าน `quiz_answer_keys` | ไม่มีข้อมูลบ่งบอกตัวเลือกที่ถูกหรือคำอธิบาย; `quiz_answer_keys` ว่าง | High | Security | Role-based | Automated (ฝั่ง DB) / Manual (ตรวจ network ใน UI) | ฝั่ง DB: ดู TC-SEC-01, TC-SEC-12; UI: ยังไม่ automate |
| TC-QZ-21 | หน้าผลลัพธ์แสดงคะแนน ผ่าน/ไม่ผ่าน เฉลยรายข้อ และปุ่มที่ถูกต้อง | FR-04.4 | ผู้เรียนส่งแบบทดสอบแล้ว | 1. สอบผ่านบทที่มีบทถัดไป<br>2. สอบผ่านบทสุดท้าย<br>3. สอบไม่ผ่าน | 1 ปุ่ม "ไปบทถัดไป"<br>2 ปุ่ม "จบคอร์สแล้ว"<br>3 ปุ่ม "ทบทวนบทเรียน" และ "สอบใหม่"; ทุกกรณีแสดงคะแนน (%) เฉลยและคำอธิบายรายข้อ | High | Positive | Decision Table | Automated (แผนที่ 2) | ยังไม่มี — ยังไม่ automate (ข้อมูลระดับ DB ดู TC-QZ-03, TC-QZ-07) |
| TC-QZ-22 | กดส่งซ้ำระหว่างรอผลไม่ได้ | FR-04.6 | หน้าแบบทดสอบตอบครบ; หน่วงเครือข่าย | 1. กดส่ง<br>2. กดส่งอีกทันทีขณะรอผล | ปุ่มส่งถูกปิดระหว่างรอ; มี attempt เพียง 1 แถว (ระดับ DB: ส่งซ้ำไม่ทำให้ข้อมูลผิด ดู TC-QZ-06) | High | Negative | Error guessing | Automated (แผนที่ 2) | ยังไม่มี — ยังไม่ automate |
| TC-QZ-23 | เครือข่ายล้มเหลวแล้วส่งอีกครั้งโดยคำตอบไม่หาย | FR-04.6 | หน้าแบบทดสอบตอบครบ | 1. ตัดเครือข่าย (offline) แล้วกดส่ง<br>2. เปิดเครือข่าย กด "ส่งอีกครั้ง" | แสดงข้อความผิดพลาดภาษาไทย คำตอบที่เลือกยังอยู่; ส่งใหม่สำเร็จและได้ผลปกติ | High | Negative | Error guessing | Automated (แผนที่ 2) | ยังไม่มี — ยังไม่ automate (ทดลองด้วย Playwright `context.setOffline`) |
| TC-QZ-24 | บทที่ข้อมูลไม่สมบูรณ์ถูกปฏิเสธด้วย `LESSON_INCOMPLETE` | FR-04.3, NFR-01 | ผู้เรียนบทที่ปลดล็อกแล้ว; (ก) ลบแถว `quiz_answer_keys` ของข้อหนึ่ง (ข) ลบคำถามทั้งหมดของบท | 1. เรียก `submit_quiz` ของแต่ละบท | error `LESSON_INCOMPLETE` ทั้งสองกรณี ไม่มี attempt ถูกบันทึก | High | Negative | Error Guessing | Automated | `006` (`test_missing_answer_key_lesson_incomplete`, `test_zero_question_lesson_incomplete`) |

---

## 5. FR-05 และ FR-07 (ระดับ DB)

| รหัส | ชื่อ | อ้างอิง | เงื่อนไขก่อนเริ่ม | ขั้นตอน | ผลที่คาดหวัง | ความสำคัญ | ประเภท | เทคนิค | M/A | ไฟล์เทสต์อัตโนมัติ |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-PRC-01 | วันที่ฝึกเป็นวันนี้ (เวลา Bangkok) ได้ วันพรุ่งนี้ไม่ได้ | FR-05.2 | ผู้เรียน A; timezone ของ session ตั้งให้ช้ากว่า Bangkok | 1. บันทึกการฝึกด้วย `practiced_on` = วันนี้ตามเวลา Bangkok<br>2. บันทึกด้วยวันพรุ่งนี้<br>3. เรียก `bangkok_date` ที่ขอบเที่ยงคืน (UTC 16:59 และ 17:30) | ข้อ 1 สำเร็จ; ข้อ 2 error `FUTURE_DATE`; `bangkok_date` ให้วันเดิม/วันถัดไปตามลำดับ | High | Boundary | BVA | Automated (ระดับ DB; UI รอแผนที่ 2) | `003` (`test_practice_date_today_ok`, `test_practice_date_tomorrow_rejected`); `006` (`test_bangkok_date_*`, `test_practice_trigger_uses_bangkok_date`) |
| TC-ADM-01 | เผยแพร่บทที่ไม่สมบูรณ์ไม่ได้ | FR-07.5 | บท draft ที่ (ก) ไม่มีคำถาม (ข) มีคำถามไม่มีข้อถูก (ค) มีคำถามที่มีตัวเลือกเดียว | 1. เปลี่ยนสถานะเป็น published | error `LESSON_INCOMPLETE` ทุกกรณี; บทที่ครบเผยแพร่ได้ | High | Negative | Decision Table | Automated (ระดับ DB; UI รอแผนที่ 3) | `005` (`test_cannot_publish_without_questions`, `test_cannot_publish_question_without_key`, `test_cannot_publish_question_with_one_choice`, `test_complete_draft_publishes`) |
| TC-ADM-02 | ลบบทที่มีผู้เรียนเคยเรียนไม่ได้ | FR-07.6 | บทที่มีแถว `lesson_progress` หรือ `quiz_attempts`; อีกบทที่ไม่มีข้อมูลผู้เรียน | 1. ลบแต่ละบท | บทแรก error `LESSON_HAS_LEARNERS` (ให้เปลี่ยนเป็น draft แทน); บทหลังลบได้ | High | Negative | Equivalence Partitioning | Automated (ระดับ DB; UI รอแผนที่ 3) | `005` (`test_cannot_delete_lesson_with_learners`, `test_can_delete_untouched_lesson`) |

---

## 6. สรุปจำนวน TC (ชุดแรก)

| พื้นที่ | จำนวน TC | Automated แล้ว (pgTAP และ/หรือ e2e ที่ตั้งชื่อไว้) | ยังไม่ automate / รอแผนที่ 2–3 |
|---|---|---|---|
| TC-SEC (NFR-01) | 17 | 14 (SEC-01–14) | 3 (SEC-15, 16, 17) |
| TC-PATH (FR-03) | 14 | 12 (PATH-02–07, 09–14) | 2 (PATH-01, 08) |
| TC-QZ (FR-04) | 24 | 16 (QZ-01–07, 09, 10, 12, 14, 16, 17, 24 และ QZ-18, QZ-20 เฉพาะระดับ API/DB) | 8 (QZ-08, 11, 13, 15, 19, 21, 22, 23) |
| TC-PRC (FR-05, ระดับ DB) | 1 | 1 (PRC-01) | 0 |
| TC-ADM (FR-07, ระดับ DB) | 2 | 2 (ADM-01, 02) | 0 |
| รวม | 58 | — | — |

หมายเหตุ: "Automated แล้ว" รวมเทสต์ pgTAP ที่มีอยู่ใน `supabase/tests/` และเทสต์ Playwright ใน `e2e/api/` ที่ตั้งชื่อตามรหัส TC-SEC-01…07 และ TC-QZ-01…04; TC-QZ-18 และ TC-QZ-20 เป็น Automated เฉพาะส่วน API/DB ส่วน UI ยังเป็น Manual
