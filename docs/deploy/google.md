# เปิดการเข้าสู่ระบบด้วย Google (FR-01.7)

Google login ส่งผู้ใช้กลับผ่าน `/auth/callback` ดังนั้นต้องตั้ง Redirect URLs ใน [supabase.md](supabase.md) ขั้นที่ 5 (รวม `https://<domain>/**`) ให้เสร็จก่อน

ทำหลังจาก production ใช้งานได้แล้ว ([supabase.md](supabase.md) และ [vercel.md](vercel.md)) ฟรี 0 บาท กรอกช่อง "ผลลัพธ์" ทุกข้อที่มี [ทีม]

ห้ามแปะ Client Secret ลงใน repo, issue หรือแชต เก็บใน password manager และกรอกลง Supabase เท่านั้น ใช้ตัวแทน เช่น `<project-ref>` ในเอกสาร

> ชื่อเมนูใน Google Cloud Console, Supabase และ Vercel อาจเปลี่ยนตามเวอร์ชัน ถ้าหาไม่เจอให้ใช้ช่องค้นหาหรือถาม Dev

---

## ขั้นที่ 1 [ทีม] สร้างโปรเจกต์ใน Google Cloud และตั้ง OAuth consent screen

1. เข้า <https://console.cloud.google.com> ล็อกอินด้วยบัญชี Google ของทีม
2. สร้างโปรเจกต์ใหม่ (ชื่อ `fretpath`) แล้วเลือกโปรเจกต์นั้น
3. ไปที่ **APIs & Services** > **OAuth consent screen** (ในเวอร์ชันใหม่อาจเป็น Google Auth Platform)
4. User Type: **External**
5. กรอกชื่อแอป `FretPath`, อีเมลสนับสนุนผู้ใช้ และอีเมลติดต่อนักพัฒนา
6. สถานะ **Testing**: ต้องเพิ่มอีเมลที่จะทดสอบใน **Test users** (ใส่อีเมลของทีมทุกคน) ผู้ใช้ที่ไม่อยู่ในรายการจะล็อกอินด้วย Google ไม่ได้จนกว่าจะเผยแพร่แอป (Publish app)
7. กด Save

ผลลัพธ์: ____ วันที่: ____ ผู้ทำ: ____

## ขั้นที่ 2 [ทีม] สร้าง OAuth client (Web application)

1. ไปที่ **APIs & Services** > **Credentials** > **Create Credentials** > **OAuth client ID**
2. Application type: **Web application**, ชื่อ `fretpath-web`
3. ที่ **Authorized redirect URIs** กด Add URI แล้วใส่:

   `https://<project-ref>.supabase.co/auth/v1/callback`

   (ใช้โดเมนของ Supabase ไม่ใช่โดเมน Vercel)
4. กด **Create** แล้วคัดลอก **Client ID** และ **Client Secret** เก็บใน password manager

ผลลัพธ์: ____ วันที่: ____ ผู้ทำ: ____

## ขั้นที่ 3 [ทีม] ใส่ Client ID/Secret ใน Supabase

1. Supabase Dashboard > **Authentication** > **Providers** > **Google**
2. เปิด **Enable Sign in with Google**
3. วาง Client ID และ Client Secret จากขั้นที่ 2
4. กด **Save**

ผลลัพธ์: ____ วันที่: ____ ผู้ทำ: ____

## ขั้นที่ 4 [ทีม] เปิดปุ่มใน Vercel และ Redeploy

1. Vercel > Project > **Settings** > **Environment Variables**
2. แก้ `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` เป็น `true` (ทั้ง Production และ Preview)
3. ไปที่แท็บ **Deployments** > เลือก deployment ล่าสุด > **Redeploy** (ต้อง redeploy เพราะค่า `NEXT_PUBLIC_*` ถูกใช้ตอน build)
4. ผลที่ได้: หน้า login แสดงปุ่ม "เข้าสู่ระบบด้วย Google" และนโยบาย CSP `form-action` (ใน `next.config.ts`) จะอนุญาตการ redirect ไป Supabase และ `accounts.google.com` ให้เองเมื่อเปิดตัวแปรนี้ ไม่ต้องแก้โค้ด

ผลลัพธ์: ____ วันที่: ____ ผู้ทำ: ____

## ขั้นที่ 5 [ทีม/QA] ทดสอบด้วยมือ TC-AUTH-18

1. เปิดเว็บ production > หน้า login > กด **เข้าสู่ระบบด้วย Google**
2. เลือกบัญชี Google (ต้องเป็นอีเมลใน Test users)
3. ผลที่คาดหวัง: เข้า Dashboard, ชื่อที่แสดงเป็นชื่อบัญชี Google และบทที่ 1 ปลดล็อก
4. บันทึกผลพร้อมภาพหน้าจอ (ใน `docs/qa/test-summary.md` ตอน Task 9)

ถ้าเจอ `redirect_uri_mismatch`: ตรวจ Authorized redirect URI ในขั้นที่ 2 ว่าตรงกับ `https://<project-ref>.supabase.co/auth/v1/callback` ทุกตัวอักษร

ถ้าเลือกบัญชีแล้วเด้งไปหน้าแรกเป็น `https://<domain>/?code=...` (ไม่เข้า Dashboard): Supabase ไม่ยอมรับ `redirectTo` จึงถอยไปใช้ Site URL ตรวจ (1) `NEXT_PUBLIC_SITE_URL` ใน Vercel ต้องเป็น `https://<domain>` (ถ้าว่าง แอปจะใช้ `http://localhost:3000`) แล้ว Redeploy และ (2) Supabase > Authentication > URL Configuration > Redirect URLs มี `https://<domain>/**`

ใน Vercel ตัวแปร `NEXT_PUBLIC_*` ต้องเป็นประเภท **Config** ไม่ใช่ Secret/Sensitive (ถ้าเป็น Secret จะ Save ไม่ได้และขึ้น "Remove the public framework prefix…") ห้ามลบ prefix `NEXT_PUBLIC_` เพราะโค้ดอ่านชื่อนี้

ผลลัพธ์: ____ วันที่: ____ ผู้ทำ: ____

---

## การตรวจสอบ (Dev ตรวจ)

หลังเปิด Google แล้ว Dev รัน smoke test ซ้ำ:

```bash
PROD_URL=<url> npx playwright test --project=prod
```

ผลที่คาดหวัง: ผ่านทั้งหมดและไม่มี CSP violation บนหน้า login (รายละเอียด test ดู [vercel.md](vercel.md))

ผลลัพธ์ (Dev): ____ วันที่: ____ ผู้ตรวจ: ____

เอกสารที่เกี่ยวข้อง: [secrets.md](secrets.md), [production-checklist.md](production-checklist.md)
