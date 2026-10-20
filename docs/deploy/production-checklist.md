# เช็กลิสต์ขึ้นระบบจริง (แผนที่ 4)

รายการที่ต้องตั้งค่าบน Supabase (hosted) และ Vercel ก่อนเปิดใช้งานจริง ค่าที่ใช้ในเครื่อง (`supabase/config.toml`) ไม่ถูกนำไปใช้บนระบบ hosted โดยอัตโนมัติ

คู่มือทีละขั้น: [supabase.md](supabase.md), [vercel.md](vercel.md), [google.md](google.md), [secrets.md](secrets.md), [backup-restore.md](backup-restore.md)

## Supabase (hosted)

- [ ] **เทมเพลตอีเมล** (Confirm signup และ Reset password): คัดลอกจาก `supabase/templates` ลิงก์ต้องใช้ `{{ .TokenHash }}` ชี้ไปที่ `/auth/confirm` (ไม่ใช่ `{{ .ConfirmationURL }}`) จนกว่าจะตั้งค่านี้ `emailRedirectTo` / `redirectTo` ในโค้ดเป็นเพียงค่าสำรอง
- [ ] **URL Configuration**: ตั้ง `site_url` เป็นโดเมน production และเพิ่ม `https://<domain>/**` ใน Redirect URLs (allow-list) ตามขั้นตอนใน [supabase.md](supabase.md)
- [ ] **Auth**: เปิด `enable_confirmations` (ยืนยันอีเมลก่อนใช้งาน) และตั้งรหัสผ่านขั้นต่ำ 8 ตัวอักษร ให้ตรงกับ `config.toml`
- [ ] **Custom SMTP**: ใช้ผู้ให้บริการอีเมลที่มีแพ็กเกจฟรี เพราะตัวส่งอีเมลในตัวของ Supabase จำกัดจำนวนการส่งต่อชั่วโมงต่ำมาก
- [ ] **ฐานข้อมูลและ Storage**: รัน `supabase db push` เพื่อสร้างตาราง ฟังก์ชัน RLS รวมถึง storage buckets (`lesson-images`, `avatars`) และ policies ซึ่งอยู่ใน migrations ทั้งหมด
- [ ] **Google OAuth** (ถ้าต้องการ): สร้าง OAuth client ที่ Google Cloud ใส่ redirect URI ของ Supabase (`https://<project>.supabase.co/auth/v1/callback`) และกรอก Client ID/Secret ใน Supabase ก่อนเปิด `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` ให้ทบทวน CSP directive `form-action` ว่าอนุญาตการ redirect ไป Google

## Vercel

- [ ] ตั้ง `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` และ `NEXT_PUBLIC_SITE_URL` ในช่วง build (build จะ throw ถ้าไม่มี Supabase URL)
- [x] HSTS: ตั้ง header ในโค้ดแล้ว (`next.config.ts`) ไม่ต้องตั้งเพิ่ม ตรวจหลัง deploy ตาม [vercel.md](vercel.md)
- [x] หน้ากลางยืนยัน (confirm interstitial) ทำแล้วที่ `/auth/confirm` เพื่อกันตัวสแกนอีเมลใช้ token ล่วงหน้า; เหลือแค่ตั้งเทมเพลตอีเมลให้ชี้ไปที่ `/auth/confirm` (ดูหัวข้อ Supabase ด้านบน)
