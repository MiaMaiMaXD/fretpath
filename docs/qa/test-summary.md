# FretPath — Test Summary Report

เวอร์ชัน 1.0 (ร่างโดย Dev 2026-10-20) · อ้างอิงสเปก `docs/superpowers/specs/2026-10-19-fretpath-design.md` หัวข้อ 6.1 · เอกสารที่เกี่ยวข้อง: `test-plan.md`, `test-cases.md`, `rtm.md`, `ci.md`, `../demo.md`

> **อัปเดต 2026-11-19:** เติมแล้ว — จำนวน TC (หัวข้อ 2), nightly ล่าสุด (3.3), ค่าถดถอยของ Lighthouse และการแก้ (6.1), defect #29 และ #30 (7) และสถานะเกณฑ์จบ (8) TC-PRD-05 (flow รหัส OTP) ผ่านแล้ว 2026-11-18 ที่ยังขาดคือ Manual TC-MOB-03 และภาพหน้าจอหลักฐาน
>
> **สถานะเอกสาร: ยังไม่ปิด** — ส่วนที่ทราบผลแล้ว (จำนวน TC, ผลรอบในเครื่อง, CI, ความครอบคลุม RTM) กรอกครบแล้ว ผลบน production รอบแรก (2026-10-20, `https://fretpath-six.vercel.app`) กรอกแล้วในหัวข้อ 3.3, 4 และ 6 ส่วนที่ยังไม่ได้ทดสอบ ช่องเหล่านั้นทำเครื่องหมายเป็น `<!-- รอผล: … -->` พร้อมบอกว่าต้องใส่อะไรและเอามาจากไหน ทีม/QA เติมใน Task 9 Step 6 แล้ว commit ผ่าน PR **ห้ามเดาตัวเลขหรือเขียนว่า "ผ่าน" ในช่องที่ยังไม่ได้รันจริง**

## 1. ขอบเขตและรอบการทดสอบ

**ขอบเขต:** requirement ทั้ง 48 ข้อ — FR-01 … FR-07 (41 ข้อ) และ NFR-01 … NFR-07 (7 ข้อ) ตามสเปกข้อ 2 ไม่รวมระบบชำระเงิน อีเมลแจ้งเตือนผู้เรียน หน้าจัดการหลายคอร์ส และแอปมือถือ (นอกขอบเขตตามสเปกข้อ 2.3)

| รอบ | วันที่ | สภาพแวดล้อม | สิ่งที่รัน | สถานะ |
|---|---|---|---|---|
| รอบในเครื่อง (Dev) | 2026-10-20 | Local: Supabase CLI (Docker) + seed, Next.js ในเครื่อง | pgTAP, Vitest, Playwright `chromium` (ทุกป้าย) | เสร็จ — ผลในหัวข้อ 3.1 |
| CI ต่อ PR | ทุก PR / push ไป `main` | GitHub Actions + Supabase local | pgTAP, lint, typecheck, Vitest, build, Playwright `chromium` `@smoke`/`@security` | `main` เขียวล่าสุด 2026-10-20 — หัวข้อ 3.2; PR แผนที่ 4 (#6) success — หัวข้อ 3.2 |
| Nightly `full-suite` | ทุกคืน 02:00 น. | GitHub Actions + Supabase local | Playwright ทุกป้ายบน `chromium`, `firefox`, `mobile` | 2026-10-20 ผ่าน 285/285 (flaky 1); ล่าสุด 2026-11-19 ผ่าน 339/339 (flaky 1) — หัวข้อ 3.3 |
| Nightly `production` | ทุกคืน 02:00 น. | Production (อ่านอย่างเดียว) | Playwright `--project=prod` (TC-PRD) แล้ว Lighthouse (TC-PERF-01) | 2026-10-20 ผ่าน; Lighthouse ล้มเป็นระยะ 2026-11-12 ถึง 11-19 (defect #30) แก้แล้ว ล่าสุด 2026-11-19 ผ่าน — หัวข้อ 3.3 และ 6 |
| ทดสอบด้วยมือ (Manual) | <!-- รอผล: วันที่ทำ --> | Local/Preview, production และอุปกรณ์จริง | Manual TC ทั้ง 11 ข้อ | <!-- รอผล: สรุปจากหัวข้อ 4 --> |

## 2. จำนวน Test Case

ผลของ `npm run qa:stats` เมื่อ 2026-11-19 (สคริปต์ `scripts/tc-stats.mjs` อ่านตารางจริงใน `test-cases.md` และ `rtm.md`; พิมพ์ซ้ำได้ทุกเมื่อ ตัวเลขในหัวข้อนี้คือผลที่สคริปต์พิมพ์)

```text
TC ทั้งหมด: 161

จำนวน TC ต่อพื้นที่:
  TC-AUTH: 30
  TC-LSN: 6
  TC-PATH: 19
  TC-QZ: 28
  TC-PRC: 9
  TC-DSH: 6
  TC-ADM: 20
  TC-SEC: 26
  TC-MOB: 6
  TC-PERF: 1
  TC-PRD: 6
  TC-OPS: 4

Automated: 150 (ในนี้ automate เฉพาะบางส่วน ส่วนที่เหลือเป็น Manual: 3)
Manual: 11

ความสำคัญ: High 117 · Medium 40 · Low 4

requirement ทั้งหมด: 48 ข้อ; มี TC แล้ว 48 ข้อ
  M: 42/42 มี TC
  S: 4/4 มี TC
  C: 2/2 มี TC
requirement ระดับ M ที่ยังไม่มี TC: 0
```

สรุป: 161 TC — Automated 150, Manual 11 (ใน Automated มี 3 ข้อที่ automate เฉพาะบางส่วน ส่วนที่เหลือเป็น Manual: TC-QZ-18, TC-QZ-20 ส่วน UI และ TC-OPS-04 ส่วนกู้คืนจริง)

เทียบกับรอบ 2026-10-20 (148 TC): เพิ่ม 13 ข้อ ทั้งหมดเป็น Automated — TC-AUTH-19…30 (หน้าโปรไฟล์ใหม่และหน้า auth ที่ใช้รหัส OTP 6 หลัก, PR #21, #23, #25) และ TC-MOB-04 (เมนูหน้าแรกเลื่อนไปหัวข้อโดยไม่เติม `#hash`, PR #26)

## 3. อัตราผ่าน (Pass rate)

### 3.1 รอบในเครื่อง — 2026-10-20 (Dev)

รันบนเครื่องพัฒนา (Windows 11, Supabase local ที่ `supabase start`, Playwright เริ่มเซิร์ฟเวอร์เองเพราะไม่ตั้ง `PROD_URL`) บน branch `plan-4-production`

| ชุด | คำสั่ง | ผล |
|---|---|---|
| pgTAP (DB, RLS, `submit_quiz`) | `npx supabase test db` | **212/212 ผ่าน** (14 ไฟล์, `Result: PASS`) |
| Unit (Vitest) | `npm run test:unit` | **69/69 ผ่าน** (18 ไฟล์ รวม `tc-stats.test.ts` 7 ข้อ) |
| E2E (Playwright) `chromium` | `npx playwright test --project=chromium` | **97/97 ผ่าน** (52.6 วินาที; รวม `setup` และ `teardown` อย่างละ 1 รายการ = เทสต์จริง 95) |
| Lint / Typecheck | `npm run lint`, `npm run typecheck` | ผ่าน ไม่มี error |

หมายเหตุ: รอบนี้รัน `chromium` เท่านั้น ชุดเต็มทั้ง 3 โปรเจกต์ (`chromium`, `firefox`, `mobile`) เคยรันในเครื่องผ่านครบ 60/60 ต่อโปรเจกต์ตอนปิดแผนที่ 2 (บันทึกใน `test-plan.md` R8) และจะรันทุกคืนใน nightly `full-suite` — ไม่ได้รันซ้ำในรอบนี้ ชุด `prod` (`e2e/prod/smoke.spec.ts`) ไม่ได้รันกับ production เพราะยังไม่มี production

### 3.2 CI (ต่อ PR)

| รัน | branch | ผล | ลิงก์ |
|---|---|---|---|
| CI ล่าสุดบน `main` (merge แผนที่ 3) | `main` | success (2026-10-20) | [39385107675](https://github.com/MiaMaiMaXD/fretpath/actions/runs/39385107675) |
| CI ของ PR แผนที่ 3 | `plan-3-admin` | success (2026-10-20) | [39383030639](https://github.com/MiaMaiMaXD/fretpath/actions/runs/39383030639) |
| CI ของ PR แผนที่ 4 | `plan-4-production` | success (2026-10-20, PR #6) | [39416648443](https://github.com/MiaMaiMaXD/fretpath/actions/runs/39416648443) |

CI ตั้ง branch protection บน `main` แล้ว (ต้องผ่าน check `ci` + approve 1 ครั้ง) รายละเอียดและหลักฐานการตรวจ CI ทั้งกรณีล้มและผ่านอยู่ใน `ci.md`

### 3.3 Nightly (ทุกคืน)

รันด้วยมือ (workflow_dispatch) หลังตั้ง secret ครบ — นับจากขั้น "Playwright (all tags, all browsers)" และ "Production smoke (read-only)" ไม่นับ `setup`/`teardown`

| Job / project | ผ่าน/ทั้งหมด | ลิงก์รัน | วันที่ |
|---|---|---|---|
| `full-suite` — `chromium` | 95/95 | [39439843823](https://github.com/MiaMaiMaXD/fretpath/actions/runs/39439843823) | 2026-10-20 |
| `full-suite` — `firefox` | 95/95 (TC-ADM-15 ผ่านเมื่อ retry ครั้งที่ 1 = flaky) | [39439843823](https://github.com/MiaMaiMaXD/fretpath/actions/runs/39439843823) | 2026-10-20 |
| `full-suite` — `mobile` (Pixel 7) | 95/95 | [39439843823](https://github.com/MiaMaiMaXD/fretpath/actions/runs/39439843823) | 2026-10-20 |
| `production` — `prod` (TC-PRD-01…04, 06) | 5/5 | [39439843823](https://github.com/MiaMaiMaXD/fretpath/actions/runs/39439843823) | 2026-10-20 |
| pgTAP / Unit | ดูหัวข้อ 3.1–3.2 (nightly ไม่รัน pgTAP/Unit แยก) | — | — |
| `full-suite` — `chromium` / `firefox` / `mobile` | 113/113 ทุกโปรเจกต์ (firefox: TC-PRC-09 ผ่านเมื่อ retry = flaky) | [44484722787](https://github.com/MiaMaiMaXD/fretpath/actions/runs/44484722787) | 2026-11-19 |
| `production` — `prod` (TC-PRD-01…04, 06) + Lighthouse | 5/5; Lighthouse ผ่าน (LCP 2311 ms) | [44484722787](https://github.com/MiaMaiMaXD/fretpath/actions/runs/44484722787) | 2026-11-19 |
| `keep-alive` (TC-OPS-01) | ผ่าน (`/api/health` ตอบ `{"ok":true}`) | [39435088603](https://github.com/MiaMaiMaXD/fretpath/actions/runs/39435088603) | 2026-10-20 |
| `backup` (TC-OPS-03 ส่วนอัตโนมัติ) | ผ่าน (restore check: schema 0 / data 0 error) | [39437226337](https://github.com/MiaMaiMaXD/fretpath/actions/runs/39437226337) | 2026-10-20 |

## 4. ผล Manual TC (11 ข้อ)

TC เหล่านี้ไม่มีเทสต์อัตโนมัติ (หรือมีเฉพาะบางส่วน) ต้องทำด้วยมือบนอุปกรณ์หรือ production จริง ขั้นตอนอยู่ในแถวของ TC นั้นใน `test-cases.md` บันทึก **วันที่ ผู้ทดสอบ ผล (ผ่าน/ไม่ผ่าน) และหลักฐาน** (ภาพหน้าจอเก็บใน `docs/qa/img/` แล้วลิงก์ที่นี่ หรือลิงก์ run/issue)

| TC | ทดสอบอะไร | ทำที่ไหน | วันที่ | ผู้ทดสอบ | ผล | หลักฐาน |
|---|---|---|---|---|---|---|
| TC-SEC-15 | ผู้เรียนอ่านความคืบหน้า ผลสอบ และ enrollments ของผู้อื่นไม่ได้ | Local (Supabase local) | 2026-10-23 | Dev | **ผ่าน** — B มีแถวครบ 4 ตาราง (ตรวจในฐานะ postgres) แล้ว A (role `authenticated`) SELECT `lesson_progress`, `quiz_attempts`, `quiz_attempt_answers`, `enrollments` กรองด้วย B ได้ผลว่างทุกตาราง (pgTAP 5/5 ในทรานแซกชันที่ rollback) | [สคริปต์](evidence/2026-10-23-manual-group-a.sql) |
| TC-SEC-16 | ไม่มี service role key ในโค้ดฝั่งเบราว์เซอร์ | Local (`npm run build`) | 2026-10-23 | Dev | **ผ่าน** — ใน `.next/static` (38 ไฟล์) ไม่พบชื่อ `SERVICE_ROLE`, ไม่พบค่า key จาก `.env.local` และไม่มี JWT ที่ role = `service_role`; คำ `sb_secret_` ที่พบ 1 จุดเป็นโค้ดของ supabase-js ที่ใช้ตรวจรูปแบบ key ไม่ใช่ค่า key; ในซอร์สมีอ้างถึงเฉพาะ `e2e/utils/env.ts`; `.env*` ไม่มีตัวแปร `NEXT_PUBLIC_*` ที่เป็น service/secret | ผลคำสั่งใน session ของ Dev |
| TC-QZ-08 | สอบผ่านซ้ำที่บทสุดท้าย | Local (Supabase local) | 2026-10-23 | Dev | **ผ่าน** — `submit_quiz` ซ้ำที่บทสุดท้ายที่ completed แล้ว: ไม่ error, `passed` = true, `next_lesson_slug` = null, สถานะยัง completed, attempt เพิ่ม 1 | [สคริปต์](evidence/2026-10-23-manual-group-a.sql) |
| TC-QZ-11 | สอบไม่ผ่านซ้ำที่บทสุดท้าย | Local (Supabase local) | 2026-10-23 | Dev | **ผ่าน** — สอบไม่ผ่านครั้งที่ 2: `passed` = false, `next_lesson_slug` = null, ไม่ completed, attempt บันทึกครบ 2 | [สคริปต์](evidence/2026-10-23-manual-group-a.sql) |
| TC-QZ-13 | คะแนน 59% ที่ `pass_score` 60 ไม่ผ่าน | Local (Supabase local) | 2026-10-23 | Dev | **ผ่าน** — บท 17 ข้อ ตอบถูก 10: `score_pct` = 59, `passed` = false | [สคริปต์](evidence/2026-10-23-manual-group-a.sql) |
| TC-QZ-15 | การปัดแบบ half-up: 1/8 = 12.5 → 13 | Local (Supabase local) | 2026-10-23 | Dev | **ผ่าน** — บท 8 ข้อ ตอบถูก 1: `score_pct` = 13 | [สคริปต์](evidence/2026-10-23-manual-group-a.sql) |
| TC-DSH-06 | กราฟคะแนนสูงสุดรายบทแสดงค่าตรงกับผลสอบ (FR-06.3) | Local (`npm run start`, Chromium ผ่าน Playwright) | 2026-10-23 | Dev | **ผ่าน (มีข้อสังเกต)** — สอบบท 1 = 100%, บท 2 = 60% แล้ว 40% (ต้องเก็บค่าสูงสุด): แท่งบท 1 = 100, บท 2 = 60 ตรงกับการ์ดใน `/path` ("คะแนนสูงสุด 100%" / "60%"); บทที่ยังไม่สอบไม่มีแท่ง; ข้อสังเกต: `aria-label` ของกราฟอ่านบทที่ยังไม่สอบเป็น "บท 3 0 %" แยกไม่ออกจากการสอบได้ 0% — **แก้แล้ว** ใน branch `fix/chart-untaken-label` ให้อ่านเป็น "บท 3 ยังไม่สอบ" (ดูหัวข้อ 9 ข้อ 10) | [dashboard](img/dsh-06-dashboard.png), [path](img/dsh-06-path.png) |
| TC-MOB-03 | เส้นทางหลักและเสียงดีดสายบน Safari ของ iPhone จริง (NFR-03) | iPhone จริง | <!-- รอผล --> | <!-- รอผล --> | <!-- รอผล --> | <!-- รอผล: ภาพหน้าจอ/คลิป --> |
| TC-PRD-05 | รหัส OTP 6 หลักทางอีเมลบน production ใช้สมัครสมาชิกและตั้งรหัสผ่านใหม่ได้ | Production (คอมพิวเตอร์) | 2026-11-18 | ทีม | **ผ่าน** — หลังตั้งเทมเพลต "Confirm signup" / "Reset Password" และ OTP length 6 บน Supabase: สมัครสมาชิกด้วยรหัส OTP จากอีเมลสำเร็จ และลืมรหัสผ่าน: ได้รหัสทางอีเมล กรอกแล้วตั้งรหัสใหม่ได้ (รอบก่อนหน้า 2026-10-20 ผ่านกับ flow แบบลิงก์เดิม: สมัครบนคอม เปิดลิงก์ในโทรศัพท์ เข้า Dashboard ได้; ลืมรหัสผ่านตั้งรหัสใหม่ได้ รหัสเก่าใช้ไม่ได้) | <!-- รอผล: ภาพหน้าจออีเมลที่มีรหัส (ปิดอีเมลผู้รับ) และหน้าสำเร็จ --> |
| TC-AUTH-18 | ล็อกอินด้วย Google บน production | Production | 2026-10-23 | ทีม | **ผ่าน** — ปุ่ม "เข้าสู่ระบบด้วย Google" แสดงบน `/login`, CSP `form-action` มี Supabase และ `accounts.google.com`; ล็อกอินด้วยบัญชีใน Test users สำเร็จ (รอบแรกเด้งไป `/?code=…` เพราะ `NEXT_PUBLIC_SITE_URL` ใน Vercel ว่าง ตั้งค่าแล้ว redeploy จึงผ่าน) smoke test `--project=prod` หลังเปิด Google (2026-10-23) ผ่าน 5/5 (TC-PRD-01/02/03/04/06) | <!-- รอผล: ภาพหน้าจอ Dashboard --> |
| TC-OPS-02 | GitHub ส่งอีเมลเมื่อ keep-alive ล้ม (รันด้วย input `url` ที่ไม่ใช่ FretPath) | GitHub Actions + กล่องอีเมล | 2026-10-20 | ทีม | **ผ่าน** — run keep-alive ที่ชี้ไป URL อื่นล้มตามคาด และได้รับอีเมลแจ้ง run ล้มจาก GitHub | [39445541276](https://github.com/MiaMaiMaXD/fretpath/actions/runs/39445541276) <!-- รอผล: ภาพอีเมล (ปิดข้อมูลส่วนตัว) --> |

ส่วนที่เป็น Manual หรือต้องตรวจซ้ำด้วยมือของ TC อื่น (ส่วนที่ automate ของ TC เหล่านี้ดูหัวข้อ 3 และ 6):

| TC | ส่วน Manual | วันที่ | ผู้ทดสอบ | ผล | หลักฐาน |
|---|---|---|---|---|---|
| TC-OPS-04 | กู้คืนจาก backup จริงลง Supabase local ตาม `docs/deploy/backup-restore.md` แล้ว `select count(*) from public.lessons;` ≥ 1 | 2026-10-23 | ทีม + Dev | **ผ่าน** — ถอดรหัส `fretpath-backup-2026-10-20.tar.gz.gpg` ด้วย GnuPG 2.4.5 (ที่มากับ Git for Windows) ได้ `roles.sql` `schema.sql` `data.sql`; `supabase db reset --no-seed` (ก่อนโหลด lessons=0, users=0) แล้วโหลด `data.sql`: lessons=5, auth.users=1, profiles=1; error 1 ข้อ `duplicate key ... "buckets_pkey"` ไม่เป็นอันตราย (bucket ถูกสร้างโดย migration `20261021000017_storage.sql` แล้ว) ลบไฟล์ที่ถอดรหัสแล้วและ reset DB local หลังทดสอบ | ผลคำสั่งใน session ของ Dev |
| TC-OPS-03 | ดาวน์โหลด artifact แล้ว `file fretpath-backup-*.gpg` ต้องเป็น PGP/GPG encrypted data และไม่มีไฟล์ `.sql` | 2026-10-20 (ส่วนอัตโนมัติ) | GitHub Actions | ส่วนอัตโนมัติ **ผ่าน**: restore check ผ่าน (schema 0 / data 0 error, lessons=5, users=1, profiles=1), artifact `fretpath-backup` 45,632 bytes; ส่วนดาวน์โหลดตรวจด้วยมือ (2026-10-23, Dev) **ผ่าน**: `gh run download` ได้ไฟล์เดียว `fretpath-backup-2026-10-20.tar.gz.gpg` (45,429 bytes) ไม่มี `.sql`; `file` รายงาน "PGP symmetric key encrypted data - AES with 256-bit key salted & iterated - SHA512"; ถอดรหัสด้วย passphrase ผิดได้ `decryption failed: Bad session key` | [39437226337](https://github.com/MiaMaiMaXD/fretpath/actions/runs/39437226337) |
| TC-QZ-18, TC-QZ-20 | ส่วน UI (ส่วน API/DB อัตโนมัติ) | 2026-10-23 | Dev (Chromium ผ่าน Playwright, local) | **ผ่าน** — QZ-18: คลิกตัวเลือกที่ 1 แล้วที่ 2 ของข้อ 1 เหลือเลือกไว้ 1 ตัว (ตัวแรกถูกยกเลิก); QZ-20: ก่อนส่งคำตอบ HTML และ response ที่ไม่ใช่ JS ของหน้า quiz ไม่มีคำอธิบายเฉลยทั้ง 5 ข้อ ไม่มี `correct_choice_id`/`is_correct` และผู้เรียนอ่าน `quiz_answer_keys` ได้ 0 แถว | [QZ-18](img/qz-18-one-choice.png), [QZ-20](img/qz-20-quiz-before-submit.png) |

## 5. ความครอบคลุม (RTM)

อ้างอิง `rtm.md` (ปิดแล้ว) และผล `npm run qa:stats` ในหัวข้อ 2

| รายการ | ผล |
|---|---|
| requirement ทั้งหมด | 48 ข้อ (FR 41 + NFR 7) — มี TC ครบ 48 ข้อ |
| ระดับ M | 42/42 มี TC; **requirement ระดับ M ที่ไม่มี TC = 0** |
| ระดับ S / C | 4/4 และ 2/2 มี TC |
| สถานะ | ทำแล้ว (อัตโนมัติ) 33 ข้อ · มี TC แต่บางส่วนยังเป็น Manual 15 ข้อ |
| ความสอดคล้อง RTM ↔ test-cases | ไม่มี TC ที่ RTM อ้างแล้วหาไม่พบ และไม่มี TC ที่ไม่ปรากฏใน RTM (สคริปต์ไม่รายงานคำเตือน) |

ช่องว่างที่ยอมรับ (ไม่มี E2E อัตโนมัติ): กราฟคะแนนสูงสุดรายบท (FR-06.3), ช่องบทเรียนที่เกี่ยวข้องและปุ่มรีเซ็ตตัวจับเวลา (FR-05.1/05.3), วิดีโอ YouTube ที่ฝังจริง (FR-02.2), เสียงจริงของปุ่มดีดสายและเมโทรนอม (FR-02.3, FR-05.5), Safari บน iPhone (NFR-03), Google OAuth จริง (FR-01.7), อีเมลแจ้งเตือนของ GitHub (NFR-05)

## 6. ผล Lighthouse (NFR-07, TC-PERF-01)

เกณฑ์ใน `lighthouserc.json` (ค่ามัธยฐานของ 3 รอบ โปรไฟล์มือถือเริ่มต้น: Moto G Power + slow 4G): `largest-contentful-paint` ≤ 3000 ms (error), `interactive` (TTI) ≤ 3000 ms (error), `categories:accessibility` ≥ 0.9 (warn)

| ตัวชี้วัด | เกณฑ์ | ในเครื่อง (build production, localhost, 3 รอบ, บันทึกใน `ci.md`) | Production (Vercel) |
|---|---|---|---|
| LCP | ≤ 3000 ms | 3301 / 2868 / 2934 ms (มัธยฐาน 2934) | **2298 ms** (มัธยฐาน 3 รอบ) |
| TTI | ≤ 3000 ms | 3301 / 3141 / 3166 ms (มัธยฐาน **3166 — เกินเกณฑ์**) | **2298 ms** — ผ่าน |
| TBT | (ไม่มีเกณฑ์) | 202 / 170 / 91 ms | 60 ms |
| Accessibility | ≥ 0.9 | 1.00 | 1.00 |
| ผล assertion | ผ่านทั้งหมด | LCP ผ่าน (มัธยฐาน) แต่ TTI ไม่ผ่านในเครื่อง | **ผ่านทั้งหมด** (2026-10-20, [39439843823](https://github.com/MiaMaiMaXD/fretpath/actions/runs/39439843823); ตัวเลขจาก job summary "Lighthouse summary") |

**ผลบน production: ผ่าน NFR-07** — LCP/TTI 2298 ms ต่ำกว่าเกณฑ์ 3000 ms ค่าในเครื่องที่เกินน่าจะมาจากสภาพแวดล้อมเครื่องพัฒนา (`next start` บน Windows) เกณฑ์วัดบน production จึงไม่เปิด defect

### 6.1 ค่าถดถอยหลังรีดีไซน์หน้าแรก และการแก้ (defect [#30](https://github.com/MiaMaiMaXD/fretpath/issues/30))

ค่ามัธยฐาน LCP บน production จาก job summary ของ nightly:

| ช่วง | commit | LCP (มัธยฐาน 3 รอบ) | ผล |
|---|---|---|---|
| 2026-10-20 ถึง 11-03 | ก่อนรีดีไซน์ (`7c1f7c5`, `545d3df`) | 1530–2146 ms | ผ่านทุกคืน |
| 2026-11-03 ถึง 11-19 | หลังรีดีไซน์หน้าแรก PR #14–16 (`ac0c4b0` ขึ้นไป) | 2860–3056 ms | ล้มเป็นระยะ: 11-12 (3016), 11-15 (3015), 11-18 (3031), 11-19 (3056 ms) |
| 2026-11-19 หลัง PR #28 | `725e44f` | **2311 ms** (TTI 2270, TBT 125, Accessibility 1.00) | **ผ่าน** ([44484722787](https://github.com/MiaMaiMaXD/fretpath/actions/runs/44484722787)) |

**สาเหตุ** (ตรวจจากรายงาน Lighthouse ที่ CI อัปโหลด และทดลอง A/B ในเครื่อง):

1. `app/loading.tsx` อยู่ที่ root จึงครอบหน้าแรกซึ่งเป็นหน้า static ด้วย HTML ที่ prerender ไว้ส่ง fallback ของหน้าโหลดก่อน แล้วซ่อนเนื้อหาจริงไว้ใน `<div hidden id="S:0">` รอ script ของ React (`$RC`) สลับให้แสดง รูป hero โหลดเสร็จใน < 0.1 วินาที แต่ "element render delay" ของ LCP 1–2 วินาที และเพราะ Lighthouse (โหมด simulate) นับทุก request ที่เริ่มก่อนจังหวะวาดนั้น ฟอนต์และ JS ทั้งหมดจึงถูกนับเข้า LCP
2. ทุกหน้า preload ฟอนต์ 14 ไฟล์ (~191 KB): IBM Plex Sans Thai ทุกน้ำหนัก (เพิ่มใน PR #14) + Inter และ Noto Sans Thai จาก root layout ที่หน้าแรกไม่ได้ใช้

**การแก้** (PR #28): ย้ายหน้าโหลดไปไว้ใน `app/(admin)/loading.tsx` (`(learner)` มีของตัวเองอยู่แล้ว) และตั้ง `preload: false` ให้ฟอนต์ทั้ง 3 ตระกูล — ฟอนต์ที่หน้าแรกโหลดลดจาก 191 KB เหลือ 68 KB

| build (Lighthouse ในเครื่อง ตั้งค่าเดียวกับ `lighthouserc.json`) | LCP มัธยฐาน | รอบที่วัดได้ (ที่เหลือ NO_LCP) |
|---|---|---|
| ก่อนแก้ (`main` 123236a) | 3990 ms | 3/11 |
| ปิด preload ฟอนต์อย่างเดียว | 3613 ms | 7/12 |
| ปิด preload + ย้ายหน้าโหลดออกจาก root (PR #28) | 3095 ms | 10/12 |

ค่าในเครื่องสูงกว่า CI ประมาณ 1 วินาทีเพราะต่างสภาพแวดล้อม แต่ส่วนที่ลดลง (~900 ms) ตรงกับส่วนที่เพิ่มขึ้นหลัง `ac0c4b0` และ nightly บน production ยืนยันผล

บันทึกเดิม (ก่อนมีผล production): ค่าในเครื่องใกล้เส้น 3 วินาทีมาก ต้นเหตุที่สงสัยคือ render delay ของข้อความไทยที่รอ web font (ยังไม่ได้พิสูจน์) ค่าบน production (CDN ของ Vercel) ต่างจากในเครื่องได้ จึงให้รอบ nightly แรกบน production เป็นตัวตัดสิน NFR-07 — ถ้า TTI ยังเกิน ให้เปิด defect ตามเทมเพลต แล้วลองลดเวลาโหลดฟอนต์ก่อนพิจารณาปรับเกณฑ์

## 7. Defect (ตาม severity)

ตรวจจาก GitHub Issues label `bug`: `gh issue list --label bug --state all` เมื่อ 2026-11-19 — **2 issue ปิดแล้วทั้งคู่ เปิดอยู่ 0** (รอบ 2026-10-20 ไม่พบ issue ใดเลย ข้อบกพร่องที่พบระหว่างพัฒนาแผนที่ 1–4 ถูกแก้ใน PR ของแผนนั้น ๆ โดยตรง ไม่ได้เปิดเป็น issue)

| Severity | เปิดอยู่ | ปิดแล้ว | รวม |
|---|---|---|---|
| Critical | 0 | 0 | 0 |
| High | 0 | 0 | 0 |
| Medium | 0 | 2 | 2 |
| Low | 0 | 0 | 0 |

| Issue | Severity / Priority | พบที่ | สรุป | แก้ใน | สถานะ |
|---|---|---|---|---|---|
| [#29](https://github.com/MiaMaiMaXD/fretpath/issues/29) | Medium / P2 | Production, 2026-11-09 (TC-LSN-01) | ตาราง markdown ในบท building-triads และ chords-in-a-key แสดงเป็นข้อความดิบที่มี `\|` เพราะ `LessonMarkdown` ไม่มี GFM อยู่บน production ประมาณ 1 ชั่วโมง | PR #20 (`fe5c442`) เพิ่ม `remark-gfm` + unit test | ปิดแล้ว |
| [#30](https://github.com/MiaMaiMaXD/fretpath/issues/30) | Medium / P2 | Nightly `production`, 2026-11-12 ถึง 11-19 (TC-PERF-01) | หน้าแรกเกินเกณฑ์ NFR-07: LCP/TTI มัธยฐาน 3015–3056 ms (รายละเอียดหัวข้อ 6.1) | PR #28 (`725e44f`) | ปิดแล้ว — nightly 2026-11-19 LCP 2311 ms |

หมายเหตุ: ทั้งสองข้อพบบน production หลังรอบ 2026-10-20 issue เปิดย้อนหลังเมื่อ 2026-11-19 หลังแก้แล้ว เพื่อบันทึกตามเทมเพลต `.github/ISSUE_TEMPLATE/defect.yml` ส่วน defect ที่พบในเครื่องระหว่างพัฒนาก่อน merge ไม่ได้เปิดเป็น issue

## 8. ผลตรวจเกณฑ์จบการทดสอบ (Exit criteria, สเปก 6.1)

| # | เกณฑ์ | สถานะ ณ 2026-10-20 | หลักฐาน / สิ่งที่ต้องทำ |
|---|---|---|---|
| 1 | ทุก requirement ระดับ M มี TC อย่างน้อย 1 ข้อใน RTM | **ผ่าน** | `npm run qa:stats`: "requirement ระดับ M ที่ยังไม่มี TC: 0" (M 42/42) |
| 2 | TC ระดับ M ผ่าน 100% | **ยังไม่ตัดสิน** — (ก) nightly `production` เขียวแล้ว (2026-11-19 หลังแก้ #30, หัวข้อ 3.3 และ 6.1) และ `full-suite` ผ่านครบ 3 โปรเจกต์; (ข) Manual ผ่านแล้วทุกข้อยกเว้น TC-MOB-03 (iPhone จริง) — TC-PRD-05 ผ่านกับ flow รหัส OTP 2026-11-18 | <!-- รอผล: ตัดสินเมื่อ (ก) nightly `production` เขียว (หัวข้อ 3.3, 6) และ (ข) Manual TC ที่ผูกกับ requirement ระดับ M ผ่านครบ (หัวข้อ 4): TC-SEC-15, SEC-16, QZ-08, QZ-11, QZ-13, QZ-15, DSH-06, MOB-03, PRD-05, OPS-02, OPS-03 (ส่วนตรวจ artifact ที่ดาวน์โหลดด้วยมือ), OPS-04 — เติม "ผ่าน/ไม่ผ่าน" พร้อมวันที่ (TC-AUTH-18 ผูกกับ FR-01.7 ระดับ S) --> |
| 3 | ไม่มี defect Critical/High ที่ยังเปิดอยู่ | ณ 2026-11-19 issue `bug` ทั้งหมด 2 ข้อ (Medium) ปิดแล้วทั้งคู่ เปิดอยู่ 0 (หัวข้อ 7) — **ตัดสินจริงเมื่อจบการทดสอบ production** | <!-- รอผล: รัน `gh issue list --label bug --state open` ตอนปิดโครงการ แล้วเขียนผลและวันที่ --> |

สรุปการปิด: <!-- รอผล: เขียน 1–2 ประโยคว่า "ผ่านเกณฑ์จบทั้ง 3 ข้อ เมื่อวันที่ … โดย …" หรือระบุข้อที่ยังไม่ผ่านและแผนแก้ — ทำหลังเติมหัวข้อ 3.3, 4, 6, 7 ครบ -->

## 9. ความเสี่ยงที่เหลือและงานต่อ

| # | รายการ | ผลกระทบ / สถานะ | ทางออก |
|---|---|---|---|
| 1 | **UI ตามต้นแบบ FretPath ทำแล้วเกือบครบ** | ทำแล้ว (PR #14–#27): หน้าแรก, dashboard, เส้นทาง, บันทึกการฝึก, โปรไฟล์, หน้า auth ทั้งหมด และหน้าโหลด; หน้าแอดมินยังเป็นดีไซน์เดิม และหน้าแรกยังไม่มีส่วนแนะนำผู้สอน/อีเมลติดต่อ (รอข้อมูลจริงจากทีม) | งานต่อ (นอกแผน) |
| 2 | **CSP แบบ nonce** | ตอนนี้ `script-src` ยังต้องมี `'unsafe-inline'` (ดู `next.config.ts`); TC-SEC-24/25 ตรวจ header และ guard แล้ว แต่ยังไม่เข้มสุด | งานต่อ (นอกแผน) |
| 3 | **หน้าจัดการหลายคอร์ส (admin)** | หลังบ้านรองรับการทำงานกับคอร์สเดียว ("กีตาร์พื้นฐาน") | งานต่อ (นอกแผน) |
| 4 | ~~Lighthouse TTI/LCP ใกล้หรือเกินเส้น 3 วินาที~~ **ปิดแล้ว** | ในเครื่อง TTI 3.1–3.3 วินาที แต่บน production (2026-10-20) LCP/TTI 2298 ms ผ่านเกณฑ์; หลังรีดีไซน์หน้าแรกกลับมาเกินเป็นระยะ (defect #30) แก้ใน PR #28 แล้ว 2026-11-19 LCP 2311 ms | เฝ้าดูค่าใน job summary ของ nightly ทุกคืน; เมื่อเพิ่มฟอนต์หรือ `loading.tsx` ใหม่ ให้ตรวจว่าไม่ครอบหน้า static และไม่ preload ฟอนต์ที่หน้านั้นไม่ใช้ (หัวข้อ 6.1) |
| 5 | ~~จำนวน schema error ใน restore-check ไม่เป็นเกณฑ์ตัดสิน~~ **ปิดแล้ว** | `scripts/backup-check.sh` ล้มเมื่อ schema/data error > 0, lessons < 1, users < 1 หรือ profiles ≠ users; backup run แรกบน production (2026-10-20) ได้ error 0 ทั้งสองส่วน | ถ้าภายหลังเจอ error ที่ไม่มีผล ผ่อนเกณฑ์ผ่าน `ALLOW_*` ตาม `docs/deploy/backup-restore.md` (ผ่าน PR) |
| 6 | **ชื่อเมนูใน dashboard ของ Supabase/Vercel/Google ในคู่มือ deploy ยังไม่ได้ยืนยันกับหน้าจอจริง** | หน้าจอผู้ให้บริการเปลี่ยนได้; คู่มือใน `docs/deploy/*.md` ยังไม่เคยทำตามบนบัญชีจริง | ทีมแก้ชื่อเมนูในคู่มือเมื่อทำตามจริงครั้งแรก |
| 7 | Safari บน iPhone ไม่มีเทสต์อัตโนมัติ | ความเสี่ยงเรื่องเสียงและเลย์เอาต์เฉพาะ WebKit | TC-MOB-03 (Manual) |
| 8 | GitHub ปิด scheduled workflow เมื่อ repo ไม่มีความเคลื่อนไหว 60 วัน | keep-alive/nightly/backup หยุดเงียบ ๆ | ขั้นตอนเปิดใหม่ใน `docs/deploy/secrets.md`; ตรวจแท็บ Actions เป็นระยะ |
| 9 | Supabase Free อาจถูกหยุดถ้า keep-alive ล้มหลายรอบ | กระทบ NFR-05 | TC-OPS-01/02, backup รายสัปดาห์เก็บ 90 วัน |
| 10 | ~~กราฟ "คะแนนสูงสุดรายบท" ให้ค่า 0 กับบทที่ยังไม่สอบ (พบใน TC-DSH-06, 2026-10-23)~~ **ปิดแล้ว** | screen reader เคยอ่าน "บท 3 0 %" เหมือนสอบได้ 0% (ระดับ Low) ตอนนี้บทที่ยังไม่สอบส่งค่า `null` และอ่านว่า "ยังไม่สอบ" | `lib/chart.ts` + `tests/unit/chart.test.ts`; E2E TC-DSH-03 ตรวจ `aria-label` เพิ่ม |

## 10. ภาคผนวก

- สคริปต์เดโม 10 นาที (เส้นทางหลัก 1–3 ของสเปก 6.3 บน production): [`../demo.md`](../demo.md)
- คู่มือขึ้นระบบ: `docs/deploy/` (production-checklist, supabase, vercel, google, secrets, backup-restore)
- วิธีรันซ้ำ: `npx supabase test db` · `npm run test:unit` · `npx playwright test --project=chromium` · `PROD_URL=<url> npx playwright test --project=prod` (อ่านอย่างเดียว) · `npm run qa:stats`
