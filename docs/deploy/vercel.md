# Deploy บน Vercel (ทีละขั้น)

ทำตามลำดับ แล้วกรอกช่อง "ผลลัพธ์" ทุกข้อที่มี [ทีม] ต้องทำ [supabase.md](supabase.md) ขั้นที่ 1-4 และ 11 ให้เสร็จก่อน (ต้องมี Project URL และ anon key)

> **คำเตือน: แพ็กเกจ Vercel Hobby (ฟรี) ห้ามใช้เชิงพาณิชย์** ใช้ได้เฉพาะโปรเจกต์ส่วนตัว/การศึกษา ถ้าจะหารายได้จากเว็บ ต้องเปลี่ยนแพ็กเกจหรือย้ายที่โฮสต์ก่อน
> ค่าใช้จ่ายของโปรเจกต์นี้ต้องเป็น 0 บาท อย่ากรอกบัตรเครดิตเพื่ออัปเกรด

เอกสารที่เกี่ยวข้อง: [secrets.md](secrets.md), [production-checklist.md](production-checklist.md), [google.md](google.md)

> ชื่อเมนูใน Vercel อาจเปลี่ยนตามเวอร์ชันของแดชบอร์ด ถ้าหาไม่เจอให้ใช้ช่องค้นหาหรือถาม Dev

---

## ขั้นที่ 1 [ทีม] Import repo

1. เข้า <https://vercel.com> สมัคร/ล็อกอินด้วยบัญชี GitHub (เลือกแพ็กเกจ **Hobby**)
2. กด **Add New...** > **Project** แล้วเลือก repo ของ FretPath (ถ้าไม่เห็น ให้กด Adjust GitHub App Permissions เพื่ออนุญาต repo นี้)
3. กด **Import**

ผลลัพธ์: ____ วันที่: ____ ผู้ทำ: ____

## ขั้นที่ 2 [ทีม] ตั้งค่าโปรเจกต์ (ก่อนกด Deploy)

1. **Framework Preset**: `Next.js` (ปกติตรวจเจอเอง)
2. **Node.js Version**: `22.x` (ตรงกับ `.nvmrc`) ตั้งที่ Settings > General > Node.js Version
3. **Production Branch**: `main` (Settings > Git > Production Branch)
4. Build Command / Output Directory: ใช้ค่าเริ่มต้น ไม่ต้องแก้

ผลลัพธ์: ____ วันที่: ____ ผู้ทำ: ____

## ขั้นที่ 3 [ทีม] ตั้ง Environment Variables

ที่หน้า Import (หรือ Settings > Environment Variables) เพิ่มตัวแปรทั้ง 4 ตัว และเลือก Environment ให้ติ๊ก **Production และ Preview** ทั้งคู่

| ชื่อ | ค่า |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / public key จาก Supabase (Project Settings > API) |
| `NEXT_PUBLIC_SITE_URL` | `https://<domain>` |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | `false` (เปิดเป็น `true` ภายหลังตาม [google.md](google.md)) |

รูปแบบของ `NEXT_PUBLIC_SITE_URL` (สำคัญ เพราะใช้สร้างลิงก์ในอีเมล):

- ต้องขึ้นต้นด้วย `https://` และเป็นโดเมนจริงของ production เช่น `https://fretpath.vercel.app`
- ไม่ต้องมี `/` ท้าย (โค้ดใน `lib/site-url.ts` ตัด `/` ท้ายออกให้ แต่ควรกรอกให้ถูกอยู่แล้ว)
- ถ้าไม่ตั้ง ระบบจะใช้ `http://localhost:3000` ซึ่งทำให้ลิงก์ในอีเมลใช้ไม่ได้บน production
- ค่า `NEXT_PUBLIC_*` ถูกใช้ตอน build ถ้าแก้ภายหลังต้อง **Redeploy**
- ใส่ได้เฉพาะ 4 ตัวนี้ ห้ามใส่ service role key หรือความลับอื่นใน Vercel

ถ้ายังไม่ทราบโดเมน: deploy ครั้งแรกด้วยค่าชั่วคราว ดูโดเมนที่ได้ (รูปแบบ `<ชื่อโปรเจกต์>.vercel.app`) แล้วแก้ `NEXT_PUBLIC_SITE_URL` ให้ตรง และ Redeploy

ผลลัพธ์: ____ วันที่: ____ ผู้ทำ: ____

## ขั้นที่ 4 [ทีม] Deploy และส่ง URL ให้ Dev

1. กด **Deploy** รอจน build สำเร็จ (ถ้า build ล้มเหลว ให้แคปข้อความ error ส่ง Dev)
2. เปิดโดเมน production ที่ได้ ต้องเห็นหน้าแรก FretPath
3. กลับไปตั้ง URL ใน Supabase ให้ตรงกับโดเมนนี้ ([supabase.md](supabase.md) ขั้นที่ 5)
4. ตั้ง GitHub secret `PROD_URL` และ secrets อื่นตาม [secrets.md](secrets.md)
5. **ส่ง URL production ให้ Dev**

ผลลัพธ์: ____ (URL: ____) วันที่: ____ ผู้ทำ: ____

## ข้อควรระวัง: Preview deployment

Preview (ทุก branch/PR ที่ Vercel สร้างให้) ใช้ฐานข้อมูล production เดียวกัน ดังนั้น **Preview ใช้แบบอ่านอย่างเดียว** ห้ามรันเทสต์ที่เขียนข้อมูล (สมัครบัญชี, ส่งแบบฝึกหัด ฯลฯ) บน Preview หรือ Production ยกเว้นการทดสอบด้วยมือ TC-PRD-05 ที่ทำโดยตั้งใจเพียงครั้งเดียว

---

## การตรวจสอบหลัง deploy (Dev ตรวจ)

Dev รัน smoke test แบบอ่านอย่างเดียวกับ production:

```bash
PROD_URL=<url> npx playwright test --project=prod
```

เมื่อ URL ไม่ใช่ localhost ต้องตั้ง `PROD_SUPABASE_URL` และ `PROD_SUPABASE_ANON_KEY` ด้วย (ไม่เช่นนั้น TC-PRD-06 จะล้มเหลวโดยเจตนา)

| รหัส | ตรวจอะไร |
| --- | --- |
| TC-PRD-01 | `/api/health` ตอบ 200 และ `{"ok":true}` (ฐานข้อมูลเข้าถึงได้) |
| TC-PRD-02 | หน้าแรกแสดงหัวข้อ FretPath และมี security headers (CSP `frame-ancestors 'none'`, HSTS เมื่อเป็น https) |
| TC-PRD-03 | เข้า `/admin` และ `/dashboard` โดยไม่ล็อกอินแล้วถูกส่งไป `/login?next=...` |
| TC-PRD-04 | บัญชีทดสอบ (`member@fretpath.test`) ล็อกอินไม่ได้บน production (ยืนยันว่าไม่มี seed หลุดขึ้นไป) |
| TC-PRD-06 | รายการคอร์สสาธารณะมี "กีตาร์พื้นฐาน" |

ผลที่คาดหวัง: TC-PRD-01..04 และ 06 ผ่านทั้งหมด

ผลลัพธ์ (Dev): ____ วันที่: ____ ผู้ตรวจ: ____

## TC-PRD-05 ทดสอบด้วยมือ [ทีม/QA]

ตรวจว่าลิงก์ในอีเมลบน production ใช้ได้จริงจากอีกอุปกรณ์ (ไม่ชี้ localhost)

1. บนเว็บ production สมัครบัญชีจริงด้วยอีเมลจริง
2. เปิดอีเมลในโทรศัพท์ (หรืออีกเครื่องหนึ่ง) แล้วกดลิงก์
3. ที่หน้ากลาง กดปุ่ม **ยืนยันและเข้าสู่ระบบ**
4. ผลที่คาดหวัง: เข้า Dashboard และเห็นบทที่ 1 ปลดล็อก
5. ทำซ้ำกับ "ลืมรหัสผ่าน": ขอลิงก์ รีเซ็ตรหัสผ่านจากอีกเครื่อง แล้วเข้าสู่ระบบด้วยรหัสใหม่ได้
6. บันทึกผลพร้อมภาพหน้าจอใน `docs/qa/test-summary.md` (ทำใน Task 9)
7. ถ้าลิงก์ชี้ localhost หรือใช้ไม่ได้ ให้ตรวจ `NEXT_PUBLIC_SITE_URL` (ขั้นที่ 3), Site URL/Redirect URLs และเทมเพลตอีเมลใน [supabase.md](supabase.md) ขั้นที่ 5 และ 7

ผลสมัคร/ยืนยัน: ____ ผลลืมรหัสผ่าน: ____ วันที่: ____ ผู้ทำ: ____
