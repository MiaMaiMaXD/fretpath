# CI บน Pull Request

> **สถานะ: ยังรอทีมดำเนินการ** — ขั้นตอนที่ 2–3 (ตรวจสอบ CI ด้วย PR จริง) และการตั้ง branch protection บน `main` ยังไม่ได้ทำ
> เพราะเป็นการกระทำบน GitHub (push / เปิด PR / แก้ Settings) ที่ต้องให้สมาชิกทีมทำเอง ไฟล์ workflow พร้อมใช้แล้ว

## Workflow

ไฟล์: `.github/workflows/ci.yml` — job id และชื่อ check คือ `ci`

Trigger: `pull_request` ไป `main` และ `push` ไป `main` (รันเก่าของ PR เดียวกันจะถูกยกเลิกอัตโนมัติ)

ลำดับขั้นตอนใน job: `npm ci` → ติดตั้ง Supabase CLI (2.121.0 ตรงกับ devDependency) → `supabase start` → `supabase test db` (pgTAP 001–005)
→ `npm run lint` → `npm run typecheck` → ตั้ง env จาก `supabase status -o env` → `npm run build` → ติดตั้ง Chromium
→ `playwright test --project=chromium --grep "@smoke|@security"` → อัปโหลด `playwright-report/` เป็น artifact (ทุกครั้ง เก็บ 14 วัน)

หมายเหตุ: คีย์ที่ใช้เป็นคีย์ demo ของ Supabase local stack ใน runner จึงไม่ต้องตั้ง GitHub Secrets

## วิธีตรวจสอบว่า CI ทำงานถูกต้อง (รอทีมทำ)

### 1) PR ทดสอบที่ต้องล้ม (พิสูจน์ว่า CI จับช่องโหว่ได้)

1. แตก branch ทดสอบ เช่น `ci-verify-fail` จาก branch ที่มี workflow
2. เพิ่ม migration ชั่วคราวที่เปิดให้อ่านตาราง `quiz_answer_keys` ได้ เช่น
   `create policy tmp_read on public.quiz_answer_keys for select using (true);`
3. push แล้วเปิด PR ไป `main`
4. ผลที่คาดหวัง: check `ci` เป็น **สีแดง** (เคส `TC-SEC-01` ล้ม) และที่หน้ารัน Actions มี artifact `playwright-report` ให้ดาวน์โหลด
5. ปิด PR นั้นทิ้งโดยไม่ merge และลบ branch

<!-- TODO: ภาพหน้าจอ (check ci แดง + artifact playwright-report) -->

### 2) PR จริง (ต้องเขียว)

เปิด PR ของ branch งานจริงไป `main` — ผลที่คาดหวัง: check `ci` เป็น **สีเขียว**

<!-- TODO: ภาพหน้าจอ (check ci เขียว) -->

## ตั้ง branch protection บน `main` (รอทีมทำ)

ทำหลังจาก check `ci` เคยรันสำเร็จอย่างน้อยหนึ่งครั้ง (เพื่อให้ GitHub แสดงชื่อ check ให้เลือก)

1. GitHub repo → **Settings → Branches → Add branch protection rule** (หรือ Rulesets)
2. Branch name pattern: `main`
3. ติ๊ก **Require a pull request before merging** และตั้ง **Required approvals = 1**
4. ติ๊ก **Require status checks to pass before merging** แล้วค้นหาและเลือก `ci`
   (แนะนำให้ติ๊ก *Require branches to be up to date before merging* ด้วย)
5. กด **Create / Save changes**

<!-- TODO: ภาพหน้าจอ (หน้าตั้งค่า branch protection) -->
