# CI บน Pull Request

> **สถานะ: ตรวจสอบแล้ว (2026-10-19)** — CI ทำงานจริงทั้งกรณีล้มและผ่าน และตั้ง branch protection บน `main` แล้ว
> หลักฐานเป็นลิงก์ไปยัง PR / รันของ GitHub Actions ด้านล่าง (ถ้าอาจารย์ต้องการภาพหน้าจอ ให้เปิดลิงก์แล้วบันทึกภาพเพิ่มในโฟลเดอร์ `docs/qa/img/`)

## Workflow

ไฟล์: `.github/workflows/ci.yml` — job id และชื่อ check คือ `ci`

Trigger: `pull_request` ไป `main` และ `push` ไป `main` (รันเก่าของ PR เดียวกันจะถูกยกเลิกอัตโนมัติ; รันบน `main` ไม่ถูกยกเลิก)

ลำดับขั้นตอนใน job: `npm ci` → ติดตั้ง Supabase CLI (2.121.0 ตรงกับ devDependency) → `supabase start` → `supabase test db` (pgTAP ทุกไฟล์ใน `supabase/tests/`: 001–007, 011, 012, 017–021)
→ `npm run lint` → `npm run typecheck` → `npm run test:unit` (Vitest) → ตั้ง env จาก `supabase status -o env` → `npm run build` → ติดตั้ง Chromium
→ `playwright test --project=chromium --grep "@smoke|@security"` → อัปโหลด `playwright-report/` เป็น artifact (ทุกครั้ง เก็บ 14 วัน)

หมายเหตุ: คีย์ที่ใช้เป็นคีย์ demo ของ Supabase local stack ใน runner จึงไม่ต้องตั้ง GitHub Secrets

## Workflow ทั้งหมด

| Workflow | ไฟล์ | Trigger | เวลา (UTC / ไทย) | ทำอะไร | Secrets ที่ต้องใช้ |
|---|---|---|---|---|---|
| `ci` | `ci.yml` | `pull_request` และ `push` ไป `main` | ตามการเปิด PR / push | pgTAP, lint, typecheck, Vitest, build, Playwright `@smoke\|@security` บน Chromium | ไม่มี (ใช้คีย์ demo ของ Supabase local) |
| `nightly` | `nightly.yml` | `schedule` + `workflow_dispatch` | 19:00 UTC / 02:00 น. ทุกคืน | job `full-suite`: Playwright ทุกป้ายบน `chromium`, `firefox`, `mobile` กับ build + Supabase local; job `production`: smoke อ่านอย่างเดียว (`--project=prod`) แล้ว Lighthouse (NFR-07) | `PROD_URL`, `PROD_SUPABASE_URL`, `PROD_SUPABASE_ANON_KEY` (ใช้เฉพาะ job `production`) |
| `keep-alive` | `keep-alive.yml` | `schedule` + `workflow_dispatch` | 01:00 UTC / 08:00 น. ทุก 2 วัน | เรียก `/api/health` บน production ไม่ให้ Supabase Free ถูกหยุด (NFR-05) | `PROD_URL` |
| `backup` | `backup.yml` | `schedule` + `workflow_dispatch` | 20:00 UTC เสาร์ / 03:00 น. อาทิตย์ ทุกสัปดาห์ | dump ฐานข้อมูล production เข้ารหัส ตรวจกู้คืนได้ แล้วอัปโหลด artifact 90 วัน (NFR-06) | `SUPABASE_DB_URL` (Session Pooler), `BACKUP_PASSPHRASE` |

## Nightly: เทสต์เต็ม, smoke production และ Lighthouse

- `full-suite` ใช้ขั้นตอนเดียวกับ `ci` (Supabase CLI 2.121.0, env จาก `supabase status`, `npm run build`) แต่ติดตั้ง Chromium + Firefox และรัน `npx playwright test --project=chromium --project=firefox --project=mobile` (ทุกป้าย ไม่รวม `prod`); `timeout-minutes: 60`; รายงาน `playwright-report` เก็บ 14 วัน
- `production` ไม่เริ่ม Supabase local; ล้มทันทีถ้า secret `PROD_URL` ว่าง; secret ของ production ถูกส่งเป็น env เฉพาะ job นี้ (`full-suite` มองไม่เห็น); รัน `--project=prod` (อ่านอย่างเดียว) ก่อน แล้ว (Lighthouse รันต่อแม้ smoke ล้ม, ยกเว้นถูกยกเลิก) `npx lhci autorun --collect.url="${PROD_URL%/}/"`; อัปโหลดรายงาน `playwright-report-production` และ `lighthouse-report` (`.lighthouseci/`, 14 วัน)
- `lighthouserc.json`: 3 รอบ, Chrome flags `--no-sandbox --disable-dev-shm-usage` (กัน sandbox ล้มบน runner), โปรไฟล์มือถือเริ่มต้นของ Lighthouse (ไม่ตั้ง `preset`; Moto G Power + slow 4G), assert (ใช้ค่ามัธยฐานของ 3 รอบ `aggregationMethod: median`) `largest-contentful-paint` ≤ 3000 ms (error), `interactive` ≤ 3000 ms (error), `categories:accessibility` ≥ 0.9 (warn); URL ของ production ไม่อยู่ในไฟล์ (ส่งผ่าน env)
- เกณฑ์เหล่านี้ตรวจ NFR-07 "หน้าหลักโหลดเสร็จภายใน 3 วินาทีบน 4G" (TC-PERF-01) — Lighthouse ที่ติดมากับ `@lhci/cli` คือ 12.6.1 ซึ่งยังมี audit `interactive` (TTI) อยู่ (เป็น audit น้ำหนัก 0 ที่ซ่อนในคะแนน แต่ assert ได้); ถ้าอัปเกรดแล้ว audit นี้หายไป ให้แทนด้วย `largest-contentful-paint` ≤ 3000 และ `total-blocking-time` ≤ 200
- ค่าที่วัดในเครื่อง (build production, `localhost`, 3 รอบ): LCP 3301 / 2868 / 2934 ms, TTI 3301 / 3141 / 3166 ms, TBT 202 / 170 / 91 ms, Accessibility 1.00 — ใกล้เส้น 3 วินาที (ต้นเหตุหลักคือ render delay ของข้อความไทยที่รอ web font) ค่าบน production (CDN ของ Vercel) ต้องวัดจริงตอนรัน `nightly` ครั้งแรกแล้วบันทึกใน test-summary

## ความครอบคลุมของ `--grep "@smoke|@security"` หลังแผนที่ 2 (ตรวจเมื่อ 2026-10-19)

ตรวจด้วย `npx playwright test --project=chromium --grep "@smoke|@security" --list` — `ci.yml` **ไม่ต้องแก้**: ค่า grep เดิมครอบคลุม UI `@smoke` ใหม่ทั้งหมดแล้ว และโปรเจกต์ `setup`/`teardown` ถูกดึงมารันเป็น dependency ตามปกติ (จึงมี `e2e/.auth/member.json` ให้เทสต์ที่ใช้ `MEMBER_STATE`) รวม 33 รายการ = setup 1 + teardown 1 + `e2e/api` 13 + UI 18

UI `@smoke` ที่เพิ่ม (16 เทสต์): TC-AUTH-01, TC-AUTH-04, TC-AUTH-08, TC-AUTH-09 · TC-PATH-14, TC-PATH-16, TC-PATH-17 · TC-QZ-21, TC-QZ-22, TC-QZ-23, TC-QZ-25 · TC-PRC-02, TC-PRC-04, TC-PRC-07 · TC-DSH-02, TC-DSH-05
UI `@security` ที่เพิ่ม (2 เทสต์): TC-AUTH-07, TC-PRC-05
(TC-QZ-22, TC-QZ-23, TC-PRC-04, TC-PRC-07, TC-AUTH-08 เป็น Review Focus ที่ติด `@smoke` เพื่อให้ CI คุมได้)
(ที่เหลือใน `e2e/specs/` เป็น `@regression` ล้วน — รันในเครื่องบน `chromium`, `firefox`, `mobile` ไม่รันใน CI ตามการออกแบบ)

## ความครอบคลุมของ `--grep "@smoke|@security"` หลังแผนที่ 3 (ตรวจเมื่อ 2026-10-20)

ตรวจด้วย `npx playwright test --project=chromium --grep "@smoke|@security" --list` — `ci.yml` **ยังไม่ต้องแก้**: ค่า grep เดิมครอบคลุมเทสต์หลังบ้านแอดมินที่ติด `@smoke`/`@security` ทั้งหมดแล้ว รวม **48 รายการ** = setup 1 + teardown 1 + `e2e/api` 16 + UI 30 (แผนที่ 2 เดิม 33 รายการ เพิ่ม 15)

เพิ่มในแผนที่ 3:
- `@smoke` (5 เทสต์): TC-ADM-03, TC-ADM-04, TC-ADM-09, TC-ADM-18 (admin smoke) · TC-AUTH-11 (ลิงก์ยืนยันอีเมลข้ามอุปกรณ์)
- `@security` (8 เทสต์): TC-SEC-19, TC-SEC-20, TC-SEC-21, TC-SEC-22, TC-SEC-23, TC-SEC-25, TC-AUTH-14 (UI/ระดับ DB ผ่าน spec) · TC-SEC-24 ทำงาน 3 รายการ (`/`, `/login`, `/api/health`) ใน `e2e/api/headers.spec.ts`
(สรุป: UI เพิ่ม 12 = smoke 5 + security 7 ; `e2e/api` เพิ่ม 3 จาก TC-SEC-24; ที่เหลือใน `e2e/specs/` เป็น `@regression` ล้วน — รันในเครื่องบน `chromium`, `firefox`, `mobile` ไม่รันใน CI ตามการออกแบบ)

### เวลารันและ timeout

- ค่าจริงจาก PR #4 (แผนที่ 2): check `ci` **เขียว** ใช้เวลา **3 นาที 50 วินาที** — [รัน Actions 39352770279](https://github.com/MiaMaiMaXD/fretpath/actions/runs/39352770279) (Vitest + pgTAP + build + Playwright `@smoke|@security` บน Chromium)
- ต่ำกว่า `timeout-minutes: 30` มาก จึงยังไม่แยก step หรือปรับ `--workers` (`workers` ใน `playwright.config.ts`: 4 ในเครื่อง, ค่าเริ่มต้นของ Playwright ใน CI, override ด้วย `PW_WORKERS`; retry ใน CI = 1 ครั้ง)
- ชุด `@smoke`/`@security` โตจาก 33 เป็น 48 รายการในแผนที่ 3 — ค่าเวลาที่บันทึกข้างต้นยังเป็นของแผนที่ 2 (PR #4) ให้อัปเดตเมื่อ PR ของแผนที่ 3 รันบน CI จริง; ถ้าเกิน ~20 นาที ให้แยก UI smoke เป็น step ของตัวเอง (เก็บ `timeout-minutes: 30` ไว้)
- ความเสี่ยง: เทสต์ที่ผูกกับ Mailpit/Supabase local ต้องการให้ `supabase start` เปิด Mailpit (พอร์ต 54324) ซึ่งเป็นค่าเริ่มต้นของ CLI 2.121.0 — ยืนยันซ้ำเมื่อเห็นรันจริงครั้งแรก

## ผลการตรวจสอบ CI

### 1) PR ทดสอบที่ต้องล้ม — ผ่านการตรวจ (CI แดงตามคาด)

- PR: [#2 ทดสอบว่า CI จับการรั่วของเฉลยได้](https://github.com/MiaMaiMaXD/fretpath/pull/2) — ปิดทิ้งโดยไม่ merge และลบ branch แล้ว
- สิ่งที่ทำ: เพิ่ม migration ชั่วคราว
  `create policy ci_check_leak_answer_keys on public.quiz_answer_keys for select to authenticated using (true);`
- ผล: check `ci` **แดง** — [รัน Actions 39253384688](https://github.com/MiaMaiMaXD/fretpath/actions/runs/39253384688)
  ล้มที่ขั้น **Database tests (pgTAP)**: `Failed test 1: "test_member_cannot_read_answer_keys"` พร้อมแสดงแถวเฉลยที่รั่ว
- ข้อสังเกต: ช่องโหว่นี้ถูก pgTAP จับได้ก่อนถึงขั้น Playwright (`TC-SEC-01`) job จึงหยุดก่อนและไม่มี `playwright-report` ให้ดาวน์โหลดในรันนี้
  — เป็นการป้องกันสองชั้นตามที่ออกแบบ (ฐานข้อมูล + API) ส่วนการพิสูจน์ว่า Playwright `TC-SEC-01..06` จับได้เองทำไว้ในเครื่องแล้ว
  (รันโดยถอด migration RLS ออก: 6 เคสล้มทั้งหมด — ดู Task 9 ในแผนที่ 1)

### 2) PR จริง — ผ่านการตรวจ (CI เขียว)

- PR: [#1 แผนที่ 1: ฐานข้อมูล ความปลอดภัย และระบบทดสอบ](https://github.com/MiaMaiMaXD/fretpath/pull/1) — merge แล้ว
- ผล: check `ci` **เขียว** ใช้เวลา 4 นาที 42 วินาที — [รัน Actions 39240741404](https://github.com/MiaMaiMaXD/fretpath/actions/runs/39240741404)

## Branch protection บน `main` — ตั้งแล้ว

ตั้งผ่าน GitHub API (`PUT /repos/MiaMaiMaXD/fretpath/branches/main/protection`) ค่าที่ใช้:

| การตั้งค่า | ค่า |
|---|---|
| Require a pull request before merging | เปิด, Required approvals = **1** |
| Require status checks to pass before merging | เปิด, check ที่บังคับ = **`ci`** |
| Require branches to be up to date before merging | เปิด (`strict: true`) |
| Include administrators | ปิด (`enforce_admins: false`) |

ดูหรือแก้ได้ที่ GitHub repo → **Settings → Branches** → กฎของ `main`

ผลที่ตามมา: ทุกการเปลี่ยนแปลงเข้า `main` ต้องเปิด PR, check `ci` ต้องเขียว และต้องมีสมาชิกอีกคน (QA) approve 1 ครั้ง — GitHub ไม่ให้ approve PR ของตัวเอง
