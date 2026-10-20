# FretPath — Test Summary Report

เวอร์ชัน 1.0 (ร่างโดย Dev 2026-10-20) · อ้างอิงสเปก `docs/superpowers/specs/2026-10-19-fretpath-design.md` หัวข้อ 6.1 · เอกสารที่เกี่ยวข้อง: `test-plan.md`, `test-cases.md`, `rtm.md`, `ci.md`, `../demo.md`

> **สถานะเอกสาร: ยังไม่ปิด** — ส่วนที่ทราบผลแล้ว (จำนวน TC, ผลรอบในเครื่อง, CI, ความครอบคลุม RTM) กรอกครบแล้ว ส่วนที่ต้องมี production ยังไม่มีผล เพราะ production ยังไม่ถูกสร้าง (ทีมสร้างตาม `docs/deploy/*.md`) ช่องเหล่านั้นทำเครื่องหมายเป็น `<!-- รอผล: … -->` พร้อมบอกว่าต้องใส่อะไรและเอามาจากไหน ทีม/QA เติมใน Task 9 Step 6 แล้ว commit ผ่าน PR **ห้ามเดาตัวเลขหรือเขียนว่า "ผ่าน" ในช่องที่ยังไม่ได้รันจริง**

## 1. ขอบเขตและรอบการทดสอบ

**ขอบเขต:** requirement ทั้ง 48 ข้อ — FR-01 … FR-07 (41 ข้อ) และ NFR-01 … NFR-07 (7 ข้อ) ตามสเปกข้อ 2 ไม่รวมระบบชำระเงิน อีเมลแจ้งเตือนผู้เรียน หน้าจัดการหลายคอร์ส และแอปมือถือ (นอกขอบเขตตามสเปกข้อ 2.3)

| รอบ | วันที่ | สภาพแวดล้อม | สิ่งที่รัน | สถานะ |
|---|---|---|---|---|
| รอบในเครื่อง (Dev) | 2026-10-20 | Local: Supabase CLI (Docker) + seed, Next.js ในเครื่อง | pgTAP, Vitest, Playwright `chromium` (ทุกป้าย) | เสร็จ — ผลในหัวข้อ 3.1 |
| CI ต่อ PR | ทุก PR / push ไป `main` | GitHub Actions + Supabase local | pgTAP, lint, typecheck, Vitest, build, Playwright `chromium` `@smoke`/`@security` | `main` เขียวล่าสุด 2026-10-20 — หัวข้อ 3.2; PR ของแผนที่ 4 <!-- รอผล: ลิงก์รัน CI ของ PR แผนที่ 4 (Actions > CI > branch `plan-4-production`) หลังเปิด PR --> |
| Nightly `full-suite` | ทุกคืน 02:00 น. | GitHub Actions + Supabase local | Playwright ทุกป้ายบน `chromium`, `firefox`, `mobile` | <!-- รอผล: ผลรัน nightly ล่าสุด หัวข้อ 3.3 --> |
| Nightly `production` | ทุกคืน 02:00 น. | Production (อ่านอย่างเดียว) | Playwright `--project=prod` (TC-PRD) แล้ว Lighthouse (TC-PERF-01) | <!-- รอผล: ผลรัน nightly ล่าสุด หัวข้อ 3.3 และ 6 --> |
| ทดสอบด้วยมือ (Manual) | <!-- รอผล: วันที่ทำ --> | Local/Preview, production และอุปกรณ์จริง | Manual TC ทั้ง 11 ข้อ | <!-- รอผล: สรุปจากหัวข้อ 4 --> |

## 2. จำนวน Test Case

ผลของ `npm run qa:stats` เมื่อ 2026-10-20 (สคริปต์ `scripts/tc-stats.mjs` อ่านตารางจริงใน `test-cases.md` และ `rtm.md`; พิมพ์ซ้ำได้ทุกเมื่อ ตัวเลขในหัวข้อนี้คือผลที่สคริปต์พิมพ์)

```text
TC ทั้งหมด: 148

จำนวน TC ต่อพื้นที่:
  TC-AUTH: 18
  TC-LSN: 6
  TC-PATH: 19
  TC-QZ: 28
  TC-PRC: 9
  TC-DSH: 6
  TC-ADM: 20
  TC-SEC: 26
  TC-MOB: 5
  TC-PERF: 1
  TC-PRD: 6
  TC-OPS: 4

Automated: 137 (ในนี้ automate เฉพาะบางส่วน ส่วนที่เหลือเป็น Manual: 3)
Manual: 11

ความสำคัญ: High 112 · Medium 34 · Low 2

requirement ทั้งหมด: 48 ข้อ; มี TC แล้ว 48 ข้อ
  M: 42/42 มี TC
  S: 4/4 มี TC
  C: 2/2 มี TC
requirement ระดับ M ที่ยังไม่มี TC: 0
```

สรุป: 148 TC — Automated 137, Manual 11 (ใน Automated มี 3 ข้อที่ automate เฉพาะบางส่วน ส่วนที่เหลือเป็น Manual: TC-QZ-18, TC-QZ-20 ส่วน UI และ TC-OPS-04 ส่วนกู้คืนจริง)

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
| CI ของ PR แผนที่ 4 | `plan-4-production` | <!-- รอผล: ผล (success/failure) ของ check `ci` ของ PR แผนที่ 4 จาก GitHub > Actions > CI หลังเปิด PR (branch ยังไม่ถูก push ณ 2026-10-20) --> | <!-- รอผล: ลิงก์รัน --> |

CI ตั้ง branch protection บน `main` แล้ว (ต้องผ่าน check `ci` + approve 1 ครั้ง) รายละเอียดและหลักฐานการตรวจ CI ทั้งกรณีล้มและผ่านอยู่ใน `ci.md`

### 3.3 Nightly (ทุกคืน)

<!-- รอผล: หลังสร้าง production และตั้ง secret ตาม docs/deploy/secrets.md ให้เปิด Actions > Nightly > Run workflow (หรือรอรอบ 02:00 น.) แล้วเติมตารางนี้จากรันล่าสุดที่เสร็จ: ลิงก์ run, วันที่ และจำนวนผ่าน/ทั้งหมดต่อ project ที่ Playwright รายงานในขั้น "Playwright (all tags, all browsers)" (full-suite) กับ "Production smoke (read-only)" (production) -->

| Job / project | ผ่าน/ทั้งหมด | ลิงก์รัน | วันที่ |
|---|---|---|---|
| `full-suite` — `chromium` | <!-- รอผล: x/y --> | <!-- รอผล: ลิงก์ --> | <!-- รอผล --> |
| `full-suite` — `firefox` | <!-- รอผล: x/y --> | <!-- รอผล: ลิงก์ --> | <!-- รอผล --> |
| `full-suite` — `mobile` (Pixel 7) | <!-- รอผล: x/y --> | <!-- รอผล: ลิงก์ --> | <!-- รอผล --> |
| `production` — `prod` (TC-PRD-01…04, 06) | <!-- รอผล: x/5 --> | <!-- รอผล: ลิงก์ --> | <!-- รอผล --> |
| pgTAP / Unit | ดูหัวข้อ 3.1–3.2 (nightly ไม่รัน pgTAP/Unit แยก) | — | — |

## 4. ผล Manual TC (11 ข้อ)

TC เหล่านี้ไม่มีเทสต์อัตโนมัติ (หรือมีเฉพาะบางส่วน) ต้องทำด้วยมือบนอุปกรณ์หรือ production จริง ขั้นตอนอยู่ในแถวของ TC นั้นใน `test-cases.md` บันทึก **วันที่ ผู้ทดสอบ ผล (ผ่าน/ไม่ผ่าน) และหลักฐาน** (ภาพหน้าจอเก็บใน `docs/qa/img/` แล้วลิงก์ที่นี่ หรือลิงก์ run/issue)

| TC | ทดสอบอะไร | ทำที่ไหน | วันที่ | ผู้ทดสอบ | ผล | หลักฐาน |
|---|---|---|---|---|---|---|
| TC-SEC-15 | ผู้เรียนอ่านความคืบหน้า ผลสอบ และ enrollments ของผู้อื่นไม่ได้ | Local/Preview | <!-- รอผล: วันที่ --> | <!-- รอผล: ชื่อ --> | <!-- รอผล: ผ่าน/ไม่ผ่าน --> | <!-- รอผล: ภาพหน้าจอ/ลิงก์ --> |
| TC-SEC-16 | ไม่มี service role key ในโค้ดฝั่งเบราว์เซอร์ | Local/Preview | <!-- รอผล --> | <!-- รอผล --> | <!-- รอผล --> | <!-- รอผล --> |
| TC-QZ-08 | สอบผ่านซ้ำที่บทสุดท้าย | Local/Preview | <!-- รอผล --> | <!-- รอผล --> | <!-- รอผล --> | <!-- รอผล --> |
| TC-QZ-11 | สอบไม่ผ่านซ้ำที่บทสุดท้าย | Local/Preview | <!-- รอผล --> | <!-- รอผล --> | <!-- รอผล --> | <!-- รอผล --> |
| TC-QZ-13 | คะแนน 59% ที่ `pass_score` 60 ไม่ผ่าน | Local/Preview | <!-- รอผล --> | <!-- รอผล --> | <!-- รอผล --> | <!-- รอผล --> |
| TC-QZ-15 | การปัดแบบ half-up: 1/8 = 12.5 → 13 | Local/Preview | <!-- รอผล --> | <!-- รอผล --> | <!-- รอผล --> | <!-- รอผล --> |
| TC-DSH-06 | กราฟคะแนนสูงสุดรายบทแสดงค่าตรงกับผลสอบ (FR-06.3) | Local/Preview | <!-- รอผล --> | <!-- รอผล --> | <!-- รอผล --> | <!-- รอผล --> |
| TC-MOB-03 | เส้นทางหลักและเสียงดีดสายบน Safari ของ iPhone จริง (NFR-03) | iPhone จริง | <!-- รอผล --> | <!-- รอผล --> | <!-- รอผล --> | <!-- รอผล: ภาพหน้าจอ/คลิป --> |
| TC-PRD-05 | ลิงก์ยืนยันอีเมลและรีเซ็ตรหัสผ่านบน production ใช้ได้จากอีกอุปกรณ์ | Production + โทรศัพท์ | <!-- รอผล --> | <!-- รอผล --> | <!-- รอผล: ผลสมัคร/ยืนยัน และผลลืมรหัสผ่าน (ช่องท้าย `docs/deploy/vercel.md`) --> | <!-- รอผล: ภาพหน้าจอ --> |
| TC-AUTH-18 | ล็อกอินด้วย Google บน production | Production | <!-- รอผล --> | <!-- รอผล --> | <!-- รอผล: ผ่าน/ไม่ผ่าน (ถ้า `redirect_uri_mismatch` ดู `docs/deploy/google.md`) --> | <!-- รอผล: ภาพหน้าจอ --> |
| TC-OPS-02 | GitHub ส่งอีเมลเมื่อ keep-alive ล้ม (รันด้วย input `url` ที่ไม่ใช่ FretPath) | GitHub Actions + กล่องอีเมล | <!-- รอผล --> | <!-- รอผล --> | <!-- รอผล: ผ่าน/ไม่ผ่าน --> | <!-- รอผล: ลิงก์รันที่แดง + ภาพอีเมลที่ได้รับ (ปิดข้อมูลส่วนตัว) --> |

ส่วนที่เป็น Manual หรือต้องตรวจซ้ำด้วยมือของ TC อื่น (ส่วนที่ automate ของ TC เหล่านี้ดูหัวข้อ 3 และ 6):

| TC | ส่วน Manual | วันที่ | ผู้ทดสอบ | ผล | หลักฐาน |
|---|---|---|---|---|---|
| TC-OPS-04 | กู้คืนจาก backup จริงลง Supabase local ตาม `docs/deploy/backup-restore.md` แล้ว `select count(*) from public.lessons;` ≥ 1 | <!-- รอผล --> | <!-- รอผล --> | <!-- รอผล: ผ่าน/ไม่ผ่าน + ค่า count --> | <!-- รอผล: ภาพหน้าจอผลคำสั่ง --> |
| TC-OPS-03 | ดาวน์โหลด artifact แล้ว `file fretpath-backup-*.gpg` ต้องเป็น PGP/GPG encrypted data และไม่มีไฟล์ `.sql` | <!-- รอผล --> | <!-- รอผล --> | <!-- รอผล: ผ่าน/ไม่ผ่าน + ผลบรรทัด `file:` ใน log --> | <!-- รอผล: ลิงก์รัน backup --> |
| TC-QZ-18, TC-QZ-20 | ส่วน UI (ส่วน API/DB อัตโนมัติ) | <!-- รอผล --> | <!-- รอผล --> | <!-- รอผล --> | <!-- รอผล --> |

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
| LCP | ≤ 3000 ms | 3301 / 2868 / 2934 ms (มัธยฐาน 2934) | <!-- รอผล: มัธยฐาน LCP จาก artifact `lighthouse-report` ของ nightly job `production` (หรือ log ขั้น "Lighthouse (NFR-07)") --> |
| TTI | ≤ 3000 ms | 3301 / 3141 / 3166 ms (มัธยฐาน **3166 — เกินเกณฑ์**) | <!-- รอผล: มัธยฐาน TTI จากแหล่งเดียวกัน --> |
| TBT | (ไม่มีเกณฑ์) | 202 / 170 / 91 ms | <!-- รอผล: TBT --> |
| Accessibility | ≥ 0.9 | 1.00 | <!-- รอผล: คะแนน --> |
| ผล assertion | ผ่านทั้งหมด | LCP ผ่าน (มัธยฐาน) แต่ TTI ไม่ผ่านในเครื่อง | <!-- รอผล: ผ่าน/ไม่ผ่าน ตามขั้น Lighthouse ของ nightly; วันที่ + ลิงก์รัน --> |

อ่านผล: ค่าในเครื่องใกล้เส้น 3 วินาทีมาก ต้นเหตุที่สงสัยคือ render delay ของข้อความไทยที่รอ web font (ยังไม่ได้พิสูจน์) ค่าบน production (CDN ของ Vercel) ต่างจากในเครื่องได้ จึงให้รอบ nightly แรกบน production เป็นตัวตัดสิน NFR-07 — ถ้า TTI ยังเกิน ให้เปิด defect ตามเทมเพลต แล้วลองลดเวลาโหลดฟอนต์ก่อนพิจารณาปรับเกณฑ์

## 7. Defect (ตาม severity)

ตรวจจาก GitHub Issues label `bug`: `gh issue list --label bug --state all` เมื่อ 2026-10-20 — **ไม่พบ issue ใดเลย (0)** ข้อบกพร่องที่พบระหว่างพัฒนาแผนที่ 1–4 ถูกแก้ใน PR ของแผนนั้น ๆ โดยตรง ไม่ได้เปิดเป็น issue

| Severity | เปิดอยู่ | ปิดแล้ว | รวม |
|---|---|---|---|
| Critical | 0 | 0 | 0 |
| High | 0 | 0 | 0 |
| Medium | 0 | 0 | 0 |
| Low | 0 | 0 | 0 |

<!-- รอผล: defect ที่พบบน production (จาก Manual TC หัวข้อ 4, nightly หัวข้อ 3.3 และ Lighthouse หัวข้อ 6) — เปิด GitHub Issue ด้วยเทมเพลต `.github/ISSUE_TEMPLATE/defect.yml` (label `bug`) แล้วรัน `gh issue list --label bug --state all` ใหม่ ปรับตารางข้างบนตามจำนวนจริงต่อ severity และใส่ลิงก์ issue ทุกข้อใต้ตาราง -->

## 8. ผลตรวจเกณฑ์จบการทดสอบ (Exit criteria, สเปก 6.1)

| # | เกณฑ์ | สถานะ ณ 2026-10-20 | หลักฐาน / สิ่งที่ต้องทำ |
|---|---|---|---|
| 1 | ทุก requirement ระดับ M มี TC อย่างน้อย 1 ข้อใน RTM | **ผ่าน** | `npm run qa:stats`: "requirement ระดับ M ที่ยังไม่มี TC: 0" (M 42/42) |
| 2 | TC ระดับ M ผ่าน 100% | **ยังไม่ตัดสิน** — ส่วนอัตโนมัติผ่านในเครื่อง/CI แล้ว แต่ส่วนที่ต้องใช้ production และ Manual ยังไม่มีผล | <!-- รอผล: ตัดสินเมื่อ (ก) nightly `production` เขียว (หัวข้อ 3.3, 6) และ (ข) Manual TC ที่ผูกกับ requirement ระดับ M ผ่านครบ (หัวข้อ 4): TC-SEC-15, SEC-16, QZ-08, QZ-11, QZ-13, QZ-15, DSH-06, MOB-03, PRD-05, OPS-02, OPS-03 (ส่วนตรวจ artifact ที่ดาวน์โหลดด้วยมือ), OPS-04 — เติม "ผ่าน/ไม่ผ่าน" พร้อมวันที่ (TC-AUTH-18 ผูกกับ FR-01.7 ระดับ S) --> |
| 3 | ไม่มี defect Critical/High ที่ยังเปิดอยู่ | ณ 2026-10-20 เปิดอยู่ 0 (ไม่มี issue `bug`) — **ตัดสินจริงเมื่อจบการทดสอบ production** | <!-- รอผล: รัน `gh issue list --label bug --state open` ตอนปิดโครงการ แล้วเขียนผลและวันที่ --> |

สรุปการปิด: <!-- รอผล: เขียน 1–2 ประโยคว่า "ผ่านเกณฑ์จบทั้ง 3 ข้อ เมื่อวันที่ … โดย …" หรือระบุข้อที่ยังไม่ผ่านและแผนแก้ — ทำหลังเติมหัวข้อ 3.3, 4, 6, 7 ครบ -->

## 9. ความเสี่ยงที่เหลือและงานต่อ

| # | รายการ | ผลกระทบ / สถานะ | ทางออก |
|---|---|---|---|
| 1 | **UI ตามต้นแบบ FretPath ยังไม่ได้ทำ** | หน้าเว็บทำงานครบตามฟังก์ชันแต่ยังไม่ได้ปรับดีไซน์ตามต้นแบบ | งานต่อ (นอกแผน) |
| 2 | **CSP แบบ nonce** | ตอนนี้ `script-src` ยังต้องมี `'unsafe-inline'` (ดู `next.config.ts`); TC-SEC-24/25 ตรวจ header และ guard แล้ว แต่ยังไม่เข้มสุด | งานต่อ (นอกแผน) |
| 3 | **หน้าจัดการหลายคอร์ส (admin)** | หลังบ้านรองรับการทำงานกับคอร์สเดียว ("กีตาร์พื้นฐาน") | งานต่อ (นอกแผน) |
| 4 | **Lighthouse TTI/LCP ใกล้หรือเกินเส้น 3 วินาที** | ในเครื่อง TTI 3.1–3.3 วินาที (เกินเกณฑ์) และ LCP ก้ำกึ่ง (มัธยฐาน 2.93 วินาที) สงสัยว่าเกิดจาก render delay ของ Thai web font (ยังไม่พิสูจน์) — NFR-07 อาจไม่ผ่านบน production | nightly `production` ครั้งแรกเป็นตัวตัดสิน (หัวข้อ 6); ถ้าไม่ผ่านให้แก้การโหลดฟอนต์ก่อน |
| 5 | **จำนวน schema error ในขั้น restore-check ของ backup ไม่เป็นเกณฑ์ตัดสิน** | `scripts/backup-check.sh` ยอมรับ error ตอน restore ลง Postgres เปล่า (ขาด role/extension ของ Supabase) และล้มเฉพาะเมื่อนับ `public.lessons` ไม่ได้หรือ < 1 — จึงยังไม่จับกรณี schema เสียบางส่วน | ทบทวนหลัง backup run แรกบน production: ดูจำนวน error ที่พิมพ์ แล้วกำหนดเพดานถ้าเหมาะสม |
| 6 | **ชื่อเมนูใน dashboard ของ Supabase/Vercel/Google ในคู่มือ deploy ยังไม่ได้ยืนยันกับหน้าจอจริง** | หน้าจอผู้ให้บริการเปลี่ยนได้; คู่มือใน `docs/deploy/*.md` ยังไม่เคยทำตามบนบัญชีจริง | ทีมแก้ชื่อเมนูในคู่มือเมื่อทำตามจริงครั้งแรก |
| 7 | Safari บน iPhone ไม่มีเทสต์อัตโนมัติ | ความเสี่ยงเรื่องเสียงและเลย์เอาต์เฉพาะ WebKit | TC-MOB-03 (Manual) |
| 8 | GitHub ปิด scheduled workflow เมื่อ repo ไม่มีความเคลื่อนไหว 60 วัน | keep-alive/nightly/backup หยุดเงียบ ๆ | ขั้นตอนเปิดใหม่ใน `docs/deploy/secrets.md`; ตรวจแท็บ Actions เป็นระยะ |
| 9 | Supabase Free อาจถูกหยุดถ้า keep-alive ล้มหลายรอบ | กระทบ NFR-05 | TC-OPS-01/02, backup รายสัปดาห์เก็บ 90 วัน |

## 10. ภาคผนวก

- สคริปต์เดโม 10 นาที (เส้นทางหลัก 1–3 ของสเปก 6.3 บน production): [`../demo.md`](../demo.md)
- คู่มือขึ้นระบบ: `docs/deploy/` (production-checklist, supabase, vercel, google, secrets, backup-restore)
- วิธีรันซ้ำ: `npx supabase test db` · `npm run test:unit` · `npx playwright test --project=chromium` · `PROD_URL=<url> npx playwright test --project=prod` (อ่านอย่างเดียว) · `npm run qa:stats`
