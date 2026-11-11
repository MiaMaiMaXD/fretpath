# ทำงานร่วมกันใน FretPath

ตั้งเครื่องตาม [README ส่วน "เริ่มบนเครื่องของคุณ"](README.md#เริ่มบนเครื่องของคุณ) ให้เสร็จก่อน แล้วค่อยอ่านต่อ

## ทีมและหน้าที่

| คน | หน้าที่ | ดูแลไฟล์หลัก |
|---|---|---|
| **ก้อง** | ออกแบบ UI จาก Figma | `app/globals.css` (ธีม Tailwind: สี ฟอนต์ ระยะ), `components/ui/` (ชิ้นส่วน UI พื้นฐาน เช่น Button, Card, Input) |
| **ไอเดีย** | Frontend | หน้าเว็บใน `app/(auth)`, `app/(learner)`, `app/(admin)` (ไฟล์ `page.tsx`, `layout.tsx`) และ `components/` |
| **ไอซ์** | Backend + QA (หลัก) | `supabase/`, ไฟล์ `actions.ts` ทุกไฟล์, `lib/`, `proxy.ts`, `e2e/`, `tests/`, `docs/qa/`, `.github/` |

แก้ไฟล์ของคนอื่นได้ แต่ให้บอกเจ้าของก่อน และให้เจ้าของเป็นคนรีวิว PR นั้น GitHub จะขอรีวิวจากเจ้าของไฟล์ให้อัตโนมัติตาม `.github/CODEOWNERS`

## รอบการทำงาน 1 งาน

```powershell
# 1. เริ่มจาก main ล่าสุดเสมอ
git checkout main
git pull

# 2. แตก branch ใหม่ต่อ 1 งาน
git checkout -b feat/login-redesign

# 3. แก้งาน แล้ว commit เป็นระยะ
git add .
git commit -m "feat(ui): redesign login page"

# 4. ส่งขึ้น GitHub
git push -u origin feat/login-redesign
```

5. เปิด GitHub แล้วกด **Compare & pull request** เขียนว่าทำอะไรและแนบภาพหน้าจอ (ถ้าเป็นงาน UI)
6. รอ **CI ผ่าน (ติ๊กเขียว)** และรอเพื่อน **approve อย่างน้อย 1 คน** (`main` ตั้งกฎนี้ไว้ ข้ามไม่ได้)
7. กด **Merge pull request** แล้วลบ branch ทิ้ง
8. Vercel จะ deploy ขึ้นเว็บจริงเองหลัง merge เข้า `main`

ระหว่างทำงาน ถ้า `main` มีงานใหม่เข้ามา ให้ดึงมารวมกับ branch ตัวเองด้วย `git pull origin main` ถ้า conflict แล้วแก้ไม่ถูก ให้ถามเจ้าของไฟล์นั้น

### ตั้งชื่อ branch และ commit

| ประเภท | ใช้เมื่อ | ตัวอย่าง branch | ตัวอย่าง commit |
|---|---|---|---|
| `feat` | เพิ่มของใหม่ | `feat/dashboard-redesign` | `feat(ui): add Card component` |
| `fix` | แก้บั๊ก | `fix/quiz-timer` | `fix(quiz): stop timer after submit` |
| `docs` | เอกสาร | `docs/test-summary` | `docs(qa): record MOB-03 result` |
| `test` | เพิ่ม/แก้เทสต์ | `test/login-e2e` | `test(e2e): update login selectors` |
| `style` | จัดหน้าตาโดยไม่เปลี่ยนการทำงาน | `style/spacing` | `style(ui): tidy spacing on lesson page` |

PR เล็ก ๆ หลายอัน รีวิวง่ายกว่า PR ใหญ่อันเดียว (เช่น 1 PR ต่อ 1 หน้า)

## งาน UI: จาก Figma สู่โค้ด (ก้อง → ไอเดีย)

1. **ก้องทำ design tokens ก่อน:** สี ฟอนต์ ขนาดตัวอักษร มุมโค้ง และเงา ใส่ไว้ใน `@theme` ของ `app/globals.css` แล้วตั้งชื่อตามหน้าที่ เช่น `--color-primary`, `--color-surface` แทนชื่อสีตรง ๆ อย่าง `--color-blue-500`
2. **ก้องทำชิ้นส่วนพื้นฐาน** ใน `components/ui/` เช่น `Button.tsx`, `Card.tsx`, `Input.tsx` โดยใช้ token จากข้อ 1
3. **ไอเดียนำชิ้นส่วนไปเปลี่ยนหน้าเดิมทีละหน้า** ทำ 1 PR ต่อ 1 หน้า

ข้อควรระวังเรื่องโค้ดที่ export จาก Figma
- **อย่าเอาไฟล์ทั้งหน้าจาก Figma มาวางทับหน้าเดิม** หน้าเดิมต่อกับฟอร์มและ Server Actions ไว้แล้ว ถ้าทับจะทำให้ล็อกอิน ส่งควิซ หรือบันทึกการฝึกพัง ให้เปลี่ยนแค่หน้าตา (className, โครง HTML) แต่คง `<form action={...}>`, `name="..."` ของ input และ props เดิมไว้
- โค้ดจาก Figma มักใช้ `position: absolute` กับความกว้างตายตัว ให้เปลี่ยนเป็น flex/grid เพื่อให้แสดงบนมือถือได้ (Playwright มีชุดทดสอบบนจอมือถือด้วย)
- ห้ามใส่คีย์หรือ URL ของ production ลงในโค้ด

## ข้อตกลงที่ทำให้เทสต์ไม่พัง (สำคัญกับ QA)

เทสต์ Playwright หาองค์ประกอบบนหน้าเว็บจาก**ข้อความ, label และ role** ถ้าเปลี่ยนสิ่งเหล่านี้ เทสต์จะพัง
- ถ้าเป็นไปได้ ให้คง **ข้อความบนปุ่ม/หัวข้อ** และ **`<label>` ของช่องกรอก** ไว้เหมือนเดิม ถ้าจำเป็นต้องเปลี่ยน ให้เขียนไว้ใน PR เพื่อให้ไอซ์แก้เทสต์ตาม
- ทุกช่องกรอกต้องมี `<label>` และปุ่มที่มีแต่ไอคอนต้องมี `aria-label` (ไม่อย่างนั้นการตรวจ accessibility ด้วย axe จะไม่ผ่าน)
- ใช้ `<button>` กับ `<a>`/`<Link>` ให้ถูกที่ ห้ามใช้ `<div onClick>`
- ตัวอักษรต้องตัดกับพื้นหลังพอ (contrast อย่างน้อย 4.5:1)

ก่อนเปิด PR ให้รันคำสั่งในข้อ 5 ของ README ถ้าไม่ได้รัน CI ก็จะรันให้อยู่ดี แต่จะเสียเวลารอนานกว่า

## งานฐานข้อมูล (ไอซ์)

- เปลี่ยนโครงสร้างตาราง/สิทธิ์ด้วย **migration ใหม่** ใน `supabase/migrations/` เสมอ ห้ามแก้ไฟล์ migration เก่าที่ merge ไปแล้ว
- เพิ่ม pgTAP test ใน `supabase/tests/` และตรวจด้วย `npx supabase test db`
- หลังเปลี่ยน schema ให้รัน `npm run db:types` เพื่ออัปเดต `lib/database.types.ts`
- หลัง merge ต้อง `npx supabase db push` ขึ้น production เอง ตาม `docs/deploy/supabase.md`
- เพื่อนที่ดึงโค้ดที่มี migration ใหม่ไป ต้องรัน `npx supabase db reset` บนเครื่องตัวเอง

## รายงานบั๊ก

เปิด Issue บน GitHub ด้วยแบบฟอร์ม **Defect** (อยู่ใน `.github/ISSUE_TEMPLATE/defect.yml`) แนบขั้นตอนทำซ้ำและภาพหน้าจอ
