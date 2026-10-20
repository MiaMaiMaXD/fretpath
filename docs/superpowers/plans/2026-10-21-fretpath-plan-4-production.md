# FretPath แผนที่ 4: ขึ้นระบบจริง และงานดูแลระบบอัตโนมัติ

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Task ที่มีป้าย `[ทีม]` ต้องใช้บัญชีของทีม — agent **หยุดและให้ทีมทำ** แล้วรอทีมยืนยันก่อนทำ Step ตรวจสอบ

**Goal:** FretPath ออนไลน์จริงบน Vercel Hobby + Supabase Free ที่ปลอดภัยและพร้อมเดโม พร้อมงานอัตโนมัติที่ไม่ต้องมีคนเฝ้า (keep-alive, backup รายสัปดาห์, เทสต์ทุกคืน, Lighthouse) และ Test Summary Report ปิดงาน QA

**Architecture:** โค้ดแอปแทบไม่เปลี่ยน งานหลักคือการตั้งค่าบริการภายนอก (ทีมทำตามเอกสารที่ Dev เตรียม) และ GitHub Actions ใหม่ 3 ไฟล์; ข้อมูลเนื้อหาบน production มาจากสคริปต์เนื้อหาที่ **ไม่มีบัญชีทดสอบ** (แยกจาก `seed.sql`); เทสต์ที่แตะ production เป็นแบบอ่านอย่างเดียว (`@prod`) เท่านั้น

**Tech Stack:** Vercel (Hobby), Supabase (Free, hosted), GitHub Actions, Supabase CLI (`db push`, `db dump`), Playwright, Lighthouse CI (`@lhci/cli`), GPG (เข้ารหัส backup)

**Spec:** `docs/superpowers/specs/2026-10-19-fretpath-design.md` (โดยเฉพาะ 1.3, 6.1, 6.5, 7.2, 7.3, NFR-05/06/07) + `docs/deploy/production-checklist.md` (จากแผนที่ 3)

## Global Constraints

- ค่าใช้จ่าย 0 บาท: Vercel Hobby, Supabase Free, GitHub Free, SMTP แพ็กเกจฟรี; ห้ามใช้เชิงพาณิชย์บน Vercel Hobby (สเปก 1.3)
- ความลับ (Supabase URL/keys, DB connection string, SMTP password, Google secret, backup passphrase) อยู่ใน GitHub Secrets / Vercel env / Supabase dashboard เท่านั้น ห้าม commit และห้ามพิมพ์ลง log (สเปก 7.2)
- ห้ามรัน `supabase/seed.sql` กับ production (มีบัญชีรหัสผ่านที่รู้กัน); ห้ามเทสต์ที่เขียนข้อมูลกับ production (สเปก 6.5: Preview/Production อ่านอย่างเดียว)
- โครงสร้างฐานข้อมูล production มาจาก `supabase db push` ของ migrations เท่านั้น
- ตารางเวลา (สเปก 7.2): `nightly.yml` ทุกคืน 02:00 น. Asia/Bangkok (= `0 19 * * *` UTC); `keep-alive.yml` ทุก 2 วัน; `backup.yml` ทุกสัปดาห์ เก็บ artifact 90 วัน ผ่าน Session Pooler connection string
- NFR-07: หน้าหลักโหลดเสร็จภายใน 3 วินาทีบนเครือข่าย 4G (วัดด้วย Lighthouse)
- ข้อความ/เอกสารเป็นภาษาไทย; รหัส TC ใหม่: `TC-OPS-01` ขึ้นไป (งานดูแลระบบ), `TC-PRD-01` ขึ้นไป (smoke บน production), `TC-PERF-01` (Lighthouse); ตรวจ `docs/qa/test-cases.md` ก่อนใช้เลข
- migration ใหม่ใช้เลขถัดจากไฟล์สูงสุดใน `supabase/migrations` เสมอ

## Review Focus

1. **Backup หลุดสู่สาธารณะ:** repo เป็น public — artifact ของ Actions ดาวน์โหลดได้โดยผู้ใช้ GitHub ทั่วไป และ dump มีอีเมลกับ password hash ของผู้ใช้ → ต้องเข้ารหัสก่อนอัปโหลดเสมอ และตรวจว่าไฟล์ที่อัปโหลดไม่ใช่ข้อความ SQL → Task 6 `TC-OPS-03`
2. **Backup ที่กู้คืนไม่ได้:** ไฟล์ dump ว่างหรือเสียแต่ workflow เขียว → workflow ต้องกู้คืนลง Postgres ชั่วคราวใน job เดียวกันและนับแถว `lessons` ได้ ≥ 1 ก่อนถือว่าผ่าน → Task 6 `TC-OPS-04`
3. **ลิงก์อีเมลบน production ชี้ localhost หรือใช้ไม่ได้:** `site_url`, redirect allow-list, `NEXT_PUBLIC_SITE_URL` หรือเทมเพลตอีเมลตั้งผิด → สมัครจริงบน production แล้วเปิดลิงก์ในอุปกรณ์อื่นต้องเข้า Dashboard ได้ → Task 4 `TC-PRD-05` (manual, บันทึกผล)
4. **บัญชีทดสอบหลุดขึ้น production:** `member@fretpath.test` / `admin@fretpath.test` ต้องไม่มีบน production → Task 5 `TC-PRD-04` (smoke ล็อกอินด้วยบัญชี seed ต้องล้มเหลว)
5. **keep-alive เขียวแต่ฐานข้อมูลยังถูกหยุด:** เช่นเรียกหน้า static ที่ไม่แตะ DB → ต้องเรียก `/api/health` ที่ query ตาราง `courses` และล้มเมื่อไม่ใช่ 200 `{"ok":true}` → Task 7 `TC-OPS-01`

---

## โครงสร้างไฟล์

```
supabase/content/guitar-basics.sql      เนื้อหาคอร์ส (ไม่มีผู้ใช้) — seed.sql ใช้ร่วมด้วย \ir
supabase/seed.sql                       = เนื้อหา + บัญชีทดสอบ (local/CI เท่านั้น)
app/auth/confirm/page.tsx + route        หน้ากลางกดยืนยันก่อนใช้ token (กันตัวสแกนอีเมล)
next.config.ts                           HSTS (production), form-action สำหรับ Google
playwright.config.ts                     project `prod` (baseURL = PROD_URL, ไม่มี webServer)
e2e/prod/*.spec.ts                       smoke อ่านอย่างเดียวบน production (@prod)
.github/workflows/nightly.yml            เทสต์ครบทุก project + @prod + Lighthouse
.github/workflows/keep-alive.yml         ping /api/health ทุก 2 วัน
.github/workflows/backup.yml             db dump → gpg → artifact 90 วัน + restore check
lighthouserc.json                        เกณฑ์ NFR-07
docs/deploy/{supabase,vercel,google,secrets,backup-restore}.md
docs/qa/test-summary.md, docs/demo.md
```

---

### Task 1: [Dev] แยกเนื้อหาคอร์สออกจากบัญชีทดสอบ

**Files:**
- Create: `supabase/content/guitar-basics.sql`, `tests/unit/content-file.test.ts`
- Modify: `supabase/seed.sql`, `supabase/config.toml` (`[db.seed] sql_paths = ["./content/guitar-basics.sql", "./seed.sql"]`)

**Interfaces:**
- Produces: `supabase/content/guitar-basics.sql` — สร้างคอร์ส `guitar-basics`, 5 บท, เนื้อหา, คำถาม, ตัวเลือก, เฉลย และเผยแพร่ ตามลำดับเดิมของ seed (draft → เนื้อหา → publish) **ไม่สร้างผู้ใช้**; idempotent: รันซ้ำแล้วไม่สร้างซ้ำ (ข้ามถ้ามีคอร์ส slug นี้อยู่แล้ว) — Task 3 ทีมรันไฟล์นี้กับ production
- `seed.sql` เหลือเฉพาะบัญชีทดสอบ; ลำดับการรันกำหนดด้วย `[db.seed] sql_paths` (Supabase CLI รัน seed ผ่าน driver ไม่ใช่ psql จึงใช้ `\ir` ไม่ได้)

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลว** `tests/unit/content-file.test.ts` (Vitest อ่านไฟล์): ไฟล์มีอยู่, ไม่มี `auth.users`, `auth.identities`, `@fretpath.test`, `Passw0rd`; มี `guitar-basics` และ 5 slug ของบท
- [ ] **Step 2:** สคริปต์ทดสอบ idempotent: บนฐานข้อมูล local หลัง reset รัน `docker exec -i <db container> psql -U postgres < supabase/content/guitar-basics.sql` ซ้ำ 2 ครั้ง → `select count(*) from lessons where status='published'` ยังเป็น 5 และไม่มี error (บันทึกผลใน report)
- [ ] **Step 3:** รัน `npm run test:unit` — Expected: FAIL
- [ ] **Step 4:** ย้ายเนื้อหาจาก `seed.sql` ไปไฟล์ใหม่ (ไม่เปลี่ยนข้อความใด ๆ), `seed.sql` เรียกไฟล์นั้น
- [ ] **Step 5:** รัน `npx supabase db reset && npx supabase test db && npm run test:unit && npx playwright test e2e/api --project=chromium` — Expected: ผ่านทั้งหมด (ข้อมูล local เหมือนเดิม)
- [ ] **Step 6:** Commit `refactor(db): split course content from test accounts`

---

### Task 2: [Dev] เตรียมแอปสำหรับ production: หน้ายืนยันลิงก์, HSTS, Google CSP, smoke `@prod`

**Files:**
- Create: `app/auth/confirm/page.tsx` (หน้ากลาง), `app/auth/confirm/actions.ts`, `e2e/prod/smoke.spec.ts`
- Modify: `app/auth/confirm/route.ts` (ย้ายตรรกะไป Server Action), `next.config.ts`, `playwright.config.ts`, `supabase/templates/*.html` (ลิงก์ยังเป็น `/auth/confirm?...`), `e2e/specs/auth-links.spec.ts` (กดปุ่มยืนยันในหน้ากลาง), `.env.example`

**Interfaces:**
- Produces:
  - `GET /auth/confirm?token_hash&type&next` → แสดงหน้า "ยืนยันอีเมล" (หรือ "ตั้งรหัสผ่านใหม่" เมื่อ type=recovery) ปุ่ม "ยืนยันและเข้าสู่ระบบ"; **ไม่เรียก verifyOtp ตอน GET** (ตัวสแกนอีเมลที่เปิดลิงก์ล่วงหน้าจึงใช้ token ไม่ได้)
  - Server Action `confirmToken(form)` → `verifyOtp` → redirect `safeNextPath(next)`; ล้มเหลว → `/login?error=link` (พฤติกรรมเดิม)
  - `next.config.ts`: เมื่อ `NODE_ENV === 'production'` เพิ่ม `Strict-Transport-Security: max-age=63072000; includeSubDomains`; เมื่อ `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true'` เพิ่ม Supabase origin และ `https://accounts.google.com` ใน `form-action`
  - `playwright.config.ts` project `prod`: `testMatch: /e2e\/prod\/.*\.spec\.ts/`, `use.baseURL = process.env.PROD_URL`, ไม่ใช้ `webServer`, ไม่พึ่ง project `setup`; project อื่นต้อง `testIgnore` โฟลเดอร์ `e2e/prod`
  - `e2e/prod/smoke.spec.ts` (ทุกเทสต์ติด `@prod` อ่านอย่างเดียว ห้ามสร้าง/ลบข้อมูล):
    - `TC-PRD-01 health reports database reachable` — `/api/health` 200 `{ ok: true }`
    - `TC-PRD-02 home page renders in Thai with security headers` — หัวเรื่อง "FretPath", header CSP มี `frame-ancestors 'none'`, มี HSTS
    - `TC-PRD-03 anonymous /admin and /dashboard redirect to login` — URL `/login?next=…`
    - `TC-PRD-04 seed test accounts do not exist on production` — ล็อกอิน `member@fretpath.test` / `Passw0rd!` → "อีเมลหรือรหัสผ่านไม่ถูกต้อง" (Review Focus 4)
    - `TC-PRD-06 public course list shows guitar-basics` — anon client ดึง `courses` ได้คอร์ส `กีตาร์พื้นฐาน` (อ่านอย่างเดียว)

- [ ] **Step 1:** แก้ `auth-links.spec.ts` (TC-AUTH-11/13/14) ให้กดปุ่ม "ยืนยันและเข้าสู่ระบบ"; เพิ่ม `TC-AUTH-17 opening the link alone does not consume the token` — GET ลิงก์ด้วย `request.get` (จำลองตัวสแกน) แล้วเปิดลิงก์เดิมใน browser กดยืนยัน → เข้า Dashboard ได้
- [ ] **Step 2:** รัน — Expected: FAIL
- [ ] **Step 3:** เขียนตาม Interfaces; smoke `@prod` รันกับ local ได้ด้วย `PROD_URL=http://localhost:3000` (ยกเว้น HSTS ซึ่งข้ามเมื่อ URL เป็น http — ใช้ `test.skip` พร้อมเหตุผล)
- [ ] **Step 4:** รัน `npm run build && npx playwright test e2e --project=chromium` และ `PROD_URL=http://localhost:3000 npx playwright test --project=prod` (ขณะ `npm run start`) — Expected: ผ่าน
- [ ] **Step 5:** Commit `feat: add confirm interstitial, HSTS and production smoke tests`

---

### Task 3: [ทีม → Dev ตรวจ] สร้าง Supabase production

**Files (Dev เขียนก่อน ทีมทำตาม):** Create: `docs/deploy/supabase.md`, `docs/deploy/secrets.md`

- [ ] **Step 1 (Dev):** เขียน `docs/deploy/supabase.md` เป็นขั้นตอนทีละคลิกพร้อมช่องบันทึกผล: สร้างโปรเจกต์ Free (region Singapore), เก็บ DB password; `npx supabase login` + `npx supabase link --project-ref <ref>`; `npx supabase db push`; รัน `supabase/content/guitar-basics.sql` ใน SQL Editor (ห้าม seed.sql); Auth → URL Configuration (`site_url` = โดเมน Vercel, redirect URLs `https://<domain>/auth/callback`, `https://<domain>/auth/confirm`); Auth → Providers → Email (confirm email เปิด, min password 8); Email Templates — คัดลอกจาก `supabase/templates/confirmation.html` และ `recovery.html` พร้อม subject ไทย; SMTP ฟรี (ตัวอย่าง Brevo/Resend แพ็กเกจฟรี — ทีมเลือก; ระบุ host/port/user/sender); สร้างแอดมินคนแรก: สมัครผ่านเว็บแล้วรัน `update public.profiles set role = 'admin' where id = (select id from auth.users where email = '<อีเมลแอดมิน>');` ใน SQL Editor; Database → Connection string แบบ **Session Pooler** สำหรับ backup
- [ ] **Step 2 (Dev):** `docs/deploy/secrets.md` ตารางความลับ: ชื่อ, เก็บที่ไหน (GitHub Secrets / Vercel / Supabase), ใครใช้: `PROD_URL`, `PROD_SUPABASE_URL`, `PROD_SUPABASE_ANON_KEY`, `SUPABASE_DB_URL` (Session Pooler), `BACKUP_PASSPHRASE`, `SUPABASE_ACCESS_TOKEN` (ถ้าใช้ CLI ใน Actions) — ห้ามใส่ service role key ใน GitHub Secrets ถ้าไม่จำเป็น
- [ ] **Step 3 (Dev):** Commit `docs(deploy): add supabase production and secrets guides`
- [ ] **Step 4 [ทีม]:** ทำตาม `docs/deploy/supabase.md` แล้วแจ้ง Dev
- [ ] **Step 5 [ทีม] → Dev ตรวจผลที่ส่งมา:** ทีมรัน `npx supabase migration list --linked` (Expected: ทุก migration มีทั้ง Local และ Remote) และใน SQL Editor รัน `select count(*) from public.lessons where status='published'` = 5 และ `select count(*) from auth.users where email like '%@fretpath.test'` = 0; บันทึกผลใน `docs/deploy/supabase.md`

---

### Task 4: [ทีม → Dev ตรวจ] Deploy บน Vercel

**Files (Dev):** Create: `docs/deploy/vercel.md`

- [ ] **Step 1 (Dev):** `docs/deploy/vercel.md`: import repo, Framework Next.js, Node 22, env (Production + Preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL=https://<domain>`, `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=false`; production branch `main`; Preview ใช้ฐานข้อมูล production อ่านอย่างเดียว (สเปก 6.5 — ห้ามรันเทสต์เขียนข้อมูลบน Preview); เตือนเรื่องห้ามใช้เชิงพาณิชย์บน Hobby
- [ ] **Step 2 (Dev):** Commit `docs(deploy): add vercel guide`
- [ ] **Step 3 [ทีม]:** deploy และส่ง URL production ให้ Dev
- [ ] **Step 4 (Dev ตรวจ):** `PROD_URL=<url> npx playwright test --project=prod` — Expected: TC-PRD-01..04, 06 ผ่าน
- [ ] **Step 5 [ทีม/QA] manual `TC-PRD-05` (Review Focus 3):** สมัครบัญชีจริงบน production ด้วยอีเมลจริง → เปิดลิงก์ในโทรศัพท์ (อีกเครื่อง) → กด "ยืนยันและเข้าสู่ระบบ" → เข้า Dashboard และเห็นบท 1 ปลดล็อก; ลืมรหัสผ่านแบบเดียวกัน; บันทึกผล+ภาพหน้าจอใน `docs/qa/test-summary.md` (Task 9)

---

### Task 5: [ทีม → Dev ตรวจ] เปิด Google login (FR-01.7, S)

**Files (Dev):** Create: `docs/deploy/google.md`

- [ ] **Step 1 (Dev):** `docs/deploy/google.md`: Google Cloud Console → OAuth consent screen (External, testing users ได้), Credentials → OAuth client (Web), Authorized redirect URI `https://<project>.supabase.co/auth/v1/callback`; Supabase → Auth → Providers → Google ใส่ Client ID/Secret; Vercel ตั้ง `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` แล้ว redeploy (CSP form-action จาก Task 2 จะเปิดเอง)
- [ ] **Step 2 (Dev):** Commit `docs(deploy): add google sign-in guide`
- [ ] **Step 3 [ทีม]:** ทำตามเอกสาร
- [ ] **Step 4 [ทีม/QA] manual `TC-AUTH-18`:** กด "เข้าสู่ระบบด้วย Google" บน production → เลือกบัญชี → เข้า Dashboard, ชื่อที่แสดงเป็นชื่อบัญชี Google, บท 1 ปลดล็อก; บันทึกผล
- [ ] **Step 5 (Dev ตรวจ):** รัน `PROD_URL=<url> npx playwright test --project=prod` อีกครั้ง — Expected: ผ่าน (ไม่มี CSP violation บนหน้า login)

---

### Task 6: [QA] Backup รายสัปดาห์ที่เข้ารหัสและกู้คืนได้ (NFR-06)

**Files:**
- Create: `.github/workflows/backup.yml`, `scripts/backup-check.sh`, `docs/deploy/backup-restore.md`

**Interfaces:**
- Produces: job `backup` (cron `0 20 * * 6` = อาทิตย์ 03:00 น. ไทย + `workflow_dispatch`):
  1. `supabase/setup-cli@v1` (เวอร์ชันเดียวกับ CI) → `supabase db dump --db-url "$SUPABASE_DB_URL" -f schema.sql` และ `--data-only -f data.sql` (รวม schema `auth` ด้วย `--schema public,auth,storage`)
  2. `scripts/backup-check.sh restore`: start Postgres ชั่วคราว (service container `postgres:17`), สร้าง role ที่ dump ต้องใช้ (`authenticated`, `anon`, `service_role` …), restore schema + data, `psql -c "select count(*) from public.lessons"` ต้อง ≥ 1 (Review Focus 2) — ล้มเหลว → job แดง
  3. `tar czf` แล้ว `gpg --batch --symmetric --cipher-algo AES256 --passphrase "$BACKUP_PASSPHRASE"` → `fretpath-backup-<YYYY-MM-DD>.tar.gz.gpg`; ลบไฟล์ SQL ดิบ; ตรวจว่า artifact ไม่มี `.sql` (Review Focus 1)
  4. `actions/upload-artifact@v4` `retention-days: 90`
  - `permissions: contents: read`; ไม่ echo secrets; `concurrency` กันรันซ้อน
- `docs/deploy/backup-restore.md`: วิธีดาวน์โหลด artifact, `gpg -d`, restore ลง Supabase local (`npx supabase db reset` แล้ว `psql` data) และลงโปรเจกต์ใหม่

- [ ] **Step 1:** เขียน workflow + script; ทดสอบ `scripts/backup-check.sh restore` ในเครื่องกับ dump ของ Supabase local (`npx supabase db dump --local …`) — Expected: นับ lessons = 5
- [ ] **Step 2:** ตรวจ YAML (`npx --yes js-yaml .github/workflows/backup.yml`) และ `bash -n scripts/backup-check.sh`
- [ ] **Step 3:** Commit `ci: add encrypted weekly backup with restore check`
- [ ] **Step 4 [ทีม]:** ตั้ง secrets `SUPABASE_DB_URL`, `BACKUP_PASSPHRASE` (เก็บ passphrase ไว้นอก GitHub ด้วย) แล้วกด Run workflow ครั้งแรก
- [ ] **Step 5 (QA ตรวจ):** `TC-OPS-03` artifact ที่ดาวน์โหลดได้เป็นไฟล์ `.gpg` ไม่ใช่ข้อความ SQL (`file` ต้องบอกว่า encrypted data); `TC-OPS-04` log ขั้น restore แสดงจำนวน lessons ≥ 1; กู้คืนจริง 1 ครั้งตาม `backup-restore.md` บนเครื่อง และบันทึกผล

---

### Task 7: [QA] Keep-alive (NFR-05)

**Files:**
- Create: `.github/workflows/keep-alive.yml`

**Interfaces:**
- Produces: job `keep-alive` (cron `0 1 */2 * *` + `workflow_dispatch`): `curl --fail --retry 3 --retry-delay 30 -s "$PROD_URL/api/health"` แล้วตรวจ body เป็น `{"ok":true}` ด้วย `jq -e '.ok == true'` (Review Focus 5); `timeout-minutes: 5`; `permissions: contents: read`
  - หมายเหตุใน workflow: GitHub ปิด scheduled workflow ใน repo ที่ไม่มีความเคลื่อนไหว 60 วัน — `docs/deploy/secrets.md` เพิ่มวิธีเปิดกลับ

- [ ] **Step 1:** เขียน workflow; ตรวจ YAML
- [ ] **Step 2:** ทดสอบตรรกะในเครื่องกับ `PROD_URL=http://localhost:3000` ด้วยคำสั่งเดียวกัน — Expected: ผ่านเมื่อแอป+DB ทำงาน; หยุด Supabase → คำสั่งล้มด้วย exit ≠ 0
- [ ] **Step 3:** Commit `ci: add production keep-alive`
- [ ] **Step 4 [ทีม]:** ตั้ง secret `PROD_URL`; กด Run workflow — **QA ตรวจ `TC-OPS-01`:** run เขียว; `TC-OPS-02`: ตรวจว่า GitHub ส่งอีเมลเมื่อ workflow ล้ม (ทดลองตั้ง `PROD_URL` ผิดชั่วคราวใน `workflow_dispatch` input แล้วคืนค่า) บันทึกผล

---

### Task 8: [QA] Nightly: เทสต์เต็มทุก project + smoke production + Lighthouse (NFR-07)

**Files:**
- Create: `.github/workflows/nightly.yml`, `lighthouserc.json`
- Modify: `package.json` (devDependency `@lhci/cli`), `docs/qa/ci.md`

**Interfaces:**
- Produces: workflow `nightly` (cron `0 19 * * *` = 02:00 น. ไทย + `workflow_dispatch`) มี 2 job:
  - `full-suite`: เหมือน `ci.yml` แต่ `npx playwright install --with-deps chromium firefox` และ `npx playwright test --project=chromium --project=firefox --project=mobile` (ทุกป้าย ไม่รวม `prod`); อัปโหลด `playwright-report` (`if: always()`, 14 วัน); `timeout-minutes: 60`
  - `production`: `npx playwright test --project=prod` ด้วย `PROD_URL` จาก secret (อ่านอย่างเดียว) แล้ว `npx lhci autorun` กับ `${PROD_URL}/` ตาม `lighthouserc.json`; อัปโหลดรายงาน Lighthouse เป็น artifact
  - `lighthouserc.json`: `collect.numberOfRuns: 3`, `settings.preset` มือถือ (ค่าเริ่มต้นของ Lighthouse = Moto G Power + slow 4G throttling); `assert`: `largest-contentful-paint` ≤ 3000 ms (error), `interactive` ≤ 3000 ms (error), `categories:accessibility` ≥ 0.9 (warn); `upload.target: filesystem`
- `TC-PERF-01 home page loads within 3 s on 4G (Lighthouse)` บันทึกใน test-cases (automated: nightly job `production`)

- [ ] **Step 1:** ติดตั้ง `@lhci/cli`; รัน `npx lhci autorun --collect.url=http://localhost:3000/` กับ build ในเครื่อง (`npm run start`) — Expected: ได้ผลรายงาน; บันทึกค่า LCP/TTI ใน report (ถ้าเกิน 3 s ในเครื่อง ให้ดูต้นเหตุ เช่นฟอนต์/รูป และแก้แบบไม่เปลี่ยน UI)
- [ ] **Step 2:** เขียน `nightly.yml`; ตรวจ YAML; ใช้ action เวอร์ชันหลักเดียวกับ `ci.yml`
- [ ] **Step 3:** อัปเดต `docs/qa/ci.md` (ตาราง workflow ทั้งหมด: ci, nightly, keep-alive, backup + เวลา + สิ่งที่ทำ)
- [ ] **Step 4:** Commit `ci: add nightly full suite, production smoke and lighthouse`
- [ ] **Step 5 [ทีม]:** กด Run workflow `nightly` ครั้งแรกหลังมี `PROD_URL` — **QA ตรวจ:** ทั้งสอง job เขียว; บันทึกค่า Lighthouse (LCP, TTI, คะแนน) ของ production ใน test-summary

---

### Task 9: [QA] Test Summary Report และปิด RTM

**Files:**
- Create: `docs/qa/test-summary.md`, `scripts/tc-stats.mjs`, `docs/demo.md`
- Modify: `docs/qa/test-cases.md`, `docs/qa/rtm.md`, `docs/qa/test-plan.md`, `package.json` (script `qa:stats`)

**Interfaces:**
- Produces:
  - `scripts/tc-stats.mjs` (Node, ไม่มี dependency): อ่าน `docs/qa/test-cases.md` และ `docs/qa/rtm.md` → พิมพ์จำนวน TC ต่อพื้นที่, Automated/Manual, ความสำคัญ, จำนวน requirement ที่มี TC (แยก M/S/C) และ requirement M ที่ยังไม่มี TC; `npm run qa:stats` (+ unit test `tests/unit/tc-stats.test.ts` กับ fixture markdown เล็ก ๆ)
  - `docs/qa/test-summary.md` ตามสเปก 6.1: ขอบเขตและรอบการทดสอบ, จำนวน TC (จาก `qa:stats`), อัตราผ่าน (จากรัน nightly ล่าสุด: ลิงก์ run + ตัวเลขต่อ project, pgTAP, unit), ผล manual TC ทุกข้อ (SEC-15/16, QZ-08/11/13/15, DSH-06, MOB-03, PRD-05, AUTH-18) พร้อมวันที่/ผู้ทดสอบ/หลักฐาน, defect ตาม severity (จาก GitHub Issues label `bug` — `gh issue list --label bug --state all`), ความครอบคลุม (RTM), ผล Lighthouse, ผลตรวจเกณฑ์จบการทดสอบทั้ง 3 ข้อของสเปก 6.1, ความเสี่ยงที่เหลือและงานต่อ (UI ตามต้นแบบ, nonce CSP ฯลฯ)
  - `docs/demo.md`: สคริปต์เดโม 10 นาที (เส้นทางหลัก 1–3 ของสเปก 6.3 บน production, บัญชีเดโมที่ทีมสร้างเอง — ไม่ใช่ seed)
  - TC ใหม่ใน test-cases: `TC-OPS-01..04`, `TC-PRD-01..06`, `TC-PERF-01`, `TC-AUTH-17`, `TC-AUTH-18`; RTM: NFR-05 (OPS-01/02), NFR-06 (OPS-03/04), NFR-07 (PERF-01), FR-01.7 (AUTH-18) → ไม่มี requirement M ที่ไม่มี TC

- [ ] **Step 1:** `tc-stats.test.ts` (fixture: 3 TC, 2 requirement) → `npm run test:unit` FAIL → เขียนสคริปต์ → PASS
- [ ] **Step 2:** อัปเดต test-cases, RTM, test-plan (ตารางเวลา: ใส่วันที่ทดสอบจริง)
- [ ] **Step 3:** เขียน `test-summary.md` และ `demo.md` (ช่องที่ต้องรอผลจากทีมใส่ `<!-- รอผล: … -->` ให้ชัด)
- [ ] **Step 4:** `npm run qa:stats` — Expected: requirement M ที่ไม่มี TC = 0
- [ ] **Step 5:** Commit `docs(qa): add test summary report and close RTM`
- [ ] **Step 6 [ทีม/QA]:** ทำ manual TC ทั้งหมดบน production, เติมผลและหลักฐานลง `test-summary.md`, ตรวจเกณฑ์จบ (M ผ่าน 100%, ไม่มี defect Critical/High เปิดอยู่) แล้ว commit ผ่าน PR

---

## เมื่อจบแผนที่ 4
- เว็บ production ออนไลน์ ล็อกอินด้วยอีเมลและ Google ได้ ลิงก์อีเมลใช้ข้ามอุปกรณ์ได้ ไม่มีบัญชีทดสอบบน production
- workflow `ci`, `nightly`, `keep-alive`, `backup` ทำงานเองและส่งอีเมลเมื่อล้ม; backup เข้ารหัสและกู้คืนได้
- `test-summary.md` ครบตามสเปก 6.1 และผ่านเกณฑ์จบการทดสอบ — พร้อมเดโม
- งานต่อ (นอกแผน): UI ตามต้นแบบ FretPath, nonce-based CSP, หน้าจัดการหลายคอร์ส
