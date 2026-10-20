# เช็กลิสต์ขึ้นระบบจริง (แผนที่ 4)

รายการที่ต้องตั้งค่าบน Supabase (hosted) และ Vercel ก่อนเปิดใช้งานจริง ค่าที่ใช้ในเครื่อง (`supabase/config.toml`) ไม่ถูกนำไปใช้บนระบบ hosted โดยอัตโนมัติ

## Supabase (hosted)

- [ ] **เทมเพลตอีเมล** (Confirm signup และ Reset password): คัดลอกจาก `supabase/templates` ลิงก์ต้องใช้ `{{ .TokenHash }}` ชี้ไปที่ `/auth/confirm` (ไม่ใช่ `{{ .ConfirmationURL }}`) จนกว่าจะตั้งค่านี้ `emailRedirectTo` / `redirectTo` ในโค้ดเป็นเพียงค่าสำรอง
- [ ] **URL Configuration**: ตั้ง `site_url` เป็นโดเมน production และเพิ่มโดเมนนั้น (รวม `/auth/callback` และ `/auth/confirm`) ใน `additional_redirect_urls`
- [ ] **Auth**: เปิด `enable_confirmations` (ยืนยันอีเมลก่อนใช้งาน) และตั้งรหัสผ่านขั้นต่ำ 8 ตัวอักษร ให้ตรงกับ `config.toml`
- [ ] **Custom SMTP**: ใช้ผู้ให้บริการอีเมลที่มีแพ็กเกจฟรี เพราะตัวส่งอีเมลในตัวของ Supabase จำกัดจำนวนการส่งต่อชั่วโมงต่ำมาก
- [ ] **ฐานข้อมูลและ Storage**: รัน `supabase db push` เพื่อสร้างตาราง ฟังก์ชัน RLS รวมถึง storage buckets (`lesson-images`, `avatars`) และ policies ซึ่งอยู่ใน migrations ทั้งหมด
- [ ] **Google OAuth** (ถ้าต้องการ): สร้าง OAuth client ที่ Google Cloud ใส่ redirect URI ของ Supabase (`https://<project>.supabase.co/auth/v1/callback`) และกรอก Client ID/Secret ใน Supabase ก่อนเปิด `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` ให้ทบทวน CSP directive `form-action` ว่าอนุญาตการ redirect ไป Google

## Vercel

- [ ] ตั้ง `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` และ `NEXT_PUBLIC_SITE_URL` ในช่วง build (build จะ throw ถ้าไม่มี Supabase URL)
- [ ] เปิด HSTS บนโดเมนที่ผูกเอง (custom domain)
- [ ] พิจารณาเพิ่มหน้ากลางให้ผู้ใช้กดยืนยัน (interstitial confirm page) ก่อนใช้ token เพื่อป้องกันตัวสแกนอีเมลที่เปิดลิงก์ล่วงหน้า (prefetch) จนลิงก์ถูกใช้ไปก่อน
