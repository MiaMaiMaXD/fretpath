# CI บน Pull Request

> **สถานะ: ตรวจสอบแล้ว (2026-10-19)** — CI ทำงานจริงทั้งกรณีล้มและผ่าน และตั้ง branch protection บน `main` แล้ว
> หลักฐานเป็นลิงก์ไปยัง PR / รันของ GitHub Actions ด้านล่าง (ถ้าอาจารย์ต้องการภาพหน้าจอ ให้เปิดลิงก์แล้วบันทึกภาพเพิ่มในโฟลเดอร์ `docs/qa/img/`)

## Workflow

ไฟล์: `.github/workflows/ci.yml` — job id และชื่อ check คือ `ci`

Trigger: `pull_request` ไป `main` และ `push` ไป `main` (รันเก่าของ PR เดียวกันจะถูกยกเลิกอัตโนมัติ; รันบน `main` ไม่ถูกยกเลิก)

ลำดับขั้นตอนใน job: `npm ci` → ติดตั้ง Supabase CLI (2.121.0 ตรงกับ devDependency) → `supabase start` → `supabase test db` (pgTAP 001–006)
→ `npm run lint` → `npm run typecheck` → ตั้ง env จาก `supabase status -o env` → `npm run build` → ติดตั้ง Chromium
→ `playwright test --project=chromium --grep "@smoke|@security"` → อัปโหลด `playwright-report/` เป็น artifact (ทุกครั้ง เก็บ 14 วัน)

หมายเหตุ: คีย์ที่ใช้เป็นคีย์ demo ของ Supabase local stack ใน runner จึงไม่ต้องตั้ง GitHub Secrets

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
