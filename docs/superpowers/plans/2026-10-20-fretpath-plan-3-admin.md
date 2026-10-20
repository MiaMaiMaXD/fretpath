# FretPath แผนที่ 3: หลังบ้านแอดมิน (FR-07) และฟีเจอร์ที่เหลือ

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** แอดมินสร้าง แก้ไข เผยแพร่ เรียงลำดับ และลบบทเรียนกับคำถามได้ครบ FR-07 พร้อมดูรายชื่อผู้เรียน; ปิดงานที่ค้างจากแผนที่ 1–2 (กันการแก้บทที่เผยแพร่จนไม่สมบูรณ์, ลิงก์อีเมลข้ามอุปกรณ์, รูปโปรไฟล์, เมโทรนอม, Google login แบบเปิดด้วย config, security headers) และเส้นทางหลักที่ 3 ของสเปก 6.3 ผ่าน E2E

**Architecture:** ตรรกะสิทธิ์และความถูกต้องของเนื้อหายังอยู่ใน Postgres (migration ใหม่ `0007`–`0009`): RLS แอดมินมีอยู่แล้วจากแผนที่ 1 (R13), เพิ่มฟังก์ชัน `lesson_publish_problems`, `reorder_lessons`, constraint trigger กันบทที่เผยแพร่แล้วไม่สมบูรณ์ และ Storage bucket; หน้าแอดมินเป็น route group `app/(admin)` ที่ตรวจ `is_admin()` ทั้งใน `proxy.ts` และฝั่งเซิร์ฟเวอร์; Server Actions ใช้ `createClient()` (สิทธิ์แอดมินมาจาก RLS ไม่ใช่ service role)

**Tech Stack:** Next.js 16 + React 19 + Tailwind 4, Supabase (Postgres, Auth, Storage), pgTAP, Vitest, Playwright

**Spec:** `docs/superpowers/specs/2026-10-19-fretpath-design.md` (รวมหัวข้อ 9)

**ต่อยอดจาก:** แผนที่ 1 (`…plan-1-foundation.md`) และแผนที่ 2 (`…plan-2-learner-web.md`) ที่ merge แล้ว — `ActionState`/`Field`/`useKeepValuesSubmit`/`SubmitButton`/`FormMessage`, `thaiError`/`errorCodeFrom`, `LessonMarkdown`, `YouTubeEmbed`, `getPath`, Page Objects และ fixtures (`admin`, `adminDb`, `memberPage`, `MEMBER_STATE`), Mailpit helper

**ผู้รับผิดชอบ:** `[Dev]`, `[QA]` หรือ `[Dev → QA]` (Dev ทำ Step ไม่มีป้าย, QA ทำ Step ที่มี `(QA)`)

**แผนที่ 4 (ถัดไป, ไม่อยู่ในแผนนี้):** deploy Vercel + Supabase production, ตั้ง Auth/SMTP/email templates บน production, เปิด Google OAuth จริง, keep-alive, backup, nightly, Lighthouse (NFR-07), Test Summary Report — ทุกขั้นที่ต้องใช้บัญชีภายนอกของทีม

## Global Constraints

- ค่าใช้จ่าย 0 บาท; ล็อกเวอร์ชันใน `package-lock.json`; Node.js 22; TypeScript `strict: true`
- โครงสร้างฐานข้อมูลเปลี่ยนผ่านไฟล์ใหม่ใน `supabase/migrations/` เท่านั้น (ห้ามแก้ `0001`–`0006` ที่ merge แล้ว)
- ห้ามใช้ `SUPABASE_SERVICE_ROLE_KEY` นอก `e2e/`; Server Actions ใช้ `createClient()` เท่านั้น
- ข้อความที่ผู้ใช้เห็นเป็นภาษาไทย รวม error; รหัส error DB เป็นอังกฤษตัวพิมพ์ใหญ่และแปลผ่าน `thaiError()`
- รหัส error ใหม่: `LESSON_PUBLISHED_INCOMPLETE`, `NOT_ADMIN` (มีแล้ว), `LAST_ADMIN`, `USER_NOT_FOUND`, `INVALID_ORDER`
- ค่าจากสเปก: `pass_score` 1–100 ค่าเริ่มต้น 60; ตัวเลือก 2–6 ข้อต่อคำถาม; `video_url` ต้องเป็นลิงก์ YouTube; ลำดับบทไม่ซ้ำในคอร์ส
- ฟอร์มทุกฟอร์มใช้รูปแบบเดิมของแผนที่ 2 (`useKeepValuesSubmit` + `ActionState.values`) ค่าไม่หายเมื่อส่งไม่ผ่าน
- ใช้งานได้ที่ 375px; ตัวระบุ element ในเทสต์ใช้ `getByRole`/`getByLabel`; ชื่อเทสต์ขึ้นต้นด้วยรหัส TC; ป้าย `@smoke` / `@regression` / `@security`
- รหัส TC ใหม่ของแผนนี้: `TC-ADM-03` ขึ้นไป (`TC-ADM-01/02` มีแล้ว), `TC-SEC-19` ขึ้นไป, `TC-AUTH-11` ขึ้นไป, `TC-PRC-09` ขึ้นไป, `TC-PATH-20` ขึ้นไป — ตรวจ `docs/qa/test-cases.md` ก่อนใช้เลขทุกครั้ง

## Review Focus

1. **ผู้เรียนเปิด `/admin` หรือเรียก Server Action ของแอดมินตรง ๆ:** ต้องถูกพาออก/ปฏิเสธทั้งที่ proxy, หน้า และฐานข้อมูล (ไม่พึ่งการซ่อนปุ่ม) → Task 2 `TC-SEC-19`, Task 4 `TC-SEC-20`
2. **แก้บทที่เผยแพร่แล้วจนไม่สมบูรณ์:** ลบตัวเลือกจนเหลือ 1, ลบเฉลย หรือลบคำถามสุดท้ายของบทที่เผยแพร่ ต้องถูกปฏิเสธด้วย `LESSON_PUBLISHED_INCOMPLETE` โดยไม่เสียข้อมูลอื่นใน transaction → Task 1 `test_published_lesson_stays_complete`
3. **สลับลำดับบท:** การสลับ 2 บทหรือย้ายบทไปบนสุดต้องสำเร็จในคำสั่งเดียว ไม่ชน unique และบทที่ย้ายขึ้นเป็นบทแรกต้องปลดล็อกให้ผู้ลงทะเบียนทุกคน (FR-03.2) → Task 1 `test_reorder_swaps_and_unlocks_new_first`
4. **แอดมินคนสุดท้ายลดสิทธิ์ตัวเอง:** ต้องถูกปฏิเสธด้วย `LAST_ADMIN`; ตั้ง role ให้ผู้ใช้ที่ไม่มีอยู่ได้ `USER_NOT_FOUND` → Task 1 `test_last_admin_cannot_demote`
5. **เปิดลิงก์ยืนยันอีเมล/รีเซ็ตรหัสบนอีกเครื่อง:** ต้องทำงานได้ (token_hash + `verifyOtp`) ไม่พึ่ง cookie ของเครื่องที่ขอ → Task 9 `TC-AUTH-11`

---

## โครงสร้างไฟล์

```
supabase/migrations/
  20261021000007_admin_rules.sql      lesson_publish_problems, reorder_lessons, constraint trigger, set_user_role guards, course-draft visibility
  20261021000008_storage.sql          buckets lesson-images, avatars + policies
  20261021000009_admin_save_question.sql
  20261021000010_oauth_display_name.sql
supabase/templates/                   confirmation.html, recovery.html (token_hash) — ใช้ใน config.toml
supabase/tests/007_admin_rules.test.sql, 008_storage.test.sql
lib/admin/*.ts                        ล้วน: ตรวจฟอร์มบท/คำถาม, แปลงปัญหาการเผยแพร่เป็นข้อความไทย
lib/data/admin.ts                     อ่านข้อมูลฝั่งแอดมิน
app/(admin)/layout.tsx                แถบนำทางแอดมิน + guard
app/(admin)/admin/page.tsx, lessons/page.tsx, lessons/new/page.tsx, lessons/[id]/page.tsx, lessons/[id]/preview/page.tsx, learners/page.tsx
app/(admin)/admin/lessons/actions.ts, lessons/[id]/questions/actions.ts
app/auth/confirm/route.ts             verifyOtp(token_hash)
components/admin/*                    LessonForm, QuestionEditor, ChoiceList, PublishPanel, ReorderList, ImageUpload
components/{Metronome,AvatarUpload}.tsx
next.config.ts                        security headers + CSP
e2e/pages/admin/*.ts, e2e/specs/admin*.spec.ts
```

---

### Task 1: [Dev] กติกาฐานข้อมูลฝั่งแอดมิน

**Files:**
- Create: `supabase/migrations/20261021000007_admin_rules.sql`, `supabase/tests/007_admin_rules.test.sql`
- Modify: `lib/errors.ts` (+ รหัสใหม่), `tests/unit/errors.test.ts`, `lib/database.types.ts` (`npm run db:types`)

**Interfaces:**
- Produces (ทั้งหมด `security definer`, `set search_path = ''`, grant execute เฉพาะ `authenticated`, ตรวจ `is_admin()` ก่อน ไม่ใช่แอดมิน raise `NOT_ADMIN`):
  - `public.lesson_publish_problems(p_lesson uuid) returns text[]` — คืนรายการรหัสปัญหา: `NO_QUESTIONS`, `QUESTION_NO_KEY:<question_id>`, `QUESTION_CHOICE_COUNT:<question_id>`; ว่าง = เผยแพร่ได้ (ตรรกะเดียวกับ `validate_lesson_publish` — ให้ทริกเกอร์เดิมเรียกฟังก์ชันนี้ผ่าน `create or replace` เพื่อไม่ให้ตรรกะซ้ำ)
  - `public.reorder_lessons(p_course uuid, p_lesson_ids uuid[]) returns void` — `p_lesson_ids` ต้องเป็นบททั้งหมดของคอร์สนั้นพอดี ไม่ซ้ำ ไม่เช่นนั้น raise `INVALID_ORDER`; ตั้ง `sort_order` = ตำแหน่ง (1..n) ภายใต้ `set constraints … deferred`; จากนั้นปลดล็อกบท published ที่ `sort_order` ต่ำสุดให้ผู้ลงทะเบียนทุกคน (`on conflict do nothing`); ไม่ลบการปลดล็อกเดิม
  - constraint trigger `ensure_published_lesson_complete` (`deferrable initially deferred`, after insert/update/delete บน `quiz_questions`, `quiz_choices`, `quiz_answer_keys`): ถ้าบทที่เกี่ยวข้องเป็น published และ `lesson_publish_problems` ไม่ว่าง raise `LESSON_PUBLISHED_INCOMPLETE`
  - `set_user_role` (create or replace): ผู้ใช้ไม่มีอยู่ → `USER_NOT_FOUND`; ลดสิทธิ์แอดมินคนสุดท้าย → `LAST_ADMIN`
  - RLS: `lessons_member_read`, `is_lesson_unlocked` ต้องให้คอร์สเป็น published ด้วย (คอร์สถูกเปลี่ยนเป็นฉบับร่าง → ผู้เรียนไม่เห็นบทและเนื้อหา)
- `thaiError` เพิ่ม: `LESSON_PUBLISHED_INCOMPLETE` "บทนี้เผยแพร่อยู่ การแก้ไขนี้จะทำให้บทไม่สมบูรณ์ — เปลี่ยนเป็นฉบับร่างก่อนแก้"; `LAST_ADMIN` "ต้องมีผู้ดูแลระบบอย่างน้อย 1 คน"; `USER_NOT_FOUND` "ไม่พบผู้ใช้นี้"; `INVALID_ORDER` "ลำดับบทไม่ถูกต้อง กรุณาโหลดหน้าใหม่"

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลว** `007_admin_rules.test.sql`

```sql
-- test_publish_problems_lists_each_gap
select is(lesson_publish_problems(:'empty_draft'), array['NO_QUESTIONS']);
select ok('QUESTION_NO_KEY:' || :'q_nokey' = any(lesson_publish_problems(:'draft_missing_key')));
select is(lesson_publish_problems(:'draft_ok'), '{}'::text[]);
-- test_member_cannot_call_admin_functions
select throws_ok(format('select lesson_publish_problems(%L)', :'draft_ok'), 'P0001', 'NOT_ADMIN');  -- as member
-- test_published_lesson_stays_complete (Review Focus 2)
select throws_ok(format('delete from quiz_choices where question_id = %L and id <> %L', :'pq1', :'pq1_key_choice'), 'P0001', 'LESSON_PUBLISHED_INCOMPLETE'); -- เหลือ 1 ตัวเลือก (ทดสอบผ่าน set constraints all immediate)
select throws_ok(format('delete from quiz_answer_keys where question_id = %L', :'pq1'), 'P0001', 'LESSON_PUBLISHED_INCOMPLETE');
select lives_ok(format('update quiz_questions set prompt = %L where id = %L', 'แก้คำผิด', :'pq1'));
select lives_ok(format('update lessons set status = %L where id = %L', 'draft', :'published_lesson')); -- เป็นฉบับร่างแล้วแก้ได้
-- test_reorder_swaps_and_unlocks_new_first (Review Focus 3)
select lives_ok(format('select reorder_lessons(%L, array[%L, %L]::uuid[])', :'c2', :'c2_l2', :'c2_l1'));
select is((select sort_order from lessons where id = :'c2_l2'), 1);
select isnt_empty(format('select 1 from lesson_progress where user_id = %L and lesson_id = %L', :'enrolled_user', :'c2_l2'));
select throws_ok(format('select reorder_lessons(%L, array[%L]::uuid[])', :'c2', :'c2_l1'), 'P0001', 'INVALID_ORDER');  -- ขาดบท
-- test_last_admin_cannot_demote (Review Focus 4)
select throws_ok(format('select set_user_role(%L, %L)', :'only_admin', 'member'), 'P0001', 'LAST_ADMIN');
select throws_ok(format('select set_user_role(%L, %L)', gen_random_uuid(), 'admin'), 'P0001', 'USER_NOT_FOUND');
-- test_draft_course_hides_lessons
select is_empty(format('select 1 from lessons where course_id = %L', :'draft_course'));  -- as enrolled member
```

(`seed` มีแอดมิน `admin@fretpath.test` อยู่แล้ว — ในเทสต์ `LAST_ADMIN` ให้ลด role แอดมินอื่นทั้งหมดเป็น member ภายใน transaction ก่อน)

- [ ] **Step 2:** รัน `npx supabase test db` — Expected: FAIL ที่ `007`
- [ ] **Step 3:** เขียน migration และรหัส error; `npm run db:types`
- [ ] **Step 4:** รัน `npx supabase db reset && npx supabase test db && npm run test:unit` — Expected: ผ่านทั้งหมด (001–007); seed ยังโหลดได้
- [ ] **Step 5:** Commit `feat(db): add admin content rules and safe reordering`

---

### Task 2: [Dev → QA] โครงหลังบ้านและการกันสิทธิ์ (FR-07.1)

**Files:**
- Create: `app/(admin)/layout.tsx`, `app/(admin)/admin/page.tsx`, `lib/data/admin.ts` (`requireAdmin`), `e2e/pages/admin/AdminLessonsPage.ts`, `e2e/specs/admin-access.spec.ts`
- Modify: `proxy.ts`, `e2e/fixtures/index.ts` (fixture `adminPage`), `app/(learner)/layout.tsx` (ลิงก์ "หลังบ้าน" เฉพาะแอดมิน)

**Interfaces:**
- Produces:
  - `requireAdmin(): Promise<{ userId: string }>` — ไม่ล็อกอิน → `redirect('/login?next=…')`; ไม่ใช่แอดมิน → `redirect('/dashboard')`; ใช้ `rpc('is_admin')`
  - `proxy.ts`: `/admin` และ `/admin/*` ไม่ล็อกอิน → `/login?next=`; ล็อกอินแต่ไม่ใช่แอดมิน → `/dashboard` (ตรวจด้วย `rpc('is_admin')`)
  - หน้า `/admin`: ภาพรวม จำนวนบท (เผยแพร่ / ฉบับร่าง) และจำนวนผู้เรียน; ลิงก์ "จัดการบทเรียน" (`/admin/lessons`), "ผู้เรียน" (`/admin/learners`)
  - fixture `adminPage: Page` — ผู้ใช้ `admin` ใหม่ ล็อกอินผ่าน UI แล้ว

- [ ] **Step 1 (QA):** `admin-access.spec.ts`

```ts
test('TC-SEC-19 member opening /admin is sent to dashboard @security', …);   // storageState MEMBER_STATE → /admin → URL /dashboard
test('TC-SEC-21 anonymous opening /admin goes to login with next @security', …); // → /login?next=%2Fadmin
test('TC-ADM-03 admin sees overview and admin link @smoke', …);              // adminPage: "จัดการบทเรียน", จำนวนบท 5 เผยแพร่
```

- [ ] **Step 2:** รัน — Expected: FAIL
- [ ] **Step 3:** เขียนตาม Interfaces
- [ ] **Step 4:** รัน `npm run build && npx playwright test e2e/specs/admin-access.spec.ts --project=chromium` — Expected: ผ่าน
- [ ] **Step 5:** Commit `feat: add admin area guard and overview`

---

### Task 3: [Dev → QA] จัดการบทเรียน: รายการ, สร้าง, แก้ไข, เผยแพร่, ลบ (FR-07.2, 07.4–07.6)

**Files:**
- Create: `lib/admin/lesson-form.ts`, `tests/unit/lesson-form.test.ts`, `app/(admin)/admin/lessons/{page.tsx,actions.ts}`, `app/(admin)/admin/lessons/new/page.tsx`, `app/(admin)/admin/lessons/[id]/page.tsx`, `components/admin/{LessonForm,PublishPanel}.tsx`, `e2e/pages/admin/AdminLessonEditPage.ts`, `e2e/specs/admin-lessons.spec.ts`

**Interfaces:**
- Consumes: Task 1 (`lesson_publish_problems`, error codes), Task 2 (`requireAdmin`, `adminPage`)
- Produces:
  - `validateLessonInput(input: { title: string; slug: string; summary: string; contentMd: string; videoUrl: string; passScore: string }): FieldErrors` — title 1–120, slug `^[a-z0-9]+(-[a-z0-9]+)*$` ≤ 80, summary ≤ 300, passScore จำนวนเต็ม 1–100, videoUrl ว่างได้หรือผ่าน `youtubeEmbedUrl` (ข้อความ: "กรุณาใส่ชื่อบท 1–120 ตัวอักษร", "slug ใช้ได้เฉพาะ a-z 0-9 และขีดกลาง", "สรุปต้องไม่เกิน 300 ตัวอักษร", "เกณฑ์ผ่านต้องเป็นจำนวนเต็ม 1–100", "ต้องเป็นลิงก์ YouTube")
  - `publishProblemsThai(codes: string[], questionLabel: (id: string) => string): string[]` — `NO_QUESTIONS` → "ยังไม่มีคำถาม"; `QUESTION_NO_KEY:<id>` → "<ข้อ N> ยังไม่กำหนดข้อที่ถูก"; `QUESTION_CHOICE_COUNT:<id>` → "<ข้อ N> ต้องมีตัวเลือก 2–6 ข้อ"
  - Server Actions (`lessons/actions.ts`): `createLesson` (สร้างเป็น draft เสมอ + `lesson_contents`, `sort_order` = max+1; slug ซ้ำ (23505) → fieldError slug "slug นี้ถูกใช้แล้ว"), `updateLesson(id, …)`, `publishLesson(id)` (เรียก `lesson_publish_problems` ก่อน; มีปัญหา → คืน `{ ok:false, problems }`), `unpublishLesson(id)`, `deleteLesson(id)` (`LESSON_HAS_LEARNERS` → คืน `{ ok:false, code, offerDraft: true }`)
  - หน้า `/admin/lessons`: ตารางบทเรียงตาม `sort_order` (ลำดับ, ชื่อ, สถานะ "ฉบับร่าง"/"เผยแพร่", เกณฑ์ผ่าน, จำนวนคำถาม) + ปุ่ม "เพิ่มบทเรียน"
  - หน้า `/admin/lessons/[id]`: ฟอร์มป้าย "ชื่อบท", "slug", "สรุป", "เนื้อหา (Markdown)", "ลิงก์วิดีโอ YouTube", "เกณฑ์ผ่าน (%)" ปุ่ม "บันทึก"; `PublishPanel` ปุ่ม "เผยแพร่" / "เปลี่ยนเป็นฉบับร่าง", รายการปัญหาใน `role="alert"` หัวข้อ "ยังเผยแพร่ไม่ได้:"; ปุ่ม "ลบบทเรียน" ยืนยันด้วย `<dialog>` (โฟกัสแรกที่ "ยกเลิก"); ลบไม่ได้ → ข้อความ `thaiError('LESSON_HAS_LEARNERS')` + ปุ่ม "เปลี่ยนเป็นฉบับร่างแทน"

- [ ] **Step 1:** `lesson-form.test.ts` ครอบ boundary: passScore 0/1/100/101, slug `Bad Slug`/`ok-slug`, title 0/120/121 ตัว, videoUrl ว่าง/YouTube/vimeo; `publishProblemsThai` แปลงทั้งสามรหัส
- [ ] **Step 2 (QA):** `admin-lessons.spec.ts`

```ts
test('TC-ADM-04 create lesson starts as draft and members cannot see it @smoke', …);   // สร้าง "บททดสอบ QA <uuid>" → สถานะ "ฉบับร่าง"; memberDb select lessons by slug = []
test('TC-ADM-05 publishing an incomplete lesson lists what is missing', …);            // บทใหม่ไม่มีคำถาม → "ยังเผยแพร่ไม่ได้:" + "ยังไม่มีคำถาม"
test('TC-ADM-06 lesson with learners cannot be deleted and offers draft instead', …);   // บท 1 ของ seed (มีผู้เรียน) → ข้อความ LESSON_HAS_LEARNERS + "เปลี่ยนเป็นฉบับร่างแทน"; ห้ามกดจริงบนบท seed — ใช้บทที่สร้างเองแล้วให้ member สอบผ่าน rpc
test('TC-ADM-07 untouched draft can be deleted', …);
test('TC-ADM-08 lesson form validation keeps values', …);                             // เกณฑ์ผ่าน 101 → ข้อความ + ค่าที่พิมพ์ยังอยู่
```

(ทุกเทสต์สร้างคอร์ส/บทของตัวเองผ่าน `adminDb` แล้วลบใน `finally` — ห้ามแก้ข้อมูล seed ที่เทสต์อื่นใช้)

- [ ] **Step 3:** รัน — Expected: FAIL
- [ ] **Step 4:** เขียนตาม Interfaces
- [ ] **Step 5:** รัน unit + `npx playwright test e2e/specs/admin-lessons.spec.ts --project=chromium` — Expected: ผ่าน
- [ ] **Step 6:** Commit `feat: add admin lesson management`

---

### Task 4: [Dev → QA] จัดการคำถาม ตัวเลือก เฉลย และคำอธิบาย (FR-07.3, 07.5)

**Files:**
- Create: `supabase/migrations/20261021000009_admin_save_question.sql`, `supabase/tests/009_admin_save_question.test.sql`, `lib/admin/question-form.ts`, `tests/unit/question-form.test.ts`, `app/(admin)/admin/lessons/[id]/questions/actions.ts`, `components/admin/{QuestionEditor,ChoiceList}.tsx`, `e2e/specs/admin-questions.spec.ts`
- Modify: `app/(admin)/admin/lessons/[id]/page.tsx` (แสดงรายการคำถามใต้ฟอร์มบท)

**Interfaces:**
- Produces:
  - `validateQuestionInput(input: { prompt: string; choices: string[]; correctIndex: string; explanation: string }): FieldErrors` — prompt 1–500, ตัวเลือกไม่ว่าง 2–6 ข้อ แต่ละข้อ ≤ 200, correctIndex ชี้ตัวเลือกที่มีอยู่, explanation ≤ 1000 (ข้อความ: "กรุณาใส่คำถาม", "ต้องมีตัวเลือก 2–6 ข้อ", "กรุณาเลือกข้อที่ถูก", "คำอธิบายต้องไม่เกิน 1000 ตัวอักษร")
  - Server Actions: `saveQuestion(lessonId, questionId | null, prev, form)` — บันทึกคำถาม + แทนที่ตัวเลือกทั้งชุด + เฉลย + คำอธิบาย **ใน RPC เดียว** `public.admin_save_question(p_lesson uuid, p_question uuid, p_prompt text, p_choices text[], p_correct int, p_explanation text) returns uuid` (security definer, ตรวจ `is_admin()`; `p_question` null = สร้างใหม่) ใน migration ใหม่ `supabase/migrations/20261021000009_admin_save_question.sql` เพื่อให้ constraint trigger ตรวจตอน commit ครั้งเดียว; `deleteQuestion(questionId)`; `moveQuestion(questionId, 'up' | 'down')`
  - `LESSON_PUBLISHED_INCOMPLETE` แสดงเป็นข้อความไทยจาก Task 1 ข้างฟอร์ม
  - UI: แต่ละคำถามป้าย "คำถาม", "ตัวเลือก 1"…"ตัวเลือก N" (ปุ่ม "เพิ่มตัวเลือก" ซ่อนเมื่อครบ 6, "ลบตัวเลือก" ซ่อนเมื่อเหลือ 2), radio "ข้อที่ถูก", "คำอธิบาย"; ปุ่ม "บันทึกคำถาม", "ลบคำถาม", "เลื่อนขึ้น", "เลื่อนลง", "เพิ่มคำถาม"

- [ ] **Step 1:** `question-form.test.ts` boundary: ตัวเลือก 1/2/6/7, correctIndex นอกช่วง, prompt ว่าง, explanation 1000/1001
- [ ] **Step 2:** pgTAP `009_admin_save_question.test.sql`: `admin_save_question` โดย member → `NOT_ADMIN`; ตัวเลือก 1 ข้อบนบท published → `LESSON_PUBLISHED_INCOMPLETE`; บันทึกครบ → เฉลยชี้ตัวเลือกของคำถามเดียวกัน
- [ ] **Step 3 (QA):** `admin-questions.spec.ts`

```ts
test('TC-ADM-09 add question with choices, key and explanation then publish @smoke', …); // บทใหม่ → เพิ่ม 1 คำถาม 3 ตัวเลือก → "เผยแพร่" สำเร็จ
test('TC-ADM-10 choice count limits 2–6 in the editor', …);
test('TC-ADM-11 editing a published lesson into an incomplete state is refused', …);  // Review Focus 2 ผ่าน UI: ลบตัวเลือกจนเหลือ 1 → ข้อความ LESSON_PUBLISHED_INCOMPLETE; reload ข้อมูลเดิมยังอยู่
test('TC-SEC-20 member calling admin question action directly is refused @security', …); // memberDb.rpc('admin_save_question', …) → NOT_ADMIN; memberDb insert quiz_answer_keys → error
```

- [ ] **Step 4:** รัน — Expected: FAIL
- [ ] **Step 5:** เขียนตาม Interfaces
- [ ] **Step 6:** รัน `npx supabase test db`, unit, `npx playwright test e2e/specs/admin-questions.spec.ts --project=chromium` — Expected: ผ่าน
- [ ] **Step 7:** Commit `feat: add admin question editor`

---

### Task 5: [Dev → QA] จัดลำดับบท (FR-07.7) และดูตัวอย่างแบบผู้เรียน (FR-07.8)

**Files:**
- Create: `components/admin/ReorderList.tsx`, `app/(admin)/admin/lessons/[id]/preview/page.tsx`, `e2e/specs/admin-order-preview.spec.ts`
- Modify: `app/(admin)/admin/lessons/page.tsx`, `app/(admin)/admin/lessons/actions.ts` (`reorderLessons`)

**Interfaces:**
- Consumes: `reorder_lessons` (Task 1), `LessonMarkdown`, `YouTubeEmbed`, `StringPlayer`, `ChordLab`
- Produces:
  - `/admin/lessons`: ช่องตัวเลข "ลำดับ" ต่อแถว + ปุ่ม "บันทึกลำดับ" (สเปก FR-07.7 "ช่องตัวเลขลำดับ") — Server Action `reorderLessons(courseId, form)` แปลงเป็นอาร์เรย์ id เรียงตามตัวเลข (เสมอกันใช้ลำดับเดิมเป็นตัวตัดสิน) แล้วเรียก `reorder_lessons`; ค่าที่ไม่ใช่จำนวนเต็มบวก → "ลำดับต้องเป็นจำนวนเต็มบวก"
  - `/admin/lessons/[id]/preview`: แสดงบทเหมือนหน้าผู้เรียน (หัวข้อ, วิดีโอ, Markdown, เครื่องมือเสียง, รายการคำถามแบบอ่านอย่างเดียวไม่มีเฉลย) พร้อมแถบ "ตัวอย่างสำหรับผู้ดูแล — ผู้เรียนยังไม่เห็นถ้าเป็นฉบับร่าง"; ลิงก์ "ดูตัวอย่าง" ในหน้าแก้ไขบท

- [ ] **Step 1 (QA):** `admin-order-preview.spec.ts`

```ts
test('TC-ADM-12 reorder by number swaps lessons in one save', …);          // Review Focus 3: คอร์สทดสอบ 2 บท ใส่ 2,1 → "บันทึกลำดับ" → ลำดับสลับ; adminDb ยืนยัน sort_order 1,2
test('TC-ADM-13 non-integer order shows Thai error and keeps values', …);
test('TC-ADM-14 preview shows draft lesson as learners would see it', …);  // บทฉบับร่างของ Task 3 → heading, เนื้อหา Markdown, ไม่มี "ข้อที่ถูก"
```

- [ ] **Step 2:** รัน — Expected: FAIL
- [ ] **Step 3:** เขียนตาม Interfaces
- [ ] **Step 4:** รัน — Expected: ผ่าน
- [ ] **Step 5:** Commit `feat: add lesson ordering and admin preview`

---

### Task 6: [Dev → QA] รูปในบทเรียนผ่าน Storage

**Files:**
- Create: `supabase/migrations/20261021000008_storage.sql`, `supabase/tests/008_storage.test.sql`, `components/admin/ImageUpload.tsx`, `e2e/specs/admin-images.spec.ts`
- Modify: `components/admin/LessonForm.tsx` (ปุ่ม "แทรกรูป")

**Interfaces:**
- Produces:
  - bucket `lesson-images` (public read), policies บน `storage.objects`: insert/update/delete เฉพาะ `is_admin()`; ไฟล์ ≤ 2 MB, mime `image/png|jpeg|webp|gif` (ตั้งที่ bucket `file_size_limit`, `allowed_mime_types`)
  - bucket `avatars` (public read) สำหรับ Task 8: insert/update/delete เฉพาะ path ที่ขึ้นต้นด้วย `auth.uid()::text || '/'`; ≤ 1 MB
  - `ImageUpload` (client): เลือกไฟล์ → อัปโหลดด้วย browser client ไปที่ `lesson-images/<lessonId>/<uuid>.<ext>` → แทรก `![คำอธิบายรูป](<public url>)` ที่ตำแหน่ง cursor ใน textarea เนื้อหา; error → "อัปโหลดรูปไม่สำเร็จ (รองรับ PNG, JPG, WEBP, GIF ไม่เกิน 2 MB)"

- [ ] **Step 1:** `008_storage.test.sql`: member insert ลง `lesson-images` → ถูกปฏิเสธ; admin insert ได้; member insert `avatars/<ตัวเอง>/a.png` ได้ แต่ `avatars/<คนอื่น>/a.png` ไม่ได้
- [ ] **Step 2 (QA):** `admin-images.spec.ts`: `TC-ADM-15 admin uploads an image and it renders in preview` (ไฟล์ PNG เล็ก ๆ ใน `e2e/fixtures/files/`); `TC-SEC-22 member cannot upload lesson images @security` (memberDb.storage.from('lesson-images').upload → error)
- [ ] **Step 3:** รัน — Expected: FAIL
- [ ] **Step 4:** เขียนตาม Interfaces
- [ ] **Step 5:** รัน `npx supabase db reset && npx supabase test db` และ spec — Expected: ผ่าน
- [ ] **Step 6:** Commit `feat: add lesson image uploads`

---

### Task 7: [Dev → QA] รายชื่อผู้เรียนและความคืบหน้า (FR-07.9) + จัดการสิทธิ์

**Files:**
- Create: `app/(admin)/admin/learners/{page.tsx,actions.ts}`, `e2e/specs/admin-learners.spec.ts`
- Modify: `lib/data/admin.ts` (`listLearners`)

**Interfaces:**
- Produces:
  - `listLearners(): Promise<{ id: string; displayName: string; role: 'member' | 'admin'; completed: number; total: number; avgBestScore: number | null; weekMinutes: number; lastPracticedOn: string | null }[]>` — ใช้สิทธิ์แอดมินผ่าน RLS (อ่าน profiles, lesson_progress, practice_logs ทั้งหมด); คำนวณด้วย `lib/stats.ts` และ `bangkokWeekRange` เดิม
  - หน้า: ตารางอ่านอย่างเดียว คอลัมน์ "ชื่อ", "บทที่จบ", "คะแนนเฉลี่ย", "นาทีฝึกสัปดาห์นี้", "ฝึกล่าสุด", "สิทธิ์"; ปุ่ม "ตั้งเป็นผู้ดูแล" / "ลดเป็นผู้เรียน" เรียก `set_user_role` (`LAST_ADMIN`/`USER_NOT_FOUND` แปลไทย) ยืนยันด้วย `<dialog>`
  - ไม่แสดงอีเมลผู้เรียน (ไม่มีในตาราง profiles; ไม่ใช้ service role)

- [ ] **Step 1 (QA):** `admin-learners.spec.ts`: `TC-ADM-16 learner list shows progress read-only` (member สอบผ่านบท 1 ผ่าน rpc → แถวแสดง "1 / 5"); `TC-ADM-17 admin promotes and demotes another user` (สร้าง member ใหม่ → "ตั้งเป็นผู้ดูแล" → สิทธิ์เป็นผู้ดูแล → "ลดเป็นผู้เรียน" → กลับเป็นผู้เรียน); กรณีแอดมินคนสุดท้าย (Review Focus 4) ทดสอบด้วย pgTAP ใน Task 1 เพราะฐานข้อมูลทดสอบมีแอดมินหลายคนพร้อมกัน
- [ ] **Step 2:** รัน — Expected: FAIL
- [ ] **Step 3:** เขียนตาม Interfaces
- [ ] **Step 4:** รัน — Expected: ผ่าน
- [ ] **Step 5:** Commit `feat: add admin learner progress view`

---

### Task 8: [Dev → QA] รูปโปรไฟล์ (FR-01.8) และเมโทรนอม (FR-05.5)

**Files:**
- Create: `components/AvatarUpload.tsx`, `components/Metronome.tsx`, `lib/audio/metronome.ts`, `tests/unit/metronome.test.ts`, `e2e/specs/extras.spec.ts`
- Modify: `app/(learner)/profile/page.tsx`, `app/(learner)/profile/actions.ts` (`updateAvatar`), `app/(learner)/layout.tsx` (รูปเล็กในแถบนำทาง), `app/(learner)/practice/page.tsx` (วาง Metronome)

**Interfaces:**
- Consumes: bucket `avatars` (Task 6), `getAudioContext`/`pluck` ใน `lib/audio/strings.ts`
- Produces:
  - `AvatarUpload`: อัปโหลดไป `avatars/<uid>/avatar.<ext>` (upsert) แล้ว Server Action `updateAvatar(url)` ตั้ง `profiles.avatar_url` (ตรวจว่า URL อยู่ใต้ bucket ของผู้ใช้เอง); ปุ่ม "เปลี่ยนรูปโปรไฟล์", "ลบรูป"; error → "อัปโหลดรูปไม่สำเร็จ (PNG, JPG, WEBP ไม่เกิน 1 MB)"
  - `lib/audio/metronome.ts`: `clampBpm(n: number): number` (40–208), `beatIntervalMs(bpm): number`, `scheduleClicks(ctx, bpm, startTime, count): number[]` (เวลาของแต่ละ click ตาม AudioContext clock ไม่ใช้ setInterval เป็นตัวกำหนดจังหวะ)
  - `Metronome`: ป้าย "จังหวะ (BPM)" (number + slider), ปุ่ม "เริ่ม"/"หยุด" — ชื่อปุ่มต้องไม่ชนกับตัวจับเวลา ใช้ "เริ่มเมโทรนอม"/"หยุดเมโทรนอม"; เน้นจังหวะแรกของห้อง 4/4; ใช้ `useAudioSupported` เดิม

- [ ] **Step 1:** `metronome.test.ts`: `clampBpm(10)`=40, `clampBpm(300)`=208, `beatIntervalMs(120)`=500, `scheduleClicks(…, 120, 1.0, 4)` = [1, 1.5, 2, 2.5]
- [ ] **Step 2 (QA):** `extras.spec.ts`: `TC-AUTH-12 member uploads and removes avatar`; `TC-PRC-09 metronome starts and stops without errors` (ไม่มี console error, ปุ่มสลับข้อความ); `TC-SEC-23 member cannot set avatar_url to another user's path @security`
- [ ] **Step 3:** รัน — Expected: FAIL
- [ ] **Step 4:** เขียนตาม Interfaces
- [ ] **Step 5:** รัน — Expected: ผ่าน
- [ ] **Step 6:** Commit `feat: add profile avatar and metronome`

---

### Task 9: [Dev → QA] ลิงก์อีเมลข้ามอุปกรณ์ และ Google login แบบเปิดด้วย config (FR-01.2, 01.4, 01.7)

**Files:**
- Create: `app/auth/confirm/route.ts`, `supabase/templates/{confirmation,recovery}.html`, `supabase/migrations/20261021000010_oauth_display_name.sql`, `components/GoogleButton.tsx`, `e2e/specs/auth-links.spec.ts`
- Modify: `supabase/config.toml` (`[auth.email.template.confirmation]`/`recovery` → `content_path`; `[auth.external.google]` อ่านค่าจาก env `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`/`_SECRET`, `enabled = false` ค่าเริ่มต้น), `app/(auth)/actions.ts`, `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, `.env.example` (`NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`)

**Interfaces:**
- Produces:
  - เทมเพลตอีเมล (ภาษาไทย) ลิงก์ไป `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/dashboard` และ `…type=recovery&next=/reset-password`
  - `GET /auth/confirm?token_hash&type&next` → `verifyOtp({ token_hash, type })` → redirect `safeNextPath(next)`; ล้มเหลว → `/login?error=link`; `type` รับเฉพาะ `signup`, `recovery`, `email`
  - `/auth/callback` (code) ยังอยู่สำหรับ OAuth
  - `GoogleButton`: แสดงเมื่อ `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true'` เท่านั้น ปุ่ม "เข้าสู่ระบบด้วย Google" → `signInWithOAuth({ provider: 'google', options: { redirectTo: siteUrl() + '/auth/callback?next=/dashboard' } })`; ผู้ใช้ Google ใหม่ผ่าน `handle_new_user` เหมือนอีเมล (display_name จาก `raw_user_meta_data->>'full_name'` ถ้ามี ก่อนส่วนหน้า `@` — `create or replace` `handle_new_user` ใน migration `0010`)
  - การเปิด Google จริง (สร้าง OAuth client, ตั้ง redirect URI) อยู่ในแผนที่ 4

- [ ] **Step 1 (QA):** `auth-links.spec.ts`

```ts
test('TC-AUTH-11 confirmation link works in a fresh browser context @smoke', …); // Review Focus 5: สมัครใน context A → เปิดลิงก์ Mailpit ใน context B (ไม่มี cookie) → ล็อกอินได้ / อยู่ที่ /dashboard
test('TC-AUTH-13 password reset link works in a fresh browser context', …);
test('TC-AUTH-14 tampered token_hash goes to login with Thai message', …);   // → /login?error=link
test('TC-AUTH-15 Google button hidden when not configured', …);
```

ปรับ `latestLinkFor` ค่าเริ่มต้น `contains` เป็น `/auth/confirm` (คงรองรับ `/auth/v1/verify`) และแก้เทสต์เดิม TC-AUTH-01/06 ให้ผ่านกับลิงก์ใหม่

- [ ] **Step 2:** รัน — Expected: FAIL
- [ ] **Step 3:** เขียนตาม Interfaces; `npx supabase stop && npx supabase start` เพื่อโหลดเทมเพลต
- [ ] **Step 4:** รัน `npx playwright test e2e/specs/auth.spec.ts e2e/specs/auth-links.spec.ts --project=chromium` — Expected: ผ่าน
- [ ] **Step 5:** Commit `feat: use token-hash email links and optional Google sign-in`

---

### Task 10: [Dev] Security headers และ CSP

**Files:**
- Modify: `next.config.ts`
- Create: `e2e/api/headers.spec.ts`

**Interfaces:**
- Produces: `headers()` ใน `next.config.ts` ใส่ทุก route: `Content-Security-Policy` (default-src 'self'; script-src 'self' 'unsafe-inline' (Next ต้องใช้) ; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: `<SUPABASE_URL>`; connect-src 'self' `<SUPABASE_URL>`; frame-src https://www.youtube-nocookie.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`; `<SUPABASE_URL>` อ่านจาก `NEXT_PUBLIC_SUPABASE_URL` ตอน build

- [ ] **Step 1:** `headers.spec.ts`: `TC-SEC-24 security headers present on pages @security` — `request.get('/')` มีทุก header ข้างต้น และ CSP มี `frame-ancestors 'none'`
- [ ] **Step 2:** รัน — Expected: FAIL
- [ ] **Step 3:** เขียน headers
- [ ] **Step 4:** รัน `npm run build && npx playwright test e2e --project=chromium` — Expected: ผ่านทั้งหมด (ไม่มี CSP violation ใน console ของ spec เดิม — เพิ่มการเก็บ `page.on('console')` ข้อความ "Content Security Policy" ใน fixture เป็น error)
- [ ] **Step 5:** Commit `feat: add security headers and CSP`

---

### Task 11: [QA] เส้นทางหลักที่ 3, ทุกเบราว์เซอร์, และเก็บงานเทสต์ที่ค้าง

**Files:**
- Create: `e2e/specs/journey-admin.spec.ts`
- Modify: `e2e/specs/quiz.spec.ts` (TC-QZ-22), `e2e/specs/mobile.spec.ts` (หน้าแอดมิน), `e2e/specs/a11y.spec.ts` (หน้าแอดมิน)

- [ ] **Step 1:** เขียนเทสต์

```ts
// journey-admin.spec.ts — สเปก 6.3 เส้นทางหลัก 3
test('TC-ADM-18 admin creates draft → learner cannot see → publish → learner sees @smoke', …); // adminPage สร้างบท+คำถามในคอร์สทดสอบ; memberPage /path ไม่เห็น; เผยแพร่; memberPage เห็นการ์ด
// quiz.spec.ts — งานค้างจาก R11 แผนที่ 2
// TC-QZ-22: นับ request ที่มี header `next-action` ด้วย page.on('request') / 'requestfinished' → ต้องเป็น 1 แล้วจึงนับแถว quiz_attempts
// mobile.spec.ts: TC-MOB-01 เพิ่ม /admin, /admin/lessons, /admin/lessons/[id], /admin/learners (adminPage)
// a11y.spec.ts: TC-SEC-18 เพิ่ม /admin/lessons/[id]
```

- [ ] **Step 2:** รัน `npx playwright test e2e --project=chromium`, `--project=firefox`, `--project=mobile` แล้ว `--repeat-each=3 --project=chromium` — Expected: ผ่านทั้งหมด ไม่มี flaky; ไม่มีผู้ใช้ `qa+…` และคอร์ส/บททดสอบค้าง
- [ ] **Step 3:** Commit `test: add admin journey and finish deferred test fixes`

---

### Task 12: [QA] Test Cases, RTM และเอกสาร (เริ่มได้ทันที)

**Files:**
- Modify: `docs/qa/test-cases.md`, `docs/qa/rtm.md`, `docs/qa/test-plan.md`, `docs/qa/ci.md`, `docs/superpowers/specs/2026-10-19-fretpath-design.md` (หัวข้อ 9: บันทึกการเปลี่ยนแปลงของแผนที่ 3)

- [ ] **Step 1:** เพิ่ม TC ทุกตัวที่ชื่อเทสต์ในแผนนี้อ้าง (ADM-03..18, SEC-19..24, AUTH-11..15, PRC-09) ในรูปแบบเดิม พร้อมเทคนิค (BVA: ตัวเลือก 1/2/6/7, เกณฑ์ผ่าน 0/1/100/101; State transition: ฉบับร่าง ↔ เผยแพร่; Role-based: anon/member/admin)
- [ ] **Step 2:** อัปเดต `rtm.md`: FR-07.1–07.9, FR-01.7 (โค้ดพร้อม เปิดจริงในแผนที่ 4), FR-01.8, FR-05.5 มี TC; เหลือเฉพาะ NFR-05/06/07 "รอแผนที่ 4"; อัปเดตสรุป
- [ ] **Step 3:** หัวข้อ 9 ของสเปก: `lesson_publish_problems`, `reorder_lessons`, constraint trigger บทที่เผยแพร่, `LAST_ADMIN`/`USER_NOT_FOUND`, คอร์สฉบับร่างซ่อนบท, ลิงก์อีเมล token_hash, Storage buckets, CSP
- [ ] **Step 4:** Commit `docs(qa): add plan 3 test cases and update RTM`

---

## เมื่อจบแผนที่ 3
- `npx supabase test db`, `npm run test:unit`, Playwright ทุก spec บน `chromium`, `firefox`, `mobile` ผ่าน; check `ci` เขียวบน PR
- เส้นทางหลักครบทั้ง 3 เส้นของสเปก 6.3 ผ่าน UI จริง; ทุก FR ระดับ M มี TC ใน RTM
- ขั้นต่อไป: แผนที่ 4 — production (Vercel + Supabase Free), Auth/SMTP/templates/Google บน production, keep-alive, backup, nightly, Lighthouse, Test Summary Report
