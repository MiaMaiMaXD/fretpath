# FretPath

ระบบเรียนกีตาร์พื้นฐานออนไลน์แบบก้าวต่อก้าว (โปรเจกต์จบปี 4)

- เว็บจริง (production): https://fretpath-six.vercel.app
- สเปก: `docs/superpowers/specs/2026-10-19-fretpath-design.md`
- วิธีทำงานร่วมกันในทีม: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- คู่มือ deploy: `docs/deploy/` · เอกสาร QA: `docs/qa/`

**เทคโนโลยี:** Next.js 16 (App Router, Server Actions) · React 19 · Tailwind CSS v4 · TypeScript · Supabase (PostgreSQL, Auth, Storage) · Vercel · ทดสอบด้วย Playwright, Vitest, pgTAP

## เริ่มบนเครื่องของคุณ

ทุกคนรันโปรเจกต์บนเครื่องตัวเองได้ โดยใช้ฐานข้อมูล Supabase จำลองใน Docker **ไม่ต้องใช้คีย์หรือรหัสผ่านของ production เลย** (ห้ามขอหรือส่งต่อคีย์ production ในแชท)

### 1. ลงโปรแกรม (ทำครั้งเดียว)

- [Node.js 22](https://nodejs.org) (ตรวจด้วย `node -v` ต้องขึ้น `v22.x`)
- [Git](https://git-scm.com)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ต้อง**เปิดค้างไว้**ทุกครั้งที่ทำงาน (ตรวจด้วย `docker info` ต้องไม่ error)
- แนะนำ: VS Code

### 2. ดึงโค้ดและติดตั้ง (ทำครั้งเดียว)

```powershell
git clone https://github.com/MiaMaiMaXD/fretpath.git
cd fretpath
npm install
npx supabase start      # เปิดฐานข้อมูลจำลอง (ครั้งแรกจะดาวน์โหลดนาน 5–10 นาที)
npx supabase db reset   # สร้างตารางตาม migrations และใส่ข้อมูลตัวอย่าง
copy .env.example .env.local
```

### 3. ใส่ค่าใน `.env.local` (ทำครั้งเดียว)

รัน `npx supabase status -o env` แล้วคัดลอกค่าไปใส่ใน `.env.local` ดังนี้

| ใน `.env.local` | เอาค่ามาจาก |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `API_URL` (ปกติคือ `http://127.0.0.1:54321`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_ROLE_KEY` (ใช้กับ E2E test เท่านั้น) |
| `NEXT_PUBLIC_SITE_URL` | พิมพ์ `http://localhost:3000` |

ช่องอื่น (`NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`, `PROD_*`) เว้นว่างไว้ คีย์เหล่านี้เป็นของฐานข้อมูลจำลองบนเครื่องคุณเอง ไม่ใช่ความลับของ production แต่ไฟล์ `.env.local` ก็ไม่ถูก commit อยู่แล้ว

### 4. รันเว็บ (ทำทุกครั้งที่จะทำงาน)

```powershell
npx supabase start   # ถ้ายังไม่ได้เปิด
npm run dev
```

เปิด http://localhost:3000 แล้วล็อกอินด้วยบัญชีตัวอย่าง (มี**เฉพาะบนเครื่อง** ไม่มีบน production)

| บทบาท | อีเมล | รหัสผ่าน |
|---|---|---|
| แอดมิน | `admin@fretpath.test` | `Passw0rd!` |
| ผู้เรียน | `member@fretpath.test` | `Passw0rd!` |

อื่น ๆ ที่มีประโยชน์
- ดู/แก้ข้อมูลในฐานข้อมูล: Supabase Studio ที่ http://127.0.0.1:54323
- ดูอีเมลที่ระบบส่ง (ยืนยันสมัคร, รีเซ็ตรหัสผ่าน): http://127.0.0.1:54324
- ข้อมูลเพี้ยนหรือดึงโค้ดใหม่ที่มี migration ใหม่: `npx supabase db reset`
- เลิกงาน: `npx supabase stop`

### 5. คำสั่งตรวจงานก่อนเปิด PR

```powershell
npm run lint
npm run typecheck
npm run test:unit
npm run build
npx playwright install chromium   # ครั้งแรกครั้งเดียว
npx playwright test --project=chromium --grep "@smoke|@security"
```

ชุด Playwright ด้านบนเป็นชุดเดียวกับที่ CI รัน (Playwright เปิดเว็บเองด้วย `npm run start` จึงต้อง `npm run build` ก่อน และปิด `npm run dev` ไว้) อ่านขั้นตอนทำงานเป็นทีมต่อที่ [`CONTRIBUTING.md`](CONTRIBUTING.md)

### ถ้าติดขัด

- `supabase start` error เรื่อง Docker: เปิด Docker Desktop ให้ขึ้น "Engine running" ก่อน
- port ชน (54321–54324 ถูกใช้อยู่): `npx supabase stop` แล้ว start ใหม่
- ล็อกอินบัญชีตัวอย่างไม่ได้: `npx supabase db reset` แล้วลองใหม่
- เครื่องเปิด Docker ไม่ไหว: สร้างโปรเจกต์ Supabase ฟรีแยกไว้ใช้พัฒนาเอง แล้ว `npx supabase link` + `npx supabase db push` (**ห้ามใช้โปรเจกต์ production ร่วมกัน** และห้ามรัน `seed.sql` บน production)
