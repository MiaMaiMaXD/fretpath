# FretPath แผนที่ 1: ฐานราก — ฐานข้อมูล ความปลอดภัย และระบบทดสอบ

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้างโปรเจกต์ Next.js + ฐานข้อมูล Supabase ครบทุกตาราง พร้อม RLS, ฟังก์ชัน `submit_quiz` และกติกาเนื้อหา ทดสอบด้วย pgTAP และ Playwright API tests รันอัตโนมัติใน CI

**Architecture:** ตรรกะความปลอดภัยทั้งหมด (สิทธิ์, คะแนน, การปลดล็อก) อยู่ใน Postgres ผ่าน migration ใน `supabase/migrations/`; Next.js ในแผนนี้มีแค่โครงและ `/api/health`; QA สร้างเฟรมเวิร์ก Playwright และพิสูจน์ RLS จากภายนอกผ่าน supabase-js

**Tech Stack:** Next.js (App Router) + TypeScript + Tailwind, Supabase CLI (Postgres 15+, pgTAP), `@supabase/supabase-js` + `@supabase/ssr`, Playwright (TypeScript), GitHub Actions

**Spec:** `docs/superpowers/specs/2026-10-19-fretpath-design.md`

**แผนทั้งหมด**
| แผน | ขอบเขต | ได้อะไรเมื่อจบ |
|---|---|---|
| **1 (ฉบับนี้)** | ฐานข้อมูล, RLS, `submit_quiz`, กติกาเนื้อหา, seed, Playwright framework, CI, Test Plan | ฐานข้อมูลที่ปลอดภัยและพิสูจน์ด้วยเทสต์ |
| 2 | หน้าเว็บผู้เรียน FR-01 ถึง FR-06 + E2E | ผู้เรียนใช้งานได้ครบเส้นทาง |
| 3 | หลังบ้านแอดมิน FR-07, deploy Vercel/Supabase production, keep-alive, backup, nightly | ระบบออนไลน์จริงพร้อมเดโม |

**ผู้รับผิดชอบ:** แต่ละ Task ระบุ `[Dev]` หรือ `[QA]` — Task 1–7 เป็นของ Dev, Task 8–11 เป็นของ QA; QA เริ่ม Task 11 (Test Plan) ได้ทันทีคู่ขนานกับ Dev

## Global Constraints

- ค่าใช้จ่าย 0 บาท: ห้ามใช้บริการหรือแพ็กเกจที่ต้องจ่ายเงิน
- Node.js 22 LTS; ล็อกเวอร์ชันแพ็กเกจใน `package-lock.json`
- TypeScript `strict: true`
- โครงสร้างฐานข้อมูลเปลี่ยนผ่านไฟล์ใน `supabase/migrations/` เท่านั้น
- ห้ามใช้ `SUPABASE_SERVICE_ROLE_KEY` ในโค้ดที่ไปถึงเบราว์เซอร์; ใช้ได้เฉพาะใน `e2e/` และ GitHub Secrets (NFR-01)
- ข้อความที่ผู้ใช้เห็นเป็นภาษาไทย (NFR-04); รหัส error จากฐานข้อมูลเป็นภาษาอังกฤษตัวพิมพ์ใหญ่ เพื่อให้หน้าเว็บแปลเป็นข้อความไทย
- เขตเวลาของ "วันนี้" คือ `Asia/Bangkok`
- ค่าจากสเปก: `pass_score` 1–100 ค่าเริ่มต้น 60; `minutes` 1–600; `note` ≤ 500 ตัวอักษร; `weekly_goal_minutes` 0–5000; ตัวเลือก 2–6 ข้อต่อคำถาม; รหัสผ่าน ≥ 8 ตัวอักษร
- `score_pct = round(ถูก / ทั้งหมด × 100)` (ปัดแบบ half-up)
- รหัส error: `NOT_AUTHENTICATED`, `LESSON_LOCKED`, `INVALID_ANSWERS`, `LESSON_INCOMPLETE`, `LESSON_HAS_LEARNERS`, `FUTURE_DATE`, `NOT_ADMIN`

## Review Focus

1. **เขตเวลาใกล้เที่ยงคืน:** ผู้เรียนบันทึกการฝึกตอน 00:30 น. เวลาไทย (ยังเป็นเมื่อวานตาม UTC) ต้องบันทึกวันที่ "วันนี้" ตามเวลาไทยได้ และวันพรุ่งนี้ตามเวลาไทยต้องถูกปฏิเสธ → Task 4, `test_practice_date_uses_bangkok_today`
2. **ส่งคำตอบซ้ำ/พร้อมกัน:** กดส่งสองครั้งหรือสอบผ่านซ้ำหลังจบบทแล้ว ต้องไม่ error และไม่เกิดแถว `lesson_progress` ซ้ำ ไม่ลดสถานะ completed กลับ → Task 5, `test_repeat_pass_is_idempotent`
3. **บทถูกเปลี่ยนกลับเป็นฉบับร่างหลังผู้เรียนปลดล็อกแล้ว:** ผู้เรียนต้องมองไม่เห็นเนื้อหาบทนั้น และการปลดล็อกบทถัดไปต้องข้ามบทฉบับร่าง → Task 4 `test_unpublished_lesson_content_hidden`, Task 5 `test_next_lesson_skips_draft`
4. **ลำดับบทซ้ำกัน:** สองบทในคอร์สเดียวมี `sort_order` เท่ากัน ทำให้ "บทถัดไป" กำกวม ต้องถูกปฏิเสธ แต่การสลับลำดับใน transaction เดียวต้องทำได้ → Task 2, `test_sort_order_unique_but_swappable`
5. **ลบบัญชีผู้ใช้:** ลบผู้ใช้ออกจาก Auth (รวมถึงการล้างข้อมูลหลังเทสต์ของ QA) ต้องลบข้อมูลที่เกี่ยวข้องทั้งหมดโดยไม่ติด foreign key → Task 3, `test_deleting_user_cascades`

---

## โครงสร้างไฟล์

```
fretpath/
  app/layout.tsx, app/page.tsx              โครงหน้า + ฟอนต์ไทย
  app/api/health/route.ts                   GET → { ok: true } (ใช้กับ smoke test และ keep-alive)
  lib/supabase/server.ts                    createClient() ฝั่งเซิร์ฟเวอร์ (cookies)
  lib/supabase/browser.ts                   createClient() ฝั่งเบราว์เซอร์
  lib/database.types.ts                     สร้างจาก `supabase gen types`
  proxy.ts                                  รีเฟรชเซสชัน Supabase
  supabase/config.toml
  supabase/migrations/
    20261020000001_schema.sql               ตารางและข้อจำกัด
    20261020000002_auth_triggers.sql        handle_new_user, ลบผู้ใช้
    20261020000003_rls.sql                  helper functions + policies + grants
    20261020000004_submit_quiz.sql          submit_quiz
    20261020000005_content_rules.sql        เผยแพร่, ลบ, ปลดล็อกหลังเผยแพร่
  supabase/seed.sql                         คอร์ส + 5 บท + คำถาม + บัญชีทดสอบ
  supabase/tests/helpers/auth.psql          ฟังก์ชันช่วยเทสต์ (ไม่ใช่ไฟล์ .sql จึงไม่ถูกรันเป็นเทสต์)
  supabase/tests/001_schema.test.sql … 005_content_rules.test.sql
  playwright.config.ts
  e2e/utils/supabaseAdmin.ts                สร้าง/ลบผู้ใช้ทดสอบ (service role)
  e2e/fixtures/index.ts                     fixtures: member, admin, otherMember
  e2e/api/health.spec.ts                    @smoke
  e2e/api/rls.spec.ts                       @security
  e2e/api/submit-quiz.spec.ts               @security
  .github/workflows/ci.yml
  .github/ISSUE_TEMPLATE/defect.yml
  docs/qa/test-plan.md, docs/qa/test-cases.md, docs/qa/rtm.md
```

---

### Task 1: [Dev] โครงโปรเจกต์ Next.js

**Files:**
- Create: `package.json`, `tsconfig.json`, `eslint.config.mjs`, `tailwind` config ตามที่ `create-next-app` สร้าง, `app/layout.tsx`, `app/page.tsx`, `.nvmrc`, `.env.example`, `.gitignore`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `db:types` (`supabase gen types typescript --local > lib/database.types.ts`); env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (เฉพาะ e2e)

- [ ] **Step 1:** รัน `npx create-next-app@latest . --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*"` ในโฟลเดอร์ repo (มีโฟลเดอร์ `docs/` อยู่แล้ว ให้คงไว้)
- [ ] **Step 2:** `app/layout.tsx`: `<html lang="th">`, ฟอนต์ `Noto_Sans_Thai` และ `Inter` จาก `next/font/google`, `metadata.title = "FretPath — เรียนกีตาร์พื้นฐานทีละก้าว"`; `app/page.tsx` แสดงหัวข้อ "FretPath" (หน้าแรกจริงทำในแผนที่ 2)
- [ ] **Step 3:** เพิ่ม script `typecheck` และ `.nvmrc` = `22`; `.env.example` มีชื่อ env ทั้ง 3 ตัวโดยไม่มีค่า; `.gitignore` มี `.env*.local`, `playwright-report/`, `test-results/`, `e2e/.auth/`
- [ ] **Step 4:** รัน `npm run lint && npm run typecheck && npm run build` — Expected: ทั้งสามคำสั่งจบด้วย exit code 0
- [ ] **Step 5:** Commit `chore: scaffold Next.js app`

---

### Task 2: [Dev] Supabase local + ตารางทั้งหมด

**Files:**
- Create: `supabase/config.toml` (จาก `supabase init`), `supabase/migrations/20261020000001_schema.sql`, `supabase/tests/helpers/auth.psql`, `supabase/tests/001_schema.test.sql`

**Interfaces:**
- Produces: ตารางตามสเปกหัวข้อ 4.2 (`profiles`, `courses`, `enrollments`, `lessons`, `lesson_contents`, `quiz_questions`, `quiz_choices`, `quiz_answer_keys`, `lesson_progress`, `quiz_attempts`, `quiz_attempt_answers`, `practice_logs`); enum types `user_role ('member','admin')`, `content_status ('draft','published')`, `enrollment_source ('free','purchase')`, `progress_status ('unlocked','completed')`
- Produces (test helpers ใน `helpers/auth.psql`, schema `tests`):
  - `tests.create_user(p_email text, p_role user_role default 'member') returns uuid` — insert ลง `auth.users` แล้ว insert `profiles` แบบ `on conflict (id) do update set role = p_role` (ก่อน Task 3 ยังไม่มีทริกเกอร์สร้าง profile)
  - `tests.authenticate_as(p_user uuid) returns void` — `set local role authenticated` + `set local request.jwt.claims` ด้วย `sub` และ `role`
  - `tests.authenticate_anon() returns void`, `tests.clear_auth() returns void` (กลับเป็น `postgres`)
  - `tests.make_lesson(p_course uuid, p_sort int, p_status content_status default 'published', p_pass int default 60, p_questions int default 5) returns uuid` — สร้างบทเป็น draft + เนื้อหา + คำถามละ 3 ตัวเลือก + เฉลยตัวเลือกแรก แล้วจึง update เป็น `p_status` (ลำดับนี้จำเป็นหลัง Task 6)
  - `tests.answers(p_lesson uuid, p_correct int) returns jsonb` — `security definer` (อ่านเฉลยได้แม้เรียกขณะ authenticate เป็น member): ตอบถูก `p_correct` ข้อแรกตาม `sort_order` ที่เหลือเลือกตัวเลือกที่ผิด
  - ทุกไฟล์เทสต์ขึ้นต้นด้วย `\ir helpers/auth.psql`

กติกาตาราง: ทุก FK ไปยัง `auth.users`/`profiles` และจากลูกไปแม่ใช้ `on delete cascade` ยกเว้น `practice_logs.lesson_id` ใช้ `on delete set null`; `lessons` มี `unique (course_id, sort_order) deferrable initially immediate`; `updated_at` อัปเดตด้วยทริกเกอร์ `set_updated_at()` ร่วมกัน; `lesson_contents.video_url` CHECK ด้วย regex `^https://(www\.)?(youtube\.com/watch\?v=|youtu\.be/)[A-Za-z0-9_-]{11}`

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลว** `001_schema.test.sql`

```sql
select has_table('public', t, t) from unnest(array['profiles','courses','enrollments','lessons',
  'lesson_contents','quiz_questions','quiz_choices','quiz_answer_keys','lesson_progress',
  'quiz_attempts','quiz_attempt_answers','practice_logs']) t;
select col_default_is('public','lessons','pass_score','60');
select col_default_is('public','profiles','role','''member''::user_role');
select col_default_is('public','courses','is_free','true');
-- test_pass_score_range
select throws_ok($$ update lessons set pass_score = 0 where id = :'l' $$, '23514');
select throws_ok($$ update lessons set pass_score = 101 where id = :'l' $$, '23514');
-- test_practice_minutes_boundaries
select throws_ok($$ insert into practice_logs(user_id, practiced_on, minutes, activity) values (:'u', current_date - 1, 0, 'x') $$, '23514');
select lives_ok ($$ insert into practice_logs(user_id, practiced_on, minutes, activity) values (:'u', current_date - 1, 1, 'x') $$);
select lives_ok ($$ insert into practice_logs(user_id, practiced_on, minutes, activity) values (:'u', current_date - 1, 600, 'x') $$);
select throws_ok($$ insert into practice_logs(user_id, practiced_on, minutes, activity) values (:'u', current_date - 1, 601, 'x') $$, '23514');
select throws_ok($$ insert into practice_logs(user_id, practiced_on, minutes, activity, note) values (:'u', current_date - 1, 5, 'x', repeat('ก', 501)) $$, '23514');
-- test_video_url_must_be_youtube
select throws_ok($$ update lesson_contents set video_url = 'https://vimeo.com/123' where lesson_id = :'l' $$, '23514');
-- test_sort_order_unique_but_swappable (Review Focus 4)
select throws_ok($$ update lessons set sort_order = 1 where id = :'l2' $$, '23505');
select lives_ok ($$ set constraints all deferred;
  update lessons set sort_order = 2 where id = :'l1'; update lessons set sort_order = 1 where id = :'l2' $$);
```

(ใช้ `\gset` เตรียม `:u`, `:l`, `:l1` (sort 1), `:l2` (sort 2) ด้วย helpers; ห่อด้วย `begin; select plan(N); … select * from finish(); rollback;`)

- [ ] **Step 2:** รัน `supabase start && supabase test db` — Expected: FAIL (`relation "profiles" does not exist`)
- [ ] **Step 3:** เขียน `20261020000001_schema.sql` ตามสเปก 4.2 และกติกาด้านบน (`create extension if not exists pgtap with schema extensions` อยู่ในไฟล์นี้)
- [ ] **Step 4:** รัน `supabase db reset && supabase test db` — Expected: PASS ทุกข้อของ `001`
- [ ] **Step 5:** Commit `feat(db): add core schema`

---

### Task 3: [Dev] ทริกเกอร์ผู้ใช้ใหม่ + seed

**Files:**
- Create: `supabase/migrations/20261020000002_auth_triggers.sql`, `supabase/seed.sql`, `supabase/tests/002_auth_triggers.test.sql`

**Interfaces:**
- Consumes: ตารางจาก Task 2
- Produces: `public.handle_new_user() returns trigger` (`security definer`, `set search_path = ''`) ผูกกับ `after insert on auth.users`; `display_name` เริ่มต้น = `raw_user_meta_data->>'display_name'` หรือส่วนหน้า `@` ของอีเมล
- Produces (seed): คอร์ส slug `guitar-basics` "กีตาร์พื้นฐาน" (published, `is_free = true`); 5 บท published, `sort_order` 1–5, slug และชื่อ:
  1. `guitar-anatomy-tuning` — รู้จักส่วนประกอบของกีตาร์และการตั้งสาย
  2. `first-chords` — การวางนิ้วและคอร์ดพื้นฐานชุดแรก (Em, Am, C, D)
  3. `open-chords-changes` — คอร์ดเปิดยอดฮิตและการเปลี่ยนคอร์ด (G, C, D, Em)
  4. `strumming-4-4` — พื้นฐานการดีด (Strumming) และการนับจังหวะ 4/4
  5. `f-chord-first-song` — คอร์ด F เบื้องต้น และการบรรเลงเพลงแรกจบเพลง

  แต่ละบทมีเนื้อหา Markdown จากต้นแบบ FretPath และคำถาม 5 ข้อ (ข้อละ 3–4 ตัวเลือก + เฉลย + คำอธิบาย); บัญชี `admin@fretpath.test` (admin) และ `member@fretpath.test` (member) รหัส `Passw0rd!` — **seed ใช้เฉพาะ local/CI**

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลว** `002_auth_triggers.test.sql` (ใช้ คอร์ส published 1 คอร์ส + คอร์ส draft 1 คอร์ส ที่สร้างในไฟล์เทสต์เอง)

```sql
-- test_new_user_gets_profile
select results_eq($$ select role::text, display_name from profiles where id = :'u' $$,
  $$ values ('member', 'newbie') $$);   -- อีเมล newbie@test.local
-- test_new_user_enrolled_in_published_free_courses_only
select results_eq($$ select course_id, source::text from enrollments where user_id = :'u' $$,
  $$ values (:'published_course'::uuid, 'free') $$);
-- test_first_lesson_unlocked_only
select results_eq($$ select lesson_id, status::text from lesson_progress where user_id = :'u' $$,
  $$ values (:'first_lesson'::uuid, 'unlocked') $$);
-- test_deleting_user_cascades (Review Focus 5)
insert into practice_logs(user_id, practiced_on, minutes, activity) values (:'u', current_date - 1, 10, 'x');
delete from auth.users where id = :'u';
select is((select count(*) from profiles where id = :'u')::int, 0);
select is((select count(*) from practice_logs where user_id = :'u')::int, 0);
select is((select count(*) from lesson_progress where user_id = :'u')::int, 0);
```

- [ ] **Step 2:** รัน `supabase test db` — Expected: FAIL ที่ `002` (ไม่มีแถว profile)
- [ ] **Step 3:** เขียน migration และ `seed.sql` (ผู้ใช้ seed สร้างด้วย insert ลง `auth.users` + `auth.identities` แล้วตั้ง role admin ด้วย update)
- [ ] **Step 4:** รัน `supabase db reset && supabase test db` — Expected: PASS `001`–`002`; และ `psql` นับ `select count(*) from lessons` ได้ 5
- [ ] **Step 5:** Commit `feat(db): provision new users and seed course`

---

### Task 4: [Dev] สิทธิ์ (RLS) และการตรวจวันที่ฝึก

**Files:**
- Create: `supabase/migrations/20261020000003_rls.sql`, `supabase/tests/003_rls.test.sql`

**Interfaces:**
- Consumes: Task 2–3
- Produces (ทั้งหมด `security definer`, `stable`, `set search_path = ''`):
  - `public.is_admin() returns boolean`
  - `public.is_enrolled(p_course uuid) returns boolean`
  - `public.is_lesson_unlocked(p_lesson uuid) returns boolean` — true เมื่อบท published, ผู้ใช้ลงทะเบียนคอร์ส, และมีแถว `lesson_progress` ของบทนั้น
  - `public.set_user_role(p_user uuid, p_role user_role) returns void` — ถ้าไม่ใช่แอดมิน raise `NOT_ADMIN`
  - ทริกเกอร์ `validate_practice_log` (before insert/update บน `practice_logs`) raise `FUTURE_DATE` เมื่อ `practiced_on > (now() at time zone 'Asia/Bangkok')::date`
- Policies ตามตารางสเปก 4.3 เปิด RLS ทุกตาราง; `profiles`: `revoke update on profiles from authenticated` แล้ว `grant update (display_name, avatar_url, weekly_goal_minutes)`; ตารางผลการเรียน (`enrollments`, `lesson_progress`, `quiz_attempts`, `quiz_attempt_answers`) ให้ authenticated มีแค่ `select`; `quiz_answer_keys` ไม่มี policy ให้ member/anon เลย

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลว** `003_rls.test.sql` — สร้าง `:a` (member), `:b` (member), `:adm` (admin), บท `:l1` (ปลดล็อกให้ `:a`), `:l2` (ล็อก), log ของ `:b`

```sql
select tests.authenticate_as(:'a');
-- test_member_cannot_read_answer_keys
select is_empty($$ select * from quiz_answer_keys $$);
-- test_member_reads_only_own_practice_logs
select is((select count(*) from practice_logs where user_id = :'b')::int, 0);
-- test_member_cannot_update_others_logs
select is_empty($$ update practice_logs set minutes = 1 where user_id = :'b' returning id $$);
-- test_member_cannot_change_own_role
select throws_ok($$ update profiles set role = 'admin' where id = auth.uid() $$, '42501');
select throws_ok($$ select set_user_role(:'a', 'admin') $$, 'P0001', 'NOT_ADMIN');
-- test_member_cannot_write_progress_or_attempts
select throws_ok($$ insert into lesson_progress(user_id, lesson_id, status) values (:'a', :'l2', 'unlocked') $$, '42501');
select throws_ok($$ insert into quiz_attempts(user_id, lesson_id, score_pct, passed) values (:'a', :'l1', 100, true) $$, '42501');
-- test_locked_lesson_title_visible_content_hidden
select isnt_empty($$ select 1 from lessons where id = :'l2' $$);
select is_empty($$ select 1 from lesson_contents where lesson_id = :'l2' $$);
select is_empty($$ select 1 from quiz_questions where lesson_id = :'l2' $$);
select isnt_empty($$ select 1 from lesson_contents where lesson_id = :'l1' $$);
-- test_member_cannot_see_draft_lessons
select is_empty($$ select 1 from lessons where id = :'draft' $$);
-- test_unpublished_lesson_content_hidden (Review Focus 3): :lu ปลดล็อกให้ :a แล้ว ถูกเปลี่ยนกลับเป็น draft ตอนเตรียมข้อมูล
select is_empty($$ select 1 from lessons where id = :'lu' $$);
select is_empty($$ select 1 from lesson_contents where lesson_id = :'lu' $$);
-- test_practice_date_uses_bangkok_today (Review Focus 1)
select lives_ok ($$ insert into practice_logs(user_id, practiced_on, minutes, activity)
  values (auth.uid(), (now() at time zone 'Asia/Bangkok')::date, 10, 'x') $$);
select throws_ok($$ insert into practice_logs(user_id, practiced_on, minutes, activity)
  values (auth.uid(), (now() at time zone 'Asia/Bangkok')::date + 1, 10, 'x') $$, 'P0001', 'FUTURE_DATE');
select tests.authenticate_anon();
-- test_anon_cannot_read_lessons
select is_empty($$ select 1 from lessons $$);
select isnt_empty($$ select 1 from courses $$);
select tests.authenticate_as(:'adm');
-- test_admin_reads_answer_keys_and_all_logs
select isnt_empty($$ select 1 from quiz_answer_keys $$);
select isnt_empty($$ select 1 from practice_logs where user_id = :'b' $$);
select lives_ok($$ select set_user_role(:'a', 'admin') $$);
```

- [ ] **Step 2:** รัน `supabase test db` — Expected: FAIL ที่ `003`
- [ ] **Step 3:** เขียน `20261020000003_rls.sql`
- [ ] **Step 4:** รัน `supabase db reset && supabase test db` — Expected: PASS `001`–`003`
- [ ] **Step 5:** Commit `feat(db): add row level security`

---

### Task 5: [Dev] ฟังก์ชัน `submit_quiz`

**Files:**
- Create: `supabase/migrations/20261020000004_submit_quiz.sql`, `supabase/tests/004_submit_quiz.test.sql`

**Interfaces:**
- Consumes: `is_lesson_unlocked` (Task 4)
- Produces: `public.submit_quiz(p_lesson_id uuid, p_answers jsonb) returns jsonb`, `security definer`, `set search_path = ''`, `revoke execute … from public, anon`, `grant execute … to authenticated`
  - input: `p_answers = [{"question_id": uuid, "choice_id": uuid}, …]`
  - output (`next_lesson_slug` เป็น null เมื่อไม่ผ่าน หรือไม่มีบทถัดไป):
    ```json
    { "attempt_id": "uuid", "score_pct": 80, "passed": true, "pass_score": 60,
      "next_lesson_slug": "first-chords" | null,
      "results": [{ "question_id": "uuid", "choice_id": "uuid", "correct_choice_id": "uuid",
                    "is_correct": true, "explanation": "…" }] }
    ```
  - errors (`raise exception '<CODE>'` ด้วย errcode `P0001`): `NOT_AUTHENTICATED` (ไม่มี `auth.uid()`), `LESSON_LOCKED`, `INVALID_ANSWERS` (ขาดคำถาม, คำถามซ้ำ, คำถามไม่อยู่ในบท, หรือตัวเลือกไม่ใช่ของคำถามนั้น)
  - ขั้นตอนตามสเปก 4.4; "บทถัดไป" = บท published ที่มี `sort_order` น้อยที่สุดที่มากกว่าบทปัจจุบันในคอร์สเดียวกัน; ปลดล็อกด้วย `insert … on conflict do nothing`; บทที่ completed แล้วไม่ถูกลดสถานะ

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลว** `004_submit_quiz.test.sql` — ใช้ `tests.answers` (เขียนย่อว่า `answers` ด้านล่าง); คอร์สเทสต์: `:l1` (sort 1), `:ldraft` (sort 2, draft), `:l3` (sort 3), `:l61` (pass 61, คอร์สแยก, บทแรก), `:l3q` (3 คำถาม, คอร์สแยก, บทแรก), `:locked` (sort 2 ในคอร์สแยกที่ `:a` ยังไม่ผ่านบท sort 1 — ห้ามอยู่ในคอร์สแรก เพราะ `:l3` ต้องเป็นบทสุดท้าย); ทุกบท 5 ข้อยกเว้น `:l3q`

```sql
select tests.authenticate_as(:'a');
-- test_fail_does_not_unlock (40%)
select is((submit_quiz(:'l1', answers(:'l1', 2))->>'passed')::boolean, false);
select is_empty($$ select 1 from lesson_progress where user_id = auth.uid() and lesson_id = :'l3' $$);
-- test_exact_pass_score_passes (60% @ 60)
select is(submit_quiz(:'l1', answers(:'l1', 3))->>'score_pct', '60');
select is((select status::text from lesson_progress where user_id = auth.uid() and lesson_id = :'l1'), 'completed');
-- test_next_lesson_skips_draft (Review Focus 3)
select is(submit_quiz(:'l1', answers(:'l1', 5))->>'next_lesson_slug', :'l3_slug');
select isnt_empty($$ select 1 from lesson_progress where user_id = auth.uid() and lesson_id = :'l3' $$);
-- test_best_score_kept_on_lower_retake
select submit_quiz(:'l1', answers(:'l1', 1));
select is((select best_score from lesson_progress where user_id = auth.uid() and lesson_id = :'l1'), 100);
select is((select status::text from lesson_progress where user_id = auth.uid() and lesson_id = :'l1'), 'completed');
-- test_repeat_pass_is_idempotent (Review Focus 2)
select lives_ok($$ select submit_quiz(:'l1', answers(:'l1', 5)); select submit_quiz(:'l1', answers(:'l1', 5)) $$);
select is((select count(*) from lesson_progress where user_id = auth.uid() and lesson_id = :'l3')::int, 1);
-- test_every_attempt_recorded
select is((select count(*) from quiz_attempts where user_id = auth.uid() and lesson_id = :'l1')::int, 6);
-- test_last_lesson_has_no_next
select is(submit_quiz(:'l3', answers(:'l3', 5))->'next_lesson_slug', 'null'::jsonb);
-- test_below_pass_score_by_one_fails (60% @ 61)
select is((submit_quiz(:'l61', answers(:'l61', 3))->>'passed')::boolean, false);
-- test_results_include_explanation_and_key
select is(jsonb_array_length(submit_quiz(:'l1', answers(:'l1', 5))->'results'), 5);
select ok((submit_quiz(:'l1', answers(:'l1', 5))->'results'->0) ?& array['correct_choice_id','explanation','is_correct']);
-- test_locked_lesson_rejected
select throws_ok($$ select submit_quiz(:'locked', answers(:'locked', 5)) $$, 'P0001', 'LESSON_LOCKED');
-- test_invalid_answers_rejected
select throws_ok($$ select submit_quiz(:'l1', answers(:'l1', 5) - 0) $$, 'P0001', 'INVALID_ANSWERS');                 -- ขาด 1 ข้อ
select throws_ok($$ select submit_quiz(:'l1', answers(:'l1', 5) || (answers(:'l1', 5)->0)) $$, 'P0001', 'INVALID_ANSWERS'); -- ข้อซ้ำ
select throws_ok($$ select submit_quiz(:'l1', :'answers_with_foreign_choice'::jsonb) $$, 'P0001', 'INVALID_ANSWERS');
select tests.authenticate_anon();
-- test_anon_cannot_submit
select throws_ok($$ select submit_quiz(:'l1', '[]'::jsonb) $$, '42501');
select tests.authenticate_as(:'a');
-- test_rounding_two_of_three
select is(submit_quiz(:'l3q', answers(:'l3q', 2))->>'score_pct', '67');
-- test_failed_attempt_has_null_next
select is(submit_quiz(:'l3q', answers(:'l3q', 0))->'next_lesson_slug', 'null'::jsonb);
```

- [ ] **Step 2:** รัน `supabase test db` — Expected: FAIL ที่ `004` (`function submit_quiz does not exist`)
- [ ] **Step 3:** เขียน `submit_quiz` ใน migration
- [ ] **Step 4:** รัน `supabase db reset && supabase test db` — Expected: PASS `001`–`004`
- [ ] **Step 5:** Commit `feat(db): add submit_quiz with server-side grading`

---

### Task 6: [Dev] กติกาเนื้อหา: เผยแพร่, ลบ, ปลดล็อกหลังเผยแพร่

**Files:**
- Create: `supabase/migrations/20261020000005_content_rules.sql`, `supabase/tests/005_content_rules.test.sql`

**Interfaces:**
- Produces:
  - ทริกเกอร์ `validate_lesson_publish` (before insert or update of `status` บน `lessons`): เมื่อแถวมีสถานะ published (รวมการ insert เป็น published ตรง ๆ ซึ่งจะไม่ผ่านเพราะยังไม่มีคำถาม — บทใหม่จึงต้องสร้างเป็น draft เสมอ) ต้องมีคำถาม ≥ 1, ทุกคำถามมีแถวใน `quiz_answer_keys` และมีตัวเลือก 2–6 ข้อ ไม่เช่นนั้น raise `LESSON_INCOMPLETE`
  - ทริกเกอร์ `guard_lesson_delete` (before delete บน `lessons`): ถ้ามีแถวใน `lesson_progress` หรือ `quiz_attempts` raise `LESSON_HAS_LEARNERS`
  - ทริกเกอร์ `unlock_after_publish` (after update of `status` เมื่อเปลี่ยนจาก draft เป็น published): ปลดล็อกบทนั้นให้ผู้ใช้ที่ completed บท published ก่อนหน้า (sort_order น้อยกว่าที่ใกล้ที่สุด) แล้ว; ถ้าเป็นบทแรกของคอร์ส ปลดล็อกให้ผู้ลงทะเบียนทุกคน
  - `quiz_answer_keys.correct_choice_id` ต้องเป็นตัวเลือกของ `question_id` เดียวกัน (ทริกเกอร์ raise `INVALID_ANSWERS`)

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลว** `005_content_rules.test.sql`

```sql
-- test_cannot_insert_as_published
select throws_ok($$ insert into lessons(course_id, slug, title, sort_order, status) values (:'c', 'x', 'x', 99, 'published') $$, 'P0001', 'LESSON_INCOMPLETE');
-- test_cannot_publish_without_questions
select throws_ok($$ update lessons set status = 'published' where id = :'empty_draft' $$, 'P0001', 'LESSON_INCOMPLETE');
-- test_cannot_publish_question_without_key
select throws_ok($$ update lessons set status = 'published' where id = :'draft_missing_key' $$, 'P0001', 'LESSON_INCOMPLETE');
-- test_cannot_publish_question_with_one_choice
select throws_ok($$ update lessons set status = 'published' where id = :'draft_one_choice' $$, 'P0001', 'LESSON_INCOMPLETE');
-- test_complete_draft_publishes
select lives_ok($$ update lessons set status = 'published' where id = :'draft_ok' $$);
-- test_cannot_delete_lesson_with_learners
select throws_ok($$ delete from lessons where id = :'l_with_attempts' $$, 'P0001', 'LESSON_HAS_LEARNERS');
-- test_can_delete_untouched_lesson
select lives_ok($$ delete from lessons where id = :'l_untouched' $$);
-- test_publish_unlocks_for_learners_past_previous_lesson (FR-03.5): :a completed sort 1, :b ยังไม่
update lessons set status = 'published' where id = :'inserted_sort_2';
select isnt_empty($$ select 1 from lesson_progress where user_id = :'a' and lesson_id = :'inserted_sort_2' $$);
select is_empty  ($$ select 1 from lesson_progress where user_id = :'b' and lesson_id = :'inserted_sort_2' $$);
-- test_answer_key_must_belong_to_question
select throws_ok($$ insert into quiz_answer_keys values (:'q1', :'choice_of_q2') $$, 'P0001', 'INVALID_ANSWERS');
```

- [ ] **Step 2:** รัน `supabase test db` — Expected: FAIL ที่ `005`
- [ ] **Step 3:** เขียน migration
- [ ] **Step 4:** รัน `supabase db reset && supabase test db` — Expected: PASS `001`–`005`; seed ยังโหลดได้ (ลำดับใน seed: คอร์ส → บทเป็น draft → คำถามและเฉลย → เผยแพร่ → สร้างผู้ใช้ทดสอบ เพื่อให้ `handle_new_user` ลงทะเบียนและปลดล็อกบทแรกให้)
- [ ] **Step 5:** Commit `feat(db): enforce lesson publish and delete rules`

---

### Task 7: [Dev] Supabase clients, types และ `/api/health`

**Files:**
- Create: `lib/supabase/server.ts`, `lib/supabase/browser.ts`, `middleware.ts`, `lib/database.types.ts` (generated), `app/api/health/route.ts`

**Interfaces:**
- Produces:
  - `createClient(): Promise<SupabaseClient<Database>>` ใน `lib/supabase/server.ts` (ใช้ `@supabase/ssr` `createServerClient` + `cookies()` ของ Next)
  - `createClient(): SupabaseClient<Database>` ใน `lib/supabase/browser.ts`
  - `middleware.ts` รีเฟรชเซสชันทุก request ยกเว้น `_next/static`, `_next/image`, ไฟล์รูป
  - `GET /api/health` → `200 { ok: true }` เมื่อ `select id from courses limit 1` สำเร็จ (ใช้ anon), `503 { ok: false }` เมื่อผิดพลาด; ตั้ง `export const dynamic = 'force-dynamic'` เพื่อไม่ให้ cache (keep-alive ต้องแตะฐานข้อมูลจริง)

- [ ] **Step 1:** ติดตั้ง `@supabase/supabase-js @supabase/ssr`; รัน `npm run db:types` — Expected: ได้ `lib/database.types.ts` ที่มี `submit_quiz` ใน `Functions`
- [ ] **Step 2:** เขียนไฟล์ทั้งหมดตาม Interfaces; `.env.local` ใช้ค่าจาก `supabase status`
- [ ] **Step 3:** รัน `npm run typecheck && npm run build` — Expected: exit code 0
- [ ] **Step 4:** รัน `npm run dev` แล้ว `curl -s localhost:3000/api/health` — Expected: `{"ok":true}`; หยุด Supabase (`supabase stop`) แล้ว curl อีกครั้ง — Expected: HTTP 503
- [ ] **Step 5:** Commit `feat: add supabase clients and health endpoint`

---

### Task 8: [QA] เฟรมเวิร์ก Playwright

**Files:**
- Create: `playwright.config.ts`, `e2e/utils/supabaseAdmin.ts`, `e2e/utils/env.ts`, `e2e/fixtures/index.ts`, `e2e/api/health.spec.ts`

**Interfaces:**
- Consumes: `/api/health` (Task 7), `handle_new_user` (Task 3)
- Produces:
  - `e2e/utils/env.ts`: `env.baseURL`, `env.supabaseUrl`, `env.anonKey`, `env.serviceRoleKey` — throw ถ้าไม่มีค่า
  - `e2e/utils/supabaseAdmin.ts`:
    - `createTestUser(opts?: { role?: 'member' | 'admin'; displayName?: string }): Promise<TestUser>` — อีเมล `qa+<uuid>@fretpath.test`, รหัสสุ่ม, `email_confirm: true`
    - `deleteTestUser(id: string): Promise<void>`
    - `type TestUser = { id: string; email: string; password: string; role: 'member' | 'admin' }`
  - `e2e/fixtures/index.ts` export `test`, `expect` ที่มี fixtures:
    - `member: TestUser`, `otherMember: TestUser`, `admin: TestUser` — สร้างก่อนเทสต์ ลบหลังเทสต์
    - `memberDb: SupabaseClient<Database>`, `otherMemberDb`, `adminDb`, `anonDb` — supabase-js ที่ `signInWithPassword` แล้ว
  - `playwright.config.ts`: `testDir: 'e2e'`, `fullyParallel: true`, `retries: process.env.CI ? 1 : 0`, `reporter: [['html', { open: 'never' }], ['list']]`, `use: { baseURL, trace: 'retain-on-failure', video: 'retain-on-failure', screenshot: 'only-on-failure' }`; projects `chromium`, `firefox`, `mobile` (`devices['Pixel 7']`); `webServer: { command: 'npm run start', url: baseURL + '/api/health', reuseExistingServer: !process.env.CI }`
  - (`storageState` แยกตาม role สำหรับ UI E2E เพิ่มในแผนที่ 2 เมื่อมีหน้า login)

- [ ] **Step 1: เขียนเทสต์** `e2e/api/health.spec.ts`

```ts
test('health endpoint reports database reachable @smoke', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});
test('new test user gets member profile @smoke', async ({ memberDb, member }) => {
  const { data } = await memberDb.from('profiles').select('role').eq('id', member.id).single();
  expect(data?.role).toBe('member');
});
```

- [ ] **Step 2:** ติดตั้ง `@playwright/test` และเบราว์เซอร์ในเครื่อง (`npx playwright install chromium firefox`) แล้วรัน `npx playwright test e2e/api/health.spec.ts --project=chromium` ก่อนเขียน fixtures — Expected: FAIL (`member` fixture ไม่มี)
- [ ] **Step 3:** เขียน utils, fixtures, config
- [ ] **Step 4:** `npm run build` แล้วรัน `npx playwright test e2e/api/health.spec.ts --project=chromium` — Expected: 2 passed; ตรวจใน Supabase Studio ว่าไม่มีผู้ใช้ `qa+…` ค้าง
- [ ] **Step 5:** Commit `test: add playwright framework and smoke tests`

---

### Task 9: [QA] API / Security tests

**Files:**
- Create: `e2e/api/rls.spec.ts`, `e2e/api/submit-quiz.spec.ts`, `e2e/utils/quiz.ts`

**Interfaces:**
- Consumes: fixtures (Task 8), `submit_quiz` (Task 5), seed course `guitar-basics` (Task 3)
- Produces: `e2e/utils/quiz.ts` → `buildAnswers(adminDb, lessonId: string, correctCount: number): Promise<{ question_id: string; choice_id: string }[]>` (อ่านเฉลยด้วยสิทธิ์แอดมิน ใช้เฉพาะในเทสต์); `lessonIdBySlug(db, slug: string): Promise<string>`; `bangkokDate(offsetDays: number): string` (`YYYY-MM-DD` ตามเวลา Asia/Bangkok)
- ตัวแปร `l1` = `lessonIdBySlug(adminDb, 'guitar-anatomy-tuning')`, `l2` = `lessonIdBySlug(adminDb, 'first-chords')` เตรียมใน `test.beforeAll`

สเปก 6.3 ทุกข้อ + ผูกรหัส TC ไว้ในชื่อเทสต์ (รหัสจาก `docs/qa/test-cases.md`, Task 11)

- [ ] **Step 1: เขียนเทสต์** (ทุกเทสต์ติดป้าย `@security`)

```ts
// rls.spec.ts
test('TC-SEC-01 member cannot read answer keys', async ({ memberDb }) => {
  const { data } = await memberDb.from('quiz_answer_keys').select('*');
  expect(data).toEqual([]);
});
test('TC-SEC-02 member cannot write progress or attempts directly', async ({ memberDb, member }) => {
  const a = await memberDb.from('quiz_attempts').insert({ user_id: member.id, lesson_id: l1, score_pct: 100, passed: true });
  expect(a.error?.code).toBe('42501');
  const p = await memberDb.from('lesson_progress').insert({ user_id: member.id, lesson_id: l2, status: 'unlocked' });
  expect(p.error?.code).toBe('42501');
});
test('TC-SEC-03 member cannot promote self to admin', async ({ memberDb, member }) => {
  const r = await memberDb.from('profiles').update({ role: 'admin' }).eq('id', member.id);
  expect(r.error).not.toBeNull();
  const rpc = await memberDb.rpc('set_user_role', { p_user: member.id, p_role: 'admin' });
  expect(rpc.error?.message).toContain('NOT_ADMIN');
});
test('TC-SEC-04 member cannot read another member practice logs', async ({ memberDb, otherMemberDb, otherMember }) => {
  await otherMemberDb.from('practice_logs').insert({ user_id: otherMember.id, practiced_on: bangkokDate(-1), minutes: 15, activity: 'chords' });
  const { data } = await memberDb.from('practice_logs').select('*').eq('user_id', otherMember.id);
  expect(data).toEqual([]);
});
test('TC-SEC-05 anonymous cannot read lessons', async ({ anonDb }) => {
  expect((await anonDb.from('lessons').select('*')).data).toEqual([]);
});
test('TC-SEC-06 locked lesson shows title but hides content and questions', async ({ memberDb }) => {
  // บท 2 ของ seed ยังล็อกสำหรับผู้ใช้ใหม่
  expect((await memberDb.from('lessons').select('title').eq('id', l2)).data).toHaveLength(1);
  expect((await memberDb.from('lesson_contents').select('*').eq('lesson_id', l2)).data).toEqual([]);
  expect((await memberDb.from('quiz_questions').select('*').eq('lesson_id', l2)).data).toEqual([]);
});
// submit-quiz.spec.ts
test('TC-SEC-07 submit_quiz on locked lesson returns LESSON_LOCKED', …);       // error.message contains 'LESSON_LOCKED'
test('TC-QZ-01 score 40% does not unlock next lesson', …);                     // passed false; lesson_progress บท 2 ไม่มี
test('TC-QZ-02 score 60% at pass_score 60 unlocks next lesson', …);            // passed true; next_lesson_slug 'first-chords'
test('TC-QZ-03 result contains key and explanation for every question', …);   // results.length 5; ทุกข้อมี explanation ไม่ว่าง
test('TC-QZ-04 tampered answers are rejected', …);                             // ขาดข้อ / ข้อซ้ำ → 'INVALID_ANSWERS'
```

- [ ] **Step 2:** รันบนฐานข้อมูลที่ยังไม่มี RLS (checkout migration ถึง Task 3 หรือรันก่อน Dev merge Task 4) เพื่อยืนยันว่าเทสต์จับได้จริง — Expected: TC-SEC-01..06 FAIL; ถ้าทำไม่ได้ ให้บันทึกเหตุผลไว้ใน PR
- [ ] **Step 3:** เขียน `e2e/utils/quiz.ts` และเติมส่วนที่เหลือของเทสต์
- [ ] **Step 4:** รัน `npx playwright test e2e/api --project=chromium` บนฐานข้อมูลที่มี migration ครบ — Expected: ทั้งหมด passed
- [ ] **Step 5:** Commit `test: add RLS and submit_quiz security tests`

---

### Task 10: [QA] CI บน Pull Request

**Files:**
- Create: `.github/workflows/ci.yml`, `docs/qa/ci.md`

**Interfaces:**
- Consumes: npm scripts (Task 1), `supabase test db` (Task 2–6), Playwright (Task 8–9)
- Produces: job `ci` ชื่อ check `ci` (ใช้ตั้ง branch protection)

ขั้นตอนใน job (ubuntu-latest, Node จาก `.nvmrc`): `npm ci` → `supabase/setup-cli@v1` → `supabase start` → `supabase test db` → `npm run lint` → `npm run typecheck` → ตั้ง env จาก `supabase status -o env` → `npm run build` → `npx playwright install --with-deps chromium` → `npx playwright test --project=chromium --grep "@smoke|@security"` → อัปโหลด `playwright-report/` เป็น artifact ทุกครั้ง (`if: always()`, เก็บ 14 วัน). trigger: `pull_request` ไป `main` และ `push` ไป `main`; `concurrency` ยกเลิกรันเก่าของ PR เดียวกัน

- [ ] **Step 1:** เขียน `ci.yml`
- [ ] **Step 2:** เปิด PR ทดสอบที่ทำให้ `TC-SEC-01` ล้ม (เช่น เพิ่ม policy อ่าน `quiz_answer_keys` ชั่วคราว) — Expected: check `ci` แดง และมี report ให้ดาวน์โหลด; ปิด PR นั้นทิ้ง
- [ ] **Step 3:** PR จริงของ Task นี้ — Expected: check `ci` เขียว
- [ ] **Step 4:** ตั้ง branch protection บน `main` (Settings → Branches): require PR, require 1 approval, require status check `ci`; บันทึกขั้นตอนและภาพหน้าจอใน `docs/qa/ci.md`
- [ ] **Step 5:** Commit `ci: run db, smoke and security tests on pull requests`

---

### Task 11: [QA] Test Plan, เทมเพลต และ Test Cases ชุดแรก (เริ่มได้ทันที)

**Files:**
- Create: `docs/qa/test-plan.md`, `docs/qa/test-cases.md`, `docs/qa/rtm.md`, `.github/ISSUE_TEMPLATE/defect.yml`

**Interfaces:**
- Produces: รูปแบบรหัส TC `TC-<พื้นที่>-<ลำดับ 2 หลัก>`; พื้นที่: `AUTH` (FR-01), `LSN` (FR-02), `PATH` (FR-03), `QZ` (FR-04), `PRC` (FR-05), `DSH` (FR-06), `ADM` (FR-07), `SEC` (NFR-01), `MOB` (NFR-02); คอลัมน์ TC: รหัส | ชื่อ | อ้างอิง FR/NFR | เงื่อนไขก่อนเริ่ม | ขั้นตอน | ผลที่คาดหวัง | ความสำคัญ (High/Medium/Low) | ประเภท (Positive/Negative/Boundary/Security) | เทคนิค | Manual/Automated | ไฟล์เทสต์อัตโนมัติ

- [ ] **Step 1:** `test-plan.md` ตามหัวข้อมาตรฐาน: วัตถุประสงค์, ขอบเขต (ใน/นอก ตามสเปก 2.3), แนวทาง (ระดับเทสต์ตามสเปก 6), เทคนิค (สเปก 6.2), สภาพแวดล้อม (สเปก 6.5), เกณฑ์เริ่ม/จบ (สเปก 6.1), ความเสี่ยงและการรับมือ (อย่างน้อย: Supabase ถูกหยุด, Vercel Hobby จำกัด, Dev คนเดียวเป็นคอขวด, เทสต์ไม่เสถียร), ตารางเวลา (เว้นวันที่ไว้รอกำหนดส่ง), ผลงานที่ส่งมอบ
- [ ] **Step 2:** `defect.yml` ฟิลด์: สรุป, severity (Critical/High/Medium/Low), priority (P1–P3), สภาพแวดล้อม, ขั้นตอนทำซ้ำ, ผลที่คาดหวัง, ผลจริง, หลักฐาน, รหัส TC ที่เกี่ยวข้อง; label `bug`
- [ ] **Step 3:** `test-cases.md` เขียน TC สำหรับ FR-03, FR-04 และ NFR-01 ครบทุกข้อ (ต้องมีอย่างน้อยตาม Task 9 และ decision table ในสเปก 6.2); TC ของ FR-01, 02, 05, 06, 07 เขียนต่อระหว่างแผนที่ 2–3
- [ ] **Step 4:** `rtm.md` แถวละ 1 requirement (FR-01.1 … FR-07.9, NFR-01 … NFR-07) คอลัมน์: requirement | ระดับ | TC | สถานะ — ตรวจว่าทุกข้อของ FR-03, FR-04, NFR-01 มี TC
- [ ] **Step 5:** Commit `docs(qa): add test plan, defect template and first test cases`

---

## เมื่อจบแผนที่ 1
- `supabase test db` ผ่าน 5 ไฟล์, Playwright `@smoke` + `@security` ผ่าน, check `ci` บังคับใช้บน `main`
- ขั้นต่อไป: เขียนแผนที่ 2 (หน้าเว็บผู้เรียน) โดยใช้ Interfaces จากแผนนี้
