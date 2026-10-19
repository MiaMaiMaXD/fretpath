# FretPath แผนที่ 2: หน้าเว็บผู้เรียน (FR-01 ถึง FR-06) + E2E

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ผู้เรียนใช้งานได้ครบเส้นทาง: สมัคร → ยืนยันอีเมล → เรียนบท → ทำแบบทดสอบ → ปลดล็อกบทถัดไป → บันทึกการฝึก → ดู Dashboard พร้อม Playwright UI E2E ที่พิสูจน์เส้นทางหลักทั้งสามแบบบน Chromium, Firefox และมือถือ

**Architecture:** หน้าเว็บเป็น Server Components อ่านข้อมูลผ่าน `lib/supabase/server.ts` (RLS ของแผนที่ 1 เป็นตัวกันสิทธิ์จริง); การเขียนข้อมูลทำผ่าน Server Actions ที่เรียก Supabase ด้วยเซสชันของผู้ใช้ (ไม่ใช้ service role); ตรรกะล้วน (ตรวจฟอร์ม, แปลรหัส error, วันที่ไทย, สถิติ) อยู่ใน `lib/*.ts` และทดสอบด้วย Vitest; เครื่องมือเสียงทำงานในเบราว์เซอร์ด้วย Web Audio; `proxy.ts` เพิ่มการพาไป `/login?next=` สำหรับหน้าที่ต้องล็อกอิน

**Tech Stack:** Next.js 16 App Router + React 19 + Tailwind 4, `@supabase/ssr`, `react-markdown`, Vitest, Playwright (+ `@axe-core/playwright`), Supabase local (Mailpit สำหรับอีเมลยืนยันใน local/CI)

**Spec:** `docs/superpowers/specs/2026-10-19-fretpath-design.md` (รวมหัวข้อ 9 บันทึกการเปลี่ยนแปลงจากแผนที่ 1)

**ต่อยอดจากแผนที่ 1:** `docs/superpowers/plans/2026-10-19-fretpath-plan-1-foundation.md` — ตาราง, RLS, `submit_quiz`, `bangkok_date`, seed (`guitar-basics` 5 บท; `member@fretpath.test` / `admin@fretpath.test` รหัส `Passw0rd!`), fixtures `e2e/fixtures/index.ts` (`member`, `memberDb`, `adminDb`, `anonDb` …), `e2e/utils/supabaseAdmin.ts` (`createTestUser`, `deleteTestUser`, `adminClient`), `e2e/utils/quiz.ts` (`buildAnswers`, `lessonIdBySlug`, `bangkokDate`)

**ผู้รับผิดชอบ:** Task ที่มีป้าย `[Dev → QA]` — Dev ทำ Step ที่ไม่มีป้าย, QA ทำ Step ที่มีป้าย `(QA)` ใน Task เดียวกันและรีวิว PR; Task 2 เป็นของ QA ทั้งหมด; Task 12 (เอกสาร QA) เริ่มได้ทันทีคู่ขนาน

**ยกไปแผนที่ 3 (ไม่อยู่ในแผนนี้):** FR-01.7 Google (ต้องมี OAuth client ของ production), FR-01.8 รูปโปรไฟล์ (ต้องมี Storage bucket + policy), FR-05.5 เมโทรนอม (C) — RTM ระบุ "รอแผนที่ 3"

## Global Constraints

- ค่าใช้จ่าย 0 บาท: แพ็กเกจที่เพิ่มต้องฟรี/โอเพนซอร์ส; ล็อกเวอร์ชันใน `package-lock.json`; Node.js 22
- TypeScript `strict: true`; `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:unit` ต้องผ่านทุก Task
- ห้ามใช้ `SUPABASE_SERVICE_ROLE_KEY` นอก `e2e/` (NFR-01); Server Actions ใช้ `createClient()` จาก `lib/supabase/server.ts` เท่านั้น
- ข้อความที่ผู้ใช้เห็นทั้งหมดเป็นภาษาไทย รวมข้อความ error (NFR-04); รหัส error จากฐานข้อมูลแปลผ่าน `thaiError()` เท่านั้น
- เขตเวลาของ "วันนี้" และ "สัปดาห์นี้" คือ `Asia/Bangkok` ไม่ใช่เวลาของเบราว์เซอร์; สัปดาห์เริ่มวันจันทร์ 00:00 น.
- ค่าจากสเปก: รหัสผ่าน ≥ 8 ตัวอักษร; `minutes` 1–600; `note` ≤ 500 ตัวอักษร; `weekly_goal_minutes` 0–5000; วันที่ฝึกต้องไม่เป็นวันในอนาคต
- ข้อความที่สเปกกำหนดตายตัว: "อีเมลหรือรหัสผ่านไม่ถูกต้อง", "ถ้ามีบัญชีนี้ เราได้ส่งลิงก์ไปแล้ว", "ต้องผ่านแบบทดสอบบท X ก่อน" (X = ชื่อบทที่ต้องผ่าน), ปุ่ม "ไปบทถัดไป", "จบคอร์สแล้ว", "ทบทวนบทเรียน", "สอบใหม่", "ส่งอีกครั้ง", "ใช้เวลานี้"
- ใช้งานได้ครบที่ความกว้างจอ 375px ขึ้นไป (NFR-02) โดยไม่มี scroll แนวนอน
- ตัวระบุ element ในเทสต์: `getByRole` / `getByLabel` เป็นหลัก; `data-testid` เฉพาะที่ระบุใน Interfaces
- ป้ายเทสต์: `@smoke` (เส้นทางหลัก), `@regression` (ทั้งหมด), `@security`; ชื่อเทสต์ขึ้นต้นด้วยรหัส TC จาก `docs/qa/test-cases.md`

## Review Focus

1. **`next` พาออกนอกเว็บ:** `/login?next=https://evil.example` หรือ `//evil.example` ต้องพากลับ `/dashboard` เสมอ ไม่ redirect ออกนอกโดเมน → Task 1 `safeNextPath`, Task 3 `TC-AUTH-07`
2. **เบราว์เซอร์อยู่คนละเขตเวลา:** ผู้ใช้ที่เครื่องตั้งเวลาเป็น `America/Los_Angeles` เปิดหน้าบันทึกการฝึกตอนบ่ายเวลาไทย ค่าเริ่มต้นและค่าสูงสุดของช่องวันที่ต้องเป็น "วันนี้" ตามเวลาไทย → Task 1 `bangkokToday`, Task 9 `TC-PRC-04`
3. **ส่งแบบทดสอบแล้วเครือข่ายล้ม / กดส่งรัว ๆ:** คำตอบที่เลือกไว้ต้องอยู่ครบ มีปุ่ม "ส่งอีกครั้ง" และการกดซ้ำระหว่างรอต้องสร้าง attempt เพียง 1 แถว → Task 8 `TC-QZ-22`, `TC-QZ-23`
4. **ตัวจับเวลาเมื่อแท็บถูกพัก/ยาวเกิน:** เวลาที่จับต้องคำนวณจาก timestamp ไม่ใช่นับ tick; "ใช้เวลานี้" ปัดเป็นนาทีใกล้สุด ต่ำสุด 1 สูงสุด 600 → Task 1 `minutesFromElapsed`, Task 9
5. **ขอบสัปดาห์:** บันทึกวันอาทิตย์ต้องไม่ถูกนับใน "นาทีฝึกสัปดาห์นี้" ของวันจันทร์ถัดไป และบันทึกวันจันทร์ 00:xx น. เวลาไทยต้องถูกนับ → Task 1 `bangkokWeekRange`, Task 10 `weeklyMinutes`

---

## โครงสร้างไฟล์

```
lib/
  bangkok.ts          วันที่/สัปดาห์ตาม Asia/Bangkok (ล้วน, ไม่มี I/O)
  errors.ts           thaiError(code) — รหัส DB/Auth → ข้อความไทย
  validation.ts       ตรวจฟอร์ม auth / profile / practice
  safe-next.ts        safeNextPath(next)
  site-url.ts         siteUrl()
  path-state.ts       สถานะบทและข้อความ "ต้องผ่าน…" (ล้วน)
  quiz.ts             type QuizResult/QuizQuestion + isComplete(), unansweredIds()
  stats.ts            ตัวเลข Dashboard (ล้วน)
  timer.ts            minutesFromElapsed()
  audio/strings.ts    ความถี่สายเปล่า + pluck() (Web Audio)
  audio/chords.ts     ข้อมูลคอร์ด
  data/*.ts           อ่านข้อมูลจาก Supabase ฝั่งเซิร์ฟเวอร์ (path, lesson, quiz, practice, profile, dashboard)
app/
  (auth)/login, signup, forgot-password, reset-password    หน้า + actions.ts
  auth/callback/route.ts                                    แลก code เป็นเซสชัน
  (learner)/layout.tsx                                      แถบนำทาง + ปุ่มออกจากระบบ
  (learner)/dashboard, path, lessons/[slug], lessons/[slug]/quiz, practice, profile
  error.tsx, not-found.tsx, loading.tsx
components/            UI ที่ใช้ซ้ำ (Field, SubmitButton, StringPlayer, ChordLab, BarChart …)
tests/unit/*.test.ts   Vitest
e2e/pages/*.ts         Page Objects
e2e/auth.setup.ts, e2e/auth.teardown.ts                     storageState ตาม role
e2e/utils/mailpit.ts   อ่านอีเมลยืนยัน/รีเซ็ตจาก Mailpit
e2e/specs/*.spec.ts    UI E2E แยกตาม FR
```

---

### Task 1: [Dev] Vitest และตรรกะล้วนที่ทุกหน้าใช้

**Files:**
- Create: `vitest.config.ts`, `lib/bangkok.ts`, `lib/errors.ts`, `lib/validation.ts`, `lib/safe-next.ts`, `lib/site-url.ts`, `lib/timer.ts`, `tests/unit/{bangkok,errors,validation,safe-next,timer}.test.ts`
- Modify: `package.json` (script `test:unit` = `vitest run`), `.github/workflows/ci.yml` (step `npm run test:unit` ต่อจาก typecheck), `.env.example` (`NEXT_PUBLIC_SITE_URL`)

**Interfaces:**
- Produces:
  - `bangkokToday(now?: Date): string` — `YYYY-MM-DD` ตามเวลาไทย
  - `bangkokWeekRange(now?: Date): { start: string; end: string }` — วันจันทร์ถึงวันอาทิตย์ (`YYYY-MM-DD`) ของสัปดาห์ที่มี "วันนี้"
  - `bangkokLastDays(n: number, now?: Date): string[]` — n วันล่าสุดเรียงเก่า→ใหม่ จบที่วันนี้
  - `type ErrorCode = 'NOT_AUTHENTICATED' | 'LESSON_LOCKED' | 'INVALID_ANSWERS' | 'LESSON_INCOMPLETE' | 'LESSON_HAS_LEARNERS' | 'FUTURE_DATE' | 'NOT_ADMIN' | 'INVALID_CREDENTIALS' | 'EMAIL_NOT_CONFIRMED' | 'NETWORK' | 'UNKNOWN'`
  - `thaiError(code: string): string` — รหัสที่ไม่รู้จักได้ข้อความของ `UNKNOWN`
  - `errorCodeFrom(e: { message?: string; code?: string } | null): ErrorCode` — หา `ErrorCode` จาก error ของ PostgREST/Auth (ข้อความ DB เป็นชื่อรหัสตรง ๆ; Auth `invalid_credentials` → `INVALID_CREDENTIALS`, `email_not_confirmed` → `EMAIL_NOT_CONFIRMED`)
  - `type FieldErrors = Partial<Record<string, string>>`
  - `validateCredentials(input: { email: string; password: string }): FieldErrors`
  - `validateProfile(input: { displayName: string; weeklyGoalMinutes: string }): FieldErrors`
  - `validatePractice(input: { practicedOn: string; minutes: string; activity: string; note: string }, today: string): FieldErrors`
  - `safeNextPath(next: string | null | undefined): string` — คืน `next` เมื่อขึ้นต้นด้วย `/` และไม่ขึ้นต้นด้วย `//` หรือ `/\`; ไม่เช่นนั้นคืน `/dashboard`
  - `siteUrl(): string` — `process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'` ตัด `/` ท้าย
  - `minutesFromElapsed(ms: number): number` — ปัดเป็นนาทีใกล้สุด, ต่ำสุด 1, สูงสุด 600

ข้อความไทยตายตัว (ใช้ตรงตัว):

| รหัส / ช่อง | ข้อความ |
|---|---|
| `NOT_AUTHENTICATED` | กรุณาเข้าสู่ระบบก่อน |
| `LESSON_LOCKED` | บทเรียนนี้ยังล็อกอยู่ |
| `INVALID_ANSWERS` | กรุณาตอบให้ครบทุกข้อ |
| `LESSON_INCOMPLETE` | บทเรียนนี้ยังไม่พร้อมให้ทำแบบทดสอบ |
| `LESSON_HAS_LEARNERS` | ลบบทนี้ไม่ได้เพราะมีผู้เรียนแล้ว |
| `FUTURE_DATE` | วันที่ต้องไม่เป็นวันในอนาคต |
| `NOT_ADMIN` | เฉพาะผู้ดูแลระบบเท่านั้น |
| `INVALID_CREDENTIALS` | อีเมลหรือรหัสผ่านไม่ถูกต้อง |
| `EMAIL_NOT_CONFIRMED` | กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ |
| `NETWORK` | เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่ |
| `UNKNOWN` | เกิดข้อผิดพลาด กรุณาลองใหม่ |
| `email` | รูปแบบอีเมลไม่ถูกต้อง |
| `password` | รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร |
| `displayName` | ชื่อที่แสดงต้องยาว 1–50 ตัวอักษร |
| `weeklyGoalMinutes` | เป้าหมายต้องเป็นจำนวนเต็ม 0–5000 นาที |
| `practicedOn` (ว่าง/รูปแบบผิด) | กรุณาเลือกวันที่ |
| `practicedOn` (อนาคต) | ข้อความของ `FUTURE_DATE` |
| `minutes` | จำนวนนาทีต้องเป็นจำนวนเต็ม 1–600 |
| `activity` | กรุณาเลือกหัวข้อที่ฝึก |
| `note` | บันทึกสั้นต้องไม่เกิน 500 ตัวอักษร |

- [ ] **Step 1: ติดตั้ง `vitest` (devDependency) และเขียนเทสต์ที่ล้มเหลว**

```ts
// bangkok.test.ts
expect(bangkokToday(new Date('2026-10-19T17:30:00Z'))).toBe('2026-10-20');   // 00:30 น. ไทย
expect(bangkokToday(new Date('2026-10-19T16:59:00Z'))).toBe('2026-10-19');
expect(bangkokWeekRange(new Date('2026-10-18T17:05:00Z'))).toEqual({ start: '2026-10-19', end: '2026-10-25' }); // จันทร์ 00:05 ไทย
expect(bangkokWeekRange(new Date('2026-10-18T16:55:00Z'))).toEqual({ start: '2026-10-12', end: '2026-10-18' }); // อาทิตย์ 23:55 ไทย
expect(bangkokLastDays(7, new Date('2026-11-02T05:00:00Z'))).toEqual(['2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01','2026-11-02']);
// errors.test.ts
expect(thaiError('LESSON_LOCKED')).toBe('บทเรียนนี้ยังล็อกอยู่');
expect(thaiError('SOMETHING_ELSE')).toBe('เกิดข้อผิดพลาด กรุณาลองใหม่');
expect(errorCodeFrom({ message: 'FUTURE_DATE' })).toBe('FUTURE_DATE');
expect(errorCodeFrom({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe('INVALID_CREDENTIALS');
// validation.test.ts — boundary ตามสเปก
expect(validateCredentials({ email: 'a@b.co', password: '1234567' }).password).toBeDefined();
expect(validateCredentials({ email: 'a@b.co', password: '12345678' })).toEqual({});
expect(validateCredentials({ email: 'not-an-email', password: '12345678' }).email).toBe('รูปแบบอีเมลไม่ถูกต้อง');
for (const [m, ok] of [['0', false], ['1', true], ['600', true], ['601', false], ['1.5', false]] as const)
  expect(validatePractice({ practicedOn: '2026-10-19', minutes: m, activity: 'chords', note: '' }, '2026-10-19').minutes === undefined).toBe(ok);
expect(validatePractice({ practicedOn: '2026-10-20', minutes: '10', activity: 'chords', note: '' }, '2026-10-19').practicedOn).toBe('วันที่ต้องไม่เป็นวันในอนาคต');
expect(validatePractice({ practicedOn: '2026-10-19', minutes: '10', activity: 'chords', note: 'ก'.repeat(501) }, '2026-10-19').note).toBeDefined();
expect(validateProfile({ displayName: 'มิว', weeklyGoalMinutes: '5001' }).weeklyGoalMinutes).toBeDefined();
expect(validateProfile({ displayName: '', weeklyGoalMinutes: '0' }).displayName).toBeDefined();
// safe-next.test.ts (Review Focus 1)
expect(safeNextPath('/path?x=1')).toBe('/path?x=1');
for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '', null, undefined])
  expect(safeNextPath(bad)).toBe('/dashboard');
// timer.test.ts (Review Focus 4)
expect(minutesFromElapsed(0)).toBe(1);
expect(minutesFromElapsed(89_000)).toBe(1);
expect(minutesFromElapsed(91_000)).toBe(2);
expect(minutesFromElapsed(11 * 60 * 60 * 1000)).toBe(600);
```

- [ ] **Step 2:** รัน `npm run test:unit` — Expected: FAIL (ไม่มีโมดูล)
- [ ] **Step 3:** เขียนไฟล์ใน `lib/` ตาม Interfaces (วันที่ไทยใช้ `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' })`; ห้ามใช้เวลาเครื่อง); ความยาวข้อความนับด้วย `[...str].length`
- [ ] **Step 4:** รัน `npm run test:unit && npm run lint && npm run typecheck` — Expected: ผ่านทั้งหมด
- [ ] **Step 5:** Commit `feat: add shared validation, Thai errors and Bangkok date helpers`

---

### Task 2: [QA] โครง Playwright สำหรับ UI E2E

**Files:**
- Create: `e2e/auth.setup.ts`, `e2e/auth.teardown.ts`, `e2e/utils/mailpit.ts`, `e2e/pages/{LoginPage,SignupPage,PathPage,LessonPage,QuizPage,PracticePage,DashboardPage,ProfilePage}.ts`
- Modify: `supabase/config.toml` (`[auth] site_url = "http://localhost:3000"`, `additional_redirect_urls = ["http://localhost:3000/**", "http://127.0.0.1:3000/**"]`; `[auth.email] enable_confirmations = true`), `playwright.config.ts`, `e2e/fixtures/index.ts`, `e2e/utils/supabaseAdmin.ts`, `package.json` (`@axe-core/playwright` devDependency)

**Interfaces:**
- Consumes: fixtures/utils ของแผนที่ 1
- Produces:
  - `playwright.config.ts`: project `setup` (`testMatch: /auth\.setup\.ts/`, `teardown: 'teardown'`), project `teardown` (`testMatch: /auth\.teardown\.ts/`); `chromium`, `firefox`, `mobile` มี `dependencies: ['setup']`; ค่าอื่นคงเดิม
  - `auth.setup.ts`: สร้างผู้ใช้ `createTestUser()` 1 คน (member) ล็อกอินผ่าน `LoginPage` แล้วบันทึก `e2e/.auth/member.json`; บันทึก id ไว้ที่ `e2e/.auth/users.json` ให้ teardown ลบ
  - `export const MEMBER_STATE = 'e2e/.auth/member.json'` ใน `e2e/fixtures/index.ts` — ใช้กับเทสต์ที่อ่านอย่างเดียวผ่าน `test.use({ storageState: MEMBER_STATE })`
  - fixture ใหม่ `memberPage: Page` — ผู้ใช้ใหม่ (fixture `member`) ที่ล็อกอินผ่าน UI แล้ว ใช้กับเทสต์ที่เปลี่ยนข้อมูล (สอบ, บันทึกการฝึก)
  - `e2e/utils/mailpit.ts`: `latestLinkFor(email: string, opts?: { contains?: string; timeoutMs?: number }): Promise<string>` — poll `http://127.0.0.1:54324/api/v1/search?query=to:"<email>"` จนเจอ แล้วคืน URL แรกในเนื้อหาที่มี `contains` (ค่าเริ่มต้น `/auth/v1/verify`); `MAILPIT_URL` override ได้ผ่าน env
  - `supabaseAdmin.ts`: `deleteUserByEmail(email: string): Promise<void>` (สำหรับผู้ใช้ที่สมัครผ่าน UI)
  - Page Objects — เมธอดหลัก (ใช้ label/ปุ่มตาม Interfaces ของแต่ละ Task):
    - `LoginPage`: `goto(next?: string)`, `login(email, password)`
    - `SignupPage`: `goto()`, `signup(email, password)`
    - `PathPage`: `goto()`, `lessonState(slug): Promise<'locked'|'unlocked'|'completed'>` (อ่าน `data-state` ของ `data-testid="lesson-card-<slug>"`), `notice(): Locator`
    - `LessonPage`: `goto(slug)`, `startQuiz()`
    - `QuizPage`: `goto(slug)`, `answerAll(choiceIndexByQuestion: number[])`, `submit()`, `score(): Promise<number>`
    - `PracticePage`: `goto()`, `fill({ date?, minutes, activity, note? })`, `save()`, `rows(): Locator`
    - `DashboardPage`: `goto()`, `stat(name: 'lessons' | 'avg-score' | 'week-minutes'): Locator`
    - `ProfilePage`: `goto()`, `save({ displayName, weeklyGoalMinutes })`

- [ ] **Step 1:** แก้ `config.toml` แล้ว `npx supabase stop && npx supabase start` — Expected: `npx supabase test db` ยังผ่าน 112 ข้อ และ `npx playwright test e2e/api --project=chromium` ยังผ่าน (ผู้ใช้จาก seed และ `createTestUser` ยืนยันอีเมลแล้ว)
- [ ] **Step 1b:** เขียน `mailpit.ts` และทดสอบกับ Mailpit จริง: เรียก `supabase.auth.signUp` ด้วย anon client (อีเมล `qa+<uuid>@fretpath.test`) แล้ว `latestLinkFor` — Expected: ได้ URL ที่มี `/auth/v1/verify` แล้วลบผู้ใช้ด้วย `deleteUserByEmail`
- [ ] **Step 2:** เขียน config, setup/teardown, fixture `memberPage` และ Page Objects (เมธอดที่ต้องใช้หน้าจากแผนนี้จะผ่านเมื่อ Task นั้นเสร็จ)
- [ ] **Step 3:** รัน `npx playwright test e2e/api --project=chromium` — Expected: 13 passed เหมือนเดิม และ setup/teardown รันโดยไม่มีผู้ใช้ `qa+…` ค้าง
- [ ] **Step 4:** Commit `test: add page objects, auth setup project and mailpit helper`

---

### Task 3: [Dev → QA] สมัคร, ยืนยันอีเมล, ล็อกอิน, ลืมรหัส (FR-01.1–01.4) และการกันหน้า

**Files:**
- Modify: `proxy.ts`, `app/page.tsx`
- Create: `lib/action-state.ts`, `app/(auth)/{login,signup,forgot-password,reset-password}/page.tsx`, `app/(auth)/actions.ts`, `app/auth/callback/route.ts`, `app/(learner)/layout.tsx`, `app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx`, `components/{Field,SubmitButton,FormMessage}.tsx`, `e2e/specs/auth.spec.ts`

**Interfaces:**
- Consumes: Task 1 (`validateCredentials`, `thaiError`, `errorCodeFrom`, `safeNextPath`, `siteUrl`)
- Produces:
  - `type ActionState = { ok: boolean; message?: string; fieldErrors?: FieldErrors }` ใน `lib/action-state.ts` (Task 4, 9 import จากที่นี่)
  - Server Actions (`useActionState`): `signUp`, `signIn`, `signOut`, `requestPasswordReset`, `updatePassword` — `signUp` ใช้ `emailRedirectTo: siteUrl() + '/auth/callback?next=/dashboard'`; `requestPasswordReset` ใช้ `redirectTo: siteUrl() + '/auth/callback?next=/reset-password'` และตอบ "ถ้ามีบัญชีนี้ เราได้ส่งลิงก์ไปแล้ว" เสมอไม่ว่าอีเมลมีอยู่หรือไม่; `signIn` สำเร็จ → `redirect(safeNextPath(next))`
  - `GET /auth/callback?code=&next=` → `exchangeCodeForSession(code)` แล้ว redirect `safeNextPath(next)`; ล้มเหลว → `/login?error=link`
  - `proxy.ts`: path ที่ขึ้นต้นด้วย `/dashboard`, `/path`, `/lessons`, `/practice`, `/profile`, `/reset-password` และไม่มีผู้ใช้ → redirect `/login?next=<pathname+search>`; ผู้ใช้ที่ล็อกอินแล้วเปิด `/login` หรือ `/signup` → `/dashboard`
  - ป้ายฟอร์ม: "อีเมล", "รหัสผ่าน", "รหัสผ่านใหม่"; ปุ่ม: "สมัครสมาชิก", "เข้าสู่ระบบ", "ออกจากระบบ" (ใน `(learner)/layout.tsx`), "ส่งลิงก์ตั้งรหัสผ่านใหม่", "ตั้งรหัสผ่านใหม่"; หลังสมัคร: "เราส่งลิงก์ยืนยันไปที่อีเมลของคุณแล้ว"; `/login?error=link`: "ลิงก์หมดอายุหรือใช้แล้ว กรุณาขอใหม่"
  - แถบนำทางผู้เรียน: ลิงก์ "Dashboard", "เส้นทางเรียน", "บันทึกการฝึก", "โปรไฟล์"
  - `app/page.tsx` หน้าแรก: ชื่อคอร์ส, ปุ่ม "เริ่มเรียนฟรี" (→ `/signup`) และ "เข้าสู่ระบบ"
  - `error.tsx` "เกิดข้อผิดพลาด" + ปุ่ม "ลองใหม่" (`reset()`); `not-found.tsx` "ไม่พบหน้าที่คุณต้องการ" + ลิงก์กลับหน้าแรก

- [ ] **Step 1:** ตรวจว่า Task 2 เปิด `enable_confirmations` แล้ว (`grep enable_confirmations supabase/config.toml`)
- [ ] **Step 2 (QA): เขียนเทสต์ที่ล้มเหลว** `e2e/specs/auth.spec.ts`

```ts
test('TC-AUTH-01 signup, confirm email, land on dashboard with lesson 1 unlocked @smoke', …);
  // SignupPage.signup(qa+uuid, 'Passw0rd!') → เห็น "เราส่งลิงก์ยืนยันไปที่อีเมลของคุณแล้ว"
  // page.goto(await latestLinkFor(email)) → URL /dashboard; PathPage.lessonState('guitar-anatomy-tuning') === 'unlocked'
  // finally: deleteUserByEmail(email)
test('TC-AUTH-02 password shorter than 8 shows Thai error under field', …);   // '1234567' → "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร"
test('TC-AUTH-03 unconfirmed account cannot log in', …);                       // "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ"
test('TC-AUTH-04 wrong password shows generic message @smoke', …);            // member + 'wrongpass1' → "อีเมลหรือรหัสผ่านไม่ถูกต้อง"; อีเมลที่ไม่มีอยู่ → ข้อความเดียวกัน
test('TC-AUTH-05 logout returns to home and protects pages', …);              // กด "ออกจากระบบ" → /dashboard พาไป /login?next=%2Fdashboard
test('TC-AUTH-06 forgot password always shows same message and reset works', …);
  // อีเมลไม่มีอยู่ → "ถ้ามีบัญชีนี้ เราได้ส่งลิงก์ไปแล้ว"; member → ข้อความเดียวกัน → ลิงก์ใน Mailpit (contains '/auth/v1/verify') → /reset-password
  // ตั้ง 'NewPassw0rd!' → ล็อกอินด้วยรหัสใหม่ได้
test('TC-AUTH-07 next parameter never leaves the site', …);                   // Review Focus 1: /login?next=https://evil.example → หลังล็อกอิน URL เป็น /dashboard
test('TC-AUTH-08 expired session returns to original page after login', …);   // ไม่มีคุกกี้ เปิด /practice → /login?next=%2Fpractice → login → /practice
```

- [ ] **Step 3:** รัน `npm run build && npx playwright test e2e/specs/auth.spec.ts --project=chromium` — Expected: FAIL (ไม่มีหน้า)
- [ ] **Step 4:** เขียนหน้า, actions, callback, proxy, layout ตาม Interfaces (ข้อความ error แสดงใต้ช่องด้วย `aria-describedby`; ปุ่มส่งถูกปิดระหว่าง pending)
- [ ] **Step 5:** รันซ้ำ — Expected: 8 passed; `npm run test:unit && npm run lint && npm run typecheck` ผ่าน
- [ ] **Step 6:** Commit `feat: add sign up, email confirmation, login and password reset`

---

### Task 4: [Dev → QA] โปรไฟล์ (FR-01.5)

**Files:**
- Create: `app/(learner)/profile/{page.tsx,actions.ts}`, `lib/data/profile.ts`, `e2e/specs/profile.spec.ts`

**Interfaces:**
- Consumes: `validateProfile`, `ActionState`
- Produces:
  - `getMyProfile(): Promise<{ id: string; displayName: string; weeklyGoalMinutes: number; email: string }>` ใน `lib/data/profile.ts` (Task 10 ใช้)
  - Server Action `updateProfile(prev: ActionState, form: FormData): Promise<ActionState>` — update เฉพาะ `display_name`, `weekly_goal_minutes`; สำเร็จ → `{ ok: true, message: 'บันทึกแล้ว' }`
  - ป้าย: "ชื่อที่แสดง", "เป้าหมายนาทีฝึกต่อสัปดาห์"; ปุ่ม "บันทึก"; อีเมลแสดงแบบอ่านอย่างเดียว

- [ ] **Step 1 (QA):** `profile.spec.ts`

```ts
test('TC-AUTH-09 member updates display name and weekly goal', …);  // memberPage: 'มิว', 120 → "บันทึกแล้ว"; reload ค่ายังอยู่
test('TC-AUTH-10 weekly goal boundaries', …);                        // 5001 และ -1 → "เป้าหมายต้องเป็นจำนวนเต็ม 0–5000 นาที"; 0 และ 5000 บันทึกได้
```

- [ ] **Step 2:** รัน — Expected: FAIL
- [ ] **Step 3:** เขียนหน้าและ action
- [ ] **Step 4:** รัน `npx playwright test e2e/specs/profile.spec.ts --project=chromium` — Expected: 2 passed
- [ ] **Step 5:** Commit `feat: add profile page`

---

### Task 5: [Dev → QA] เส้นทางการเรียน (FR-03.1, 03.2, 03.4)

**Files:**
- Create: `lib/path-state.ts`, `lib/data/path.ts`, `app/(learner)/path/page.tsx`, `components/LessonCard.tsx`, `tests/unit/path-state.test.ts`, `e2e/specs/path.spec.ts`

**Interfaces:**
- Produces:
  - `type LessonState = 'locked' | 'unlocked' | 'completed'`
  - `type PathLesson = { id: string; slug: string; title: string; summary: string | null; sortOrder: number; passScore: number; state: LessonState; bestScore: number | null }`
  - `toPathLessons(lessons: { id; slug; title; summary; sort_order; pass_score }[], progress: { lesson_id; status; best_score }[]): PathLesson[]` (ล้วน; เรียงตาม `sortOrder`; ไม่มีแถว progress = `locked`)
  - `lockedNotice(lessons: PathLesson[], slug: string): string | null` — `"ต้องผ่านแบบทดสอบบท <ชื่อบทก่อนหน้าที่ยังไม่ completed ซึ่งใกล้ที่สุด> ก่อน"`; คืน null ถ้าบทนั้นไม่ล็อกหรือไม่พบ
  - `getPath(): Promise<{ course: { slug: string; title: string }; lessons: PathLesson[] } | null>` ใน `lib/data/path.ts` — คอร์สแรกที่ผู้ใช้ลงทะเบียน (เรียง `courses.sort_order`); null ถ้าไม่มี (Task 6, 10 ใช้)
  - หน้า `/path`: การ์ดต่อบท `data-testid="lesson-card-<slug>"` + `data-state="<state>"`, ป้ายสถานะ "ล็อก" / "เรียนได้" / "จบแล้ว", แสดง `pass_score` และคะแนนสูงสุด; บทที่ล็อกไม่มีลิงก์; `?locked=<slug>` แสดง `lockedNotice` ใน `role="alert"`

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลว** `path-state.test.ts`

```ts
const lessons = [l(1, 'a', 'บท A'), l(2, 'b', 'บท B'), l(3, 'c', 'บท C')];
expect(toPathLessons(lessons, [{ lesson_id: 'a', status: 'completed', best_score: 80 }, { lesson_id: 'b', status: 'unlocked', best_score: 40 }])
  .map(x => x.state)).toEqual(['completed', 'unlocked', 'locked']);
expect(lockedNotice(toPathLessons(lessons, [{ lesson_id: 'a', status: 'unlocked', best_score: null }]), 'c')).toBe('ต้องผ่านแบบทดสอบบท บท B ก่อน');
expect(lockedNotice(toPathLessons(lessons, [{ lesson_id: 'a', status: 'unlocked', best_score: null }]), 'a')).toBeNull();
```

- [ ] **Step 2 (QA):** `path.spec.ts`

```ts
test('TC-PATH-14 new learner sees lesson 1 unlocked and others locked @smoke', …); // storageState MEMBER_STATE: 5 การ์ด, บท 1 'unlocked', บท 2–5 'locked', ป้ายภาษาไทย
test('TC-PATH-15 locked card has no link to content', …);                         // การ์ดบท 2 ไม่มี role=link
```

- [ ] **Step 3:** รันทั้งสองชุด — Expected: FAIL
- [ ] **Step 4:** เขียน `lib/path-state.ts`, `lib/data/path.ts`, หน้า `/path`
- [ ] **Step 5:** รัน `npm run test:unit` และ `npx playwright test e2e/specs/path.spec.ts --project=chromium` — Expected: ผ่าน
- [ ] **Step 6:** Commit `feat: add learning path page`

---

### Task 6: [Dev → QA] หน้าบทเรียน (FR-02.1, 02.2) และการกันบทที่ล็อก (FR-03.4)

**Files:**
- Create: `lib/data/lesson.ts`, `lib/youtube.ts`, `app/(learner)/lessons/[slug]/page.tsx`, `components/{LessonMarkdown,YouTubeEmbed}.tsx`, `tests/unit/youtube.test.ts`, `e2e/specs/lesson.spec.ts`
- Modify: `package.json` (`react-markdown`)

**Interfaces:**
- Consumes: `getPath`, `lockedNotice`
- Produces:
  - `getLessonForLearner(slug: string): Promise<{ status: 'ok'; lesson: PathLesson; contentMd: string; videoUrl: string | null } | { status: 'locked' } | { status: 'not_found' }>` — `locked` เมื่อบทอยู่ใน `getPath()` แต่ state เป็น `locked` หรืออ่าน `lesson_contents` ไม่ได้ (RLS); ไม่อยู่ในเส้นทาง → `not_found` (Task 8 ใช้)
  - หน้า: `locked` → `redirect('/path?locked=' + slug)`; `not_found` → `notFound()`; ปุ่ม "ทำแบบทดสอบ" → `/lessons/<slug>/quiz`
  - `youtubeEmbedUrl(url: string | null): string | null` — ดึง id 11 ตัวจาก `watch?v=` หรือ `youtu.be/` → `https://www.youtube-nocookie.com/embed/<id>`; ไม่ตรงรูปแบบ → null
  - `LessonMarkdown`: `react-markdown` โดยไม่เปิด raw HTML (คอมเมนต์ `<!-- TODO … -->` ใน seed ต้องไม่แสดง); รูปมี `alt`
  - `YouTubeEmbed`: iframe มี `title`; ถ้าโหลดไม่ได้ (`onError` หรือ `youtubeEmbedUrl` เป็น null) แสดง "โหลดวิดีโอไม่ได้" ในกรอบ ส่วนอื่นของหน้ายังแสดง

- [ ] **Step 1:** `youtube.test.ts`: `watch?v=dQw4w9WgXcQ` และ `youtu.be/dQw4w9WgXcQ` → `https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ`; `https://vimeo.com/1`, `null` → null
- [ ] **Step 2 (QA):** `lesson.spec.ts`

```ts
test('TC-LSN-01 unlocked lesson renders markdown headings without HTML comments', …); // บท 1: เห็น heading, ไม่เห็น "TODO"
test('TC-LSN-02 lesson without video shows no broken frame', …);                     // seed video_url null → ไม่มี iframe
test('TC-PATH-16 opening a locked lesson redirects with Thai notice @smoke', …);     // /lessons/first-chords → /path?locked=first-chords, alert "ต้องผ่านแบบทดสอบบท รู้จักส่วนประกอบของกีตาร์และการตั้งสาย ก่อน"
test('TC-LSN-03 unknown slug shows Thai not-found page', …);                          // /lessons/nope → "ไม่พบหน้าที่คุณต้องการ"
```

- [ ] **Step 3:** รัน — Expected: FAIL
- [ ] **Step 4:** เขียนตาม Interfaces
- [ ] **Step 5:** รัน unit + `e2e/specs/lesson.spec.ts` — Expected: ผ่าน
- [ ] **Step 6:** Commit `feat: add lesson page with markdown and video`

---

### Task 7: [Dev → QA] เครื่องมือเสียง: ดีดสายเปล่า (FR-02.3) และห้องทดลองคอร์ด (FR-02.4)

**Files:**
- Create: `lib/audio/strings.ts`, `lib/audio/chords.ts`, `components/{StringPlayer,ChordLab,ChordDiagram}.tsx`, `tests/unit/chords.test.ts`, `e2e/specs/audio.spec.ts`
- Modify: `app/(learner)/lessons/[slug]/page.tsx` (วาง `StringPlayer` ทุกบท และ `ChordLab` ในบทที่ 2–5)

**Interfaces:**
- Produces:
  - `OPEN_STRINGS: readonly { string: 1|2|3|4|5|6; note: string; hz: number }[]` — สาย 6→1: E2 82.41, A2 110.00, D3 146.83, G3 196.00, B3 246.94, E4 329.63
  - `pluck(ctx: AudioContext, hz: number, durationSec?: number): void` (Karplus–Strong หรือ oscillator + envelope; ค่าเริ่มต้น 1.5 วินาที)
  - `audioSupported(): boolean`
  - `CHORDS: Record<'Em'|'Am'|'C'|'D'|'G'|'F', { frets: (number | 'x')[]; fingers: (number | null)[] }>` — `frets` เรียงสาย 6→1: Em `0,2,2,0,0,0`; Am `x,0,2,2,1,0`; C `x,3,2,0,1,0`; D `x,x,0,2,3,2`; G `3,2,0,0,0,3`; F (เบื้องต้น) `x,x,3,2,1,1`
  - `chordFrequencies(name: keyof typeof CHORDS): number[]` — ความถี่ของสายที่ดีด (`hz * 2^(fret/12)`), ข้ามสาย `'x'`
  - `StringPlayer`: ปุ่ม 6 ปุ่มชื่อ "สาย 6 (E)" … "สาย 1 (E)"; ถ้า `audioSupported()` เป็น false ปุ่มถูก disable และแสดง "เบราว์เซอร์นี้ไม่รองรับเสียง"
  - `ChordLab`: ปุ่มเลือกคอร์ดแต่ละตัว, `ChordDiagram` (SVG มี `role="img"` และ `aria-label="คอร์ด <ชื่อ>"`), ปุ่ม "ฟังเสียง"

- [ ] **Step 1:** `chords.test.ts`: `chordFrequencies('Em')` มี 6 ค่า ค่าแรก ≈ 82.41; `chordFrequencies('D')` มี 4 ค่า ค่าแรก ≈ 146.83; `chordFrequencies('C')[0]` ≈ 130.81 (A2 + 3 fret, ทศนิยม 2 ตำแหน่ง)
- [ ] **Step 2 (QA):** `audio.spec.ts`

```ts
test('TC-LSN-04 six open-string buttons are present and clickable', …);   // ไม่มี console error เมื่อกด
test('TC-LSN-05 audio unsupported shows disabled state without crashing', …); // addInitScript ลบ window.AudioContext → ปุ่ม disabled + ข้อความ, เนื้อหาบทยังแสดง
test('TC-LSN-06 chord lab shows fingering diagram for chosen chord', …);    // ต้องผ่านบท 1 ก่อน (สอบผ่านด้วย buildAnswers ผ่าน memberDb.rpc) แล้วเปิดบท 2 เลือก Am → img "คอร์ด Am"
```

- [ ] **Step 3:** รัน — Expected: FAIL
- [ ] **Step 4:** เขียนตาม Interfaces (สร้าง `AudioContext` เมื่อกดครั้งแรกเท่านั้น)
- [ ] **Step 5:** รัน unit + `e2e/specs/audio.spec.ts` — Expected: ผ่าน
- [ ] **Step 6:** Commit `feat: add open-string player and chord lab`

---

### Task 8: [Dev → QA] แบบทดสอบ (FR-04)

**Files:**
- Create: `lib/quiz.ts`, `lib/data/quiz.ts`, `app/(learner)/lessons/[slug]/quiz/{page.tsx,actions.ts}`, `components/{QuizForm,QuizResultView}.tsx`, `tests/unit/quiz.test.ts`, `e2e/specs/quiz.spec.ts`

**Interfaces:**
- Consumes: `getLessonForLearner`, `thaiError`, `errorCodeFrom`, `getPath`
- Produces:
  - `type QuizQuestion = { id: string; prompt: string; imageUrl: string | null; choices: { id: string; text: string }[] }`
  - `type QuizResult` = รูปผลลัพธ์ของ `submit_quiz` (`attempt_id`, `score_pct`, `passed`, `pass_score`, `next_lesson_slug`, `results[]` ที่มี `question_id`, `choice_id`, `correct_choice_id`, `is_correct`, `explanation`)
  - `unansweredIds(questions: QuizQuestion[], answers: Record<string, string>): string[]`
  - `getQuiz(slug: string): Promise<{ status: 'ok'; lessonId: string; title: string; passScore: number; questions: QuizQuestion[] } | { status: 'locked' } | { status: 'not_found' }>` — เรียงคำถามและตัวเลือกตาม `sort_order`
  - Server Action `submitQuiz(lessonId: string, answers: { question_id: string; choice_id: string }[]): Promise<{ ok: true; result: QuizResult } | { ok: false; code: ErrorCode }>` — เรียก `rpc('submit_quiz')` แล้ว `revalidatePath('/path')`, `revalidatePath('/dashboard')`
  - `QuizForm` (client): คำถามละ `role="radiogroup"` มีชื่อ "ข้อ N"; ปุ่ม "ส่งคำตอบ"; ตอบไม่ครบ → ไม่เรียก action, ทำเครื่องหมายข้อที่ขาดด้วย `aria-invalid` และข้อความ "ยังไม่ได้ตอบ" + สรุป "ยังไม่ได้ตอบ N ข้อ"; ระหว่างรอผลปุ่มถูก disable และกันการส่งซ้ำ; ส่งไม่สำเร็จเพราะเครือข่าย (action throw) → คงคำตอบ แสดง `thaiError('NETWORK')` และปุ่ม "ส่งอีกครั้ง"; error จาก DB แสดง `thaiError(code)`
  - `QuizResultView`: คะแนน `data-testid="quiz-score"` (เช่น "80%"), "ผ่าน" / "ไม่ผ่าน", แต่ละข้อแสดงตัวเลือกที่เลือก, ข้อที่ถูก และคำอธิบาย; ผ่านและมีบทถัดไป → ลิงก์ "ไปบทถัดไป"; ผ่านและไม่มีบทถัดไป → "จบคอร์สแล้ว"; ไม่ผ่าน → "ทบทวนบทเรียน" (→ บทเรียน) และ "สอบใหม่" (ล้างคำตอบ)
  - หน้าแบบทดสอบของบทที่ล็อก → redirect `/path?locked=<slug>` เหมือน Task 6

- [ ] **Step 1:** `quiz.test.ts`: `unansweredIds` คืน id ที่ยังไม่ตอบตามลำดับคำถาม; ตอบครบ → `[]`
- [ ] **Step 2 (QA):** `quiz.spec.ts` (ใช้ `memberPage`; คำตอบถูก/ผิดหาด้วย `buildAnswers(adminDb, …)` แล้วคลิกตามข้อความตัวเลือก)

```ts
test('TC-QZ-17 unanswered questions are highlighted and nothing is submitted', …); // ตอบ 4/5 → "ยังไม่ได้ตอบ 1 ข้อ"; quiz_attempts ของ member = 0
test('TC-QZ-18 failing score shows review and retry, next lesson stays locked @smoke', …); // 2/5 → "40%", "ไม่ผ่าน", ปุ่ม "สอบใหม่"; PathPage บท 2 'locked'
test('TC-QZ-19 passing score shows explanations and unlocks next lesson @smoke', …); // 3/5 → "60%", "ผ่าน", ทุกข้อมีคำอธิบาย; "ไปบทถัดไป" → /lessons/first-chords
test('TC-QZ-20 retake keeps best score on the path', …);                            // 5/5 แล้ว 1/5 → การ์ดบท 1 แสดงคะแนนสูงสุด 100 และ 'completed'
test('TC-QZ-21 last lesson shows course finished', …);                              // ปลดล็อกถึงบท 5 ผ่าน rpc แล้วสอบบท 5 ผ่านใน UI → "จบคอร์สแล้ว"
test('TC-QZ-22 network failure keeps answers and offers resend', …);                // Review Focus 3: page.route ให้ request ของ server action ครั้งแรก abort → "ส่งอีกครั้ง", radio ยังถูกเลือก; กด → ได้ผลลัพธ์
test('TC-QZ-23 double click submits once', …);                                     // Review Focus 3: dblclick "ส่งคำตอบ" → quiz_attempts ของ member = 1
test('TC-QZ-24 locked quiz URL redirects to path', …);                              // /lessons/first-chords/quiz → /path?locked=first-chords
```

- [ ] **Step 3:** รัน — Expected: FAIL
- [ ] **Step 4:** เขียนตาม Interfaces
- [ ] **Step 5:** รัน unit + `npx playwright test e2e/specs/quiz.spec.ts --project=chromium` — Expected: 8 passed
- [ ] **Step 6:** Commit `feat: add quiz page with server-side grading results`

---

### Task 9: [Dev → QA] บันทึกการฝึกและตัวจับเวลา (FR-05.1–05.4)

**Files:**
- Create: `lib/data/practice.ts`, `app/(learner)/practice/{page.tsx,actions.ts}`, `components/{PracticeForm,PracticeTimer,PracticeList}.tsx`, `e2e/specs/practice.spec.ts`

**Interfaces:**
- Consumes: `validatePractice`, `bangkokToday`, `minutesFromElapsed`, `thaiError`, `errorCodeFrom`, `getPath`
- Produces:
  - `ACTIVITIES = [{ value: 'tuning', label: 'ตั้งสาย' }, { value: 'chords', label: 'คอร์ด' }, { value: 'strumming', label: 'การดีด' }, { value: 'song', label: 'เล่นเพลง' }, { value: 'other', label: 'อื่น ๆ' }] as const` ใน `lib/data/practice.ts` (Task 10 ใช้ label)
  - `type PracticeLog = { id: string; practicedOn: string; minutes: number; activity: string; note: string | null; lessonId: string | null; lessonTitle: string | null }`
  - `listMyPracticeLogs(limit?: number): Promise<PracticeLog[]>` — เรียง `practiced_on` desc แล้ว `created_at` desc (Task 10 ใช้ `limit: 5`)
  - Server Actions: `createPracticeLog(prev: ActionState, form: FormData)`, `updatePracticeLog(id: string, prev: ActionState, form: FormData)`, `deletePracticeLog(id: string): Promise<ActionState>` — ตรวจด้วย `validatePractice(…, bangkokToday())` ก่อนเรียก DB; error `FUTURE_DATE`/CHECK จาก DB แปลเป็นข้อความไทย; สำเร็จ `revalidatePath('/practice')`, `revalidatePath('/dashboard')`
  - ฟอร์ม: ป้าย "วันที่" (`type="date"`, ค่าเริ่มต้นและ `max` = `bangkokToday()` คำนวณฝั่งเซิร์ฟเวอร์), "จำนวนนาที", "หัวข้อที่ฝึก" (select จาก `ACTIVITIES`), "บันทึกสั้น" (textarea แสดงตัวนับ "N/500"), "บทเรียนที่เกี่ยวข้อง" (ไม่บังคับ; บทที่ไม่ล็อกจาก `getPath()`); ปุ่ม "บันทึก"
  - `PracticeTimer` (client): ปุ่ม "เริ่ม", "หยุด", "รีเซ็ต", "ใช้เวลานี้"; แสดง `mm:ss`; เก็บ `startedAt`/`accumulatedMs` แล้วคำนวณจาก `Date.now()` (ไม่นับ tick); "ใช้เวลานี้" ใส่ `minutesFromElapsed` ลงช่อง "จำนวนนาที"
  - `PracticeList`: แถวละบันทึก `role="listitem"` มีปุ่ม "แก้ไข" (แก้ในแถว) และ "ลบ" (ยืนยันด้วย dialog "ลบบันทึกนี้?" ปุ่ม "ลบ" / "ยกเลิก")

- [ ] **Step 1 (QA): เขียนเทสต์ที่ล้มเหลว** `practice.spec.ts` (ใช้ `memberPage`)

```ts
test('TC-PRC-02 save a practice log and see it in the list @smoke', …);       // 30 นาที, คอร์ด, note → แถวใหม่บนสุด
test('TC-PRC-03 minutes boundaries 0/1/600/601', …);                          // 0 และ 601 → "จำนวนนาทีต้องเป็นจำนวนเต็ม 1–600"; 1 และ 600 บันทึกได้
test('TC-PRC-04 date defaults to Bangkok today in another browser timezone', …); // Review Focus 2: test.use({ timezoneId: 'America/Los_Angeles' }); ค่า/max ของ "วันที่" === bangkokDate(0)
test('TC-PRC-05 future date rejected even if the max attribute is bypassed', …);  // ลบ attr max ด้วย evaluate แล้วใส่ bangkokDate(1) → "วันที่ต้องไม่เป็นวันในอนาคต"
test('TC-PRC-06 note longer than 500 characters is rejected', …);
test('TC-PRC-07 timer fills minutes with "ใช้เวลานี้"', …);                    // page.clock.install(); เริ่ม → fastForward('05:20') → หยุด → ใช้เวลานี้ → "จำนวนนาที" = '5'
test('TC-PRC-08 edit and delete own log', …);                                  // แก้ 30 → 45 แล้วลบ → รายการว่าง
```

- [ ] **Step 2:** รัน — Expected: FAIL
- [ ] **Step 3:** เขียนตาม Interfaces
- [ ] **Step 4:** รัน `npx playwright test e2e/specs/practice.spec.ts --project=chromium` — Expected: 7 passed
- [ ] **Step 5:** Commit `feat: add practice log with timer`

---

### Task 10: [Dev → QA] Dashboard (FR-06)

**Files:**
- Create: `lib/stats.ts`, `lib/data/dashboard.ts`, `app/(learner)/dashboard/page.tsx`, `components/{StatCard,BarChart}.tsx`, `tests/unit/stats.test.ts`, `e2e/specs/dashboard.spec.ts`

**Interfaces:**
- Consumes: `getPath`, `getMyProfile`, `listMyPracticeLogs`, `bangkokWeekRange`, `bangkokLastDays`
- Produces:
  - `lessonsProgress(lessons: PathLesson[]): { completed: number; total: number }`
  - `averageBestScore(lessons: PathLesson[]): number | null` — ค่าเฉลี่ย `bestScore` ของบทที่มีคะแนน ปัดเป็นจำนวนเต็ม; ไม่มีคะแนน → null
  - `weeklyMinutes(logs: { practicedOn: string; minutes: number }[], range: { start: string; end: string }): number`
  - `dailyMinutes(logs: { practicedOn: string; minutes: number }[], days: string[]): { date: string; minutes: number }[]` — เติม 0 วันที่ไม่มีบันทึก
  - `nextLesson(lessons: PathLesson[]): PathLesson | null` — บท `unlocked` ตัวแรกตามลำดับ
  - `getDashboard(): Promise<{ lessons: PathLesson[]; profile; recentLogs: PracticeLog[]; weekLogs: { practicedOn: string; minutes: number }[] }>` — `weekLogs` ดึงตั้งแต่ `min(bangkokWeekRange().start, bangkokLastDays(7)[0])`
  - หน้า: การ์ด `data-testid="stat-lessons"` ("2 / 5 บท"), `stat-avg-score` ("80%" หรือ "—"), `stat-week-minutes` ("45 / 120 นาที"; เป้าหมาย 0 → "45 นาที (ยังไม่ตั้งเป้าหมาย)"); กราฟ "นาทีฝึก 7 วันล่าสุด" และ "คะแนนสูงสุดรายบท" เป็น SVG/CSS ไม่ใช้ไลบรารี มี `role="img"` + `aria-label` สรุปค่า; "ประวัติการฝึกล่าสุด" 5 รายการ; ปุ่ม "ไปบทถัดไป" → บท `nextLesson` หรือข้อความ "จบคอร์สแล้ว"

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลว** `stats.test.ts`

```ts
const range = { start: '2026-10-19', end: '2026-10-25' };
expect(weeklyMinutes([{ practicedOn: '2026-10-18', minutes: 30 }, { practicedOn: '2026-10-19', minutes: 20 }, { practicedOn: '2026-10-25', minutes: 5 }], range)).toBe(25); // Review Focus 5
expect(dailyMinutes([{ practicedOn: '2026-10-19', minutes: 10 }, { practicedOn: '2026-10-19', minutes: 5 }], ['2026-10-18', '2026-10-19']))
  .toEqual([{ date: '2026-10-18', minutes: 0 }, { date: '2026-10-19', minutes: 15 }]);
expect(averageBestScore([pl({ bestScore: 80 }), pl({ bestScore: 67 }), pl({ bestScore: null })])).toBe(74);
expect(averageBestScore([pl({ bestScore: null })])).toBeNull();
expect(nextLesson([pl({ state: 'completed' }), pl({ slug: 'b', state: 'unlocked' }), pl({ state: 'locked' })])?.slug).toBe('b');
expect(nextLesson([pl({ state: 'completed' })])).toBeNull();
```

- [ ] **Step 2 (QA):** `dashboard.spec.ts`

```ts
test('TC-DSH-01 new learner dashboard shows zero state', …);                       // "0 / 5 บท", "—", "0 / 0 นาที" หรือข้อความยังไม่ตั้งเป้าหมาย, ปุ่ม "ไปบทถัดไป" → บท 1
test('TC-DSH-02 practice log changes weekly minutes and 7-day chart @smoke', …);  // ตั้งเป้า 120 ใน profile → บันทึก 45 นาทีวันนี้ → "45 / 120 นาที"; aria-label กราฟมี "45"
test('TC-DSH-03 passing a quiz updates lessons count and average', …);            // สอบบท 1 ได้ 80% → "1 / 5 บท", "80%", ปุ่มไปบท first-chords
test('TC-DSH-04 recent history shows latest five logs', …);                       // สร้าง 6 บันทึกผ่าน memberDb → แสดง 5 แถว เรียงใหม่สุดก่อน
```

- [ ] **Step 3:** รัน — Expected: FAIL
- [ ] **Step 4:** เขียนตาม Interfaces
- [ ] **Step 5:** รัน unit + `npx playwright test e2e/specs/dashboard.spec.ts --project=chromium` — Expected: ผ่าน
- [ ] **Step 6:** Commit `feat: add learner dashboard`

---

### Task 11: [QA] เส้นทางหลักครบวงจร, มือถือ, เบราว์เซอร์ และ accessibility

**Files:**
- Create: `e2e/specs/journey.spec.ts`, `e2e/specs/mobile.spec.ts`, `e2e/specs/a11y.spec.ts`

**Interfaces:**
- Consumes: Page Objects (Task 2), ทุกหน้า (Task 3–10)

- [ ] **Step 1:** เขียนเทสต์

```ts
// journey.spec.ts — สเปก 6.3 เส้นทางหลัก 1 และ 2
test('TC-PATH-17 signup → lesson 1 unlocked → fail → lesson 2 locked → pass → lesson 2 unlocked @smoke', …); // ผ่าน UI ทั้งหมด (สมัคร+Mailpit)
test('TC-DSH-05 practice log → dashboard numbers change @smoke', …);
// mobile.spec.ts — NFR-02 (test.use({ viewport: { width: 375, height: 812 } }))
test('TC-MOB-01 no horizontal scroll on every learner page', …);  // /, /login, /signup, /dashboard, /path, /lessons/guitar-anatomy-tuning, /lessons/guitar-anatomy-tuning/quiz, /practice, /profile: scrollWidth <= clientWidth
test('TC-MOB-02 navigation reachable on 375px', …);               // ลิงก์นำทางทั้ง 4 คลิกได้ (เมนูแบบพับได้ถ้ามี)
// a11y.spec.ts — สเปก 6.3 เสริม (C)
test('TC-SEC-18 home, login and path have no serious axe violations', …); // AxeBuilder: violations ที่ impact 'serious'|'critical' = []
```

- [ ] **Step 2:** รัน `npx playwright test e2e/specs --project=chromium` แล้ว `--project=firefox` และ `--project=mobile` — Expected: ผ่านทั้งหมดทั้ง 3 project; ถ้าเทสต์ใดใช้ไม่ได้บางเบราว์เซอร์ (เช่น `page.clock` หรือ `timezoneId`) ให้ `test.skip(browserName === …, '<เหตุผล>')` พร้อมบันทึกใน `docs/qa/test-cases.md`
- [ ] **Step 3:** รันซ้ำ 3 รอบติดกัน `--repeat-each=3 --project=chromium` — Expected: ไม่มีเทสต์ flaky; ไม่มีผู้ใช้ `qa+…` ค้าง
- [ ] **Step 4:** Commit `test: add end-to-end learner journeys, mobile and accessibility checks`

---

### Task 12: [QA] Test Cases, RTM และ CI ของแผนที่ 2 (เริ่มได้ทันที)

**Files:**
- Modify: `docs/qa/test-cases.md`, `docs/qa/rtm.md`, `docs/qa/test-plan.md` (หัวข้อสภาพแวดล้อม: Mailpit, storageState), `.github/workflows/ci.yml` (ถ้าจำเป็น)

**Interfaces:**
- Produces: TC ทุกตัวที่ชื่อเทสต์ในแผนนี้อ้าง (`TC-AUTH-01..10`, `TC-LSN-01..06`, `TC-PATH-14..17`, `TC-QZ-17..24`, `TC-PRC-02..08`, `TC-DSH-01..05`, `TC-MOB-01..02`, `TC-SEC-18`) ในรูปแบบคอลัมน์เดิมของ `test-cases.md`; TC เดิมที่เป็น "Automated (แผนที่ 2)" เช่น FR-03.1, FR-03.4, FR-04.2, FR-04.6 ให้ชี้ไปที่ไฟล์ spec จริง (ถ้าความหมายซ้ำกับ TC ใหม่ ให้ระบุว่า TC ใหม่ทดแทน)

- [ ] **Step 1:** เขียน TC ตามรายการ พร้อมเทคนิค (BVA: รหัสผ่าน 7/8, นาที 0/1/600/601, เป้าหมาย -1/0/5000/5001; EP: อีเมลถูก/ผิด, วันที่อดีต/วันนี้/อนาคต; State transition: ล็อก→เรียนได้→จบแล้ว)
- [ ] **Step 2:** อัปเดต `rtm.md`: FR-01.1–01.6, FR-02.1–02.4, FR-03.x, FR-04.x, FR-05.1–05.4, FR-06.x, NFR-02, NFR-03, NFR-04 มี TC และสถานะ; FR-01.7, FR-01.8, FR-05.5 = "รอแผนที่ 3"; NFR-03 ส่วน Safari บนมือถือไม่มี project อัตโนมัติ (สเปก 6.3 กำหนด Chromium/Firefox/Pixel 7) → เขียน TC แบบ Manual บน iPhone จริง; อัปเดตตารางสรุป
- [ ] **Step 3:** ตรวจ CI: `--grep "@smoke|@security"` ของ `ci.yml` ครอบคลุม UI smoke ใหม่แล้ว; ตรวจว่า job ไม่เกิน `timeout-minutes: 30` จากรันจริงของ PR (ถ้าเกิน ให้แยก UI smoke เป็น step หรือเพิ่ม `--workers`)
- [ ] **Step 4:** Commit `docs(qa): add plan 2 test cases and update RTM`

---

## เมื่อจบแผนที่ 2
- `npm run test:unit`, `npx supabase test db` และ Playwright ทุก spec ผ่านบน `chromium`, `firefox`, `mobile`; check `ci` เขียวบน PR
- ผู้เรียนทำเส้นทางหลักที่ 1 และ 2 ของสเปก 6.3 ได้ผ่าน UI จริง
- ขั้นต่อไป: แผนที่ 3 — หลังบ้านแอดมิน FR-07 (รวมเส้นทางหลักที่ 3), FR-01.7, FR-01.8, FR-05.5, กันการแก้บทที่เผยแพร่แล้ว, deploy Vercel/Supabase production, keep-alive, backup, nightly
