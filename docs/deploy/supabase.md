# สร้าง Supabase production (ทีละขั้น)

คู่มือนี้สำหรับทีมที่ไม่เคยตั้งค่าระบบจริงมาก่อน ทำตามลำดับ ทีละข้อ แล้วกรอกช่อง "ผลลัพธ์" ทุกข้อที่มี [ทีม]

> **คำเตือนสำคัญ: ห้ามรัน `supabase/seed.sql` กับ production เด็ดขาด**
> ไฟล์นี้สร้างบัญชีทดสอบ (`member@fretpath.test`, `admin@fretpath.test`) ที่มีรหัสผ่านที่ทุกคนรู้ ใครก็เข้าระบบจริงได้
> - โครงสร้างฐานข้อมูล production มาจาก `supabase db push` (migrations) เท่านั้น
> - เนื้อหาคอร์สมาจาก `supabase/content/guitar-basics.sql` (รันซ้ำได้ ไม่สร้างบัญชีผู้ใช้)
> - ห้ามเอา `seed.sql` ไปวางใน SQL Editor และห้ามใช้ `supabase db reset` กับโปรเจกต์ที่ link อยู่

ใช้ฟรีทั้งหมด (0 บาท): Supabase Free

- โปรเจกต์ Free จะถูก **หยุดชั่วคราว (pause) ถ้าไม่มีการใช้งานราว 7 วัน** workflow `.github/workflows/keep-alive.yml` เรียก `/api/health` ทุก 2 วันเพื่อป้องกันเรื่องนี้ (ต้องตั้ง secret `PROD_URL` ตาม [secrets.md](secrets.md))
- ห้ามพิมพ์หรือแปะค่าจริงของรหัสผ่าน/คีย์ลงในไฟล์ใน repo, issue หรือแชต ใช้ตัวแทน เช่น `<project-ref>` ในเอกสาร

เอกสารที่เกี่ยวข้อง: [production-checklist.md](production-checklist.md), [backup-restore.md](backup-restore.md), [secrets.md](secrets.md), [vercel.md](vercel.md), [google.md](google.md)

> ชื่อเมนูใน Supabase Dashboard อาจย้ายตำแหน่งหรือเปลี่ยนชื่อเล็กน้อยตามเวอร์ชันของแดชบอร์ด ถ้าหาไม่เจอให้ใช้ช่องค้นหาของแดชบอร์ดหรือถาม Dev

---

## ขั้นที่ 1 [ทีม] สร้างโปรเจกต์ Free

1. เข้า <https://supabase.com/dashboard> แล้วล็อกอิน (ใช้บัญชี GitHub ได้)
2. กด **New project** เลือก Organization (แพ็กเกจ **Free**)
3. กรอก
   - Name: `fretpath`
   - Database Password: กด Generate หรือตั้งเอง ให้ยาวและสุ่ม
   - Region: **Southeast Asia (Singapore)**
4. กด **Create new project** แล้วรอจนสถานะพร้อมใช้งาน (ประมาณ 1-2 นาที)
5. **เก็บ Database Password ไว้ใน password manager ของทีม** (ดูรหัสเดิมภายหลังไม่ได้ ต้อง reset) ห้ามเก็บใน repo
6. จด **Project ref** (ข้อความสั้นๆ ใน URL ของแดชบอร์ด หรือที่ Project Settings > General) ไว้ใช้แทน `<project-ref>`

ผลลัพธ์: ____ (project ref: ____) วันที่: ____ ผู้ทำ: ____

## ขั้นที่ 2 [ทีม] เชื่อมเครื่องกับโปรเจกต์ (CLI)

รันในโฟลเดอร์ของโปรเจกต์ (Node 22 ตาม `.nvmrc`):

```bash
npm ci
npx supabase login
npx supabase link --project-ref <project-ref>
```

- `login` จะเปิดเบราว์เซอร์ให้อนุมัติ
- `link` อาจถามรหัสผ่านฐานข้อมูล ให้ใส่ Database Password จากขั้นที่ 1

ผลลัพธ์: ____ วันที่: ____ ผู้ทำ: ____

## ขั้นที่ 3 [ทีม] สร้างตารางด้วย migrations

```bash
npx supabase db push
```

- ระบบจะแสดงรายการ migration ที่จะรัน (ใน `supabase/migrations` มี 16 ไฟล์) ตอบ `Y` เพื่อยืนยัน
- ถ้าเกิด error ให้หยุด และส่งข้อความ error ให้ Dev (อย่ารันซ้ำสุ่มสี่สุ่มห้า)
- ห้ามแก้ตารางด้วยมือใน dashboard เพราะโครงสร้างต้องมาจาก migrations เท่านั้น

ผลลัพธ์: ____ วันที่: ____ ผู้ทำ: ____

## ขั้นที่ 4 [ทีม] ใส่เนื้อหาคอร์ส

1. ใน Dashboard เปิด **SQL Editor** > New query
2. เปิดไฟล์ `supabase/content/guitar-basics.sql` ในเครื่อง คัดลอกทั้งไฟล์มาวาง
3. กด **Run**
4. ไฟล์นี้รันซ้ำได้ ไม่สร้างบัญชีผู้ใช้ **ห้ามใช้ `supabase/seed.sql` แทน**

ผลลัพธ์: ____ วันที่: ____ ผู้ทำ: ____

## ขั้นที่ 5 [ทีม] ตั้งค่า URL

ต้องรู้โดเมนของ Vercel ก่อน (ถ้ายังไม่ได้ deploy ให้ทำตาม [vercel.md](vercel.md) ถึงขั้นได้ URL ก่อน แล้วกลับมาทำข้อนี้) ใช้แทน `<domain>` ด้านล่าง เช่น `https://fretpath.vercel.app` (มี `https://` ไม่มี `/` ท้าย)

1. ไปที่ **Authentication** > **URL Configuration**
2. **Site URL**: `https://<domain>`
3. **Redirect URLs** กด Add URL ทีละบรรทัด
   - `https://<domain>/auth/callback`
   - `https://<domain>/auth/confirm`
4. กด **Save**

ถ้าตั้งผิด ลิงก์ในอีเมลจะชี้ไป localhost หรือใช้ไม่ได้ (ตรวจด้วย TC-PRD-05 ใน [vercel.md](vercel.md))

ผลลัพธ์: ____ วันที่: ____ ผู้ทำ: ____

## ขั้นที่ 6 [ทีม] ตั้งค่าอีเมลและรหัสผ่าน

1. ไปที่ **Authentication** > **Providers** > **Email**
2. ตรวจว่า
   - Enable Email provider: เปิด
   - **Confirm email**: เปิด (ต้องยืนยันอีเมลก่อนใช้งาน ตรงกับ `enable_confirmations = true` ใน `supabase/config.toml`)
   - **Minimum password length**: `8` (ตรงกับ `minimum_password_length = 8`) ถ้าไม่เห็นช่องนี้ในหน้า Providers ให้หาในหน้าตั้งค่า Authentication อื่นๆ (เมนูอาจย้ายตำแหน่งตามเวอร์ชันของแดชบอร์ด)
3. กด **Save**

ผลลัพธ์: ____ วันที่: ____ ผู้ทำ: ____

## ขั้นที่ 7 [ทีม] ตั้งเทมเพลตอีเมล (ภาษาไทย)

ไปที่ **Authentication** > **Emails** (หรือ Email Templates) แก้ 2 เทมเพลต: **Confirm signup** และ **Reset Password**

| เทมเพลตใน dashboard | Subject (คัดลอกตามนี้) | คัดลอกเนื้อหา (Message body) จากไฟล์ |
| --- | --- | --- |
| Confirm signup | `ยืนยันอีเมลของคุณ - FretPath` | `supabase/templates/confirmation.html` |
| Reset Password | `ตั้งรหัสผ่านใหม่ - FretPath` | `supabase/templates/recovery.html` |

ข้อกำหนดของเนื้อหา (ต้องคัดลอกทั้งไฟล์ตามเดิม ห้ามแก้ลิงก์):

- ลิงก์ต้องอยู่ในรูป `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/dashboard` (ยืนยันอีเมล) และ `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password` (ตั้งรหัสผ่านใหม่)
- **ห้ามใช้ `{{ .ConfirmationURL }}`** เพราะจะไม่ผ่านหน้า `/auth/confirm`
- `{{ .SiteURL }}` คือค่า Site URL จากขั้นที่ 5 ดังนั้นขั้นที่ 5 ต้องถูกต้องก่อน
- ผู้ใช้จะเห็นหน้ากลาง `/auth/confirm` ที่มีปุ่ม "ยืนยันและเข้าสู่ระบบ" (กันตัวสแกนอีเมลใช้ลิงก์ไปก่อน) จึงเปิดลิงก์จากเครื่องอื่นได้

ผลลัพธ์: ____ วันที่: ____ ผู้ทำ: ____

## ขั้นที่ 8 [ทีม] ตั้ง SMTP ฟรี

ตัวส่งอีเมลในตัวของ Supabase จำกัดจำนวนการส่งต่อชั่วโมงต่ำมาก ไม่พอสำหรับใช้งานจริง ให้ใช้ผู้ให้บริการที่มีแพ็กเกจฟรี ทีมเลือกเอง 1 เจ้า เช่น Brevo หรือ Resend (ตรวจเงื่อนไขแพ็กเกจฟรีล่าสุดที่เว็บของผู้ให้บริการ และอย่าผูกบัตรเครดิตถ้าไม่จำเป็น)

1. สมัครผู้ให้บริการ ยืนยันอีเมลผู้ส่ง (หรือโดเมน) ตามที่เขากำหนด แล้วสร้าง SMTP credentials / API key
2. ใน Supabase ไปที่ **Authentication** > **Emails** > **SMTP Settings** เปิด **Enable custom SMTP** (เมนูอาจย้ายตำแหน่งตามเวอร์ชันของแดชบอร์ด)
3. กรอกค่าที่ผู้ให้บริการระบุ

| ช่อง | ค่า (กรอกตามผู้ให้บริการ) |
| --- | --- |
| Host | `<smtp-host>` |
| Port | `<port>` (มักเป็น 587) |
| Username | `<smtp-user>` |
| Password | `<smtp-password>` (เก็บใน password manager ห้ามลง repo) |
| Sender email | `<อีเมลผู้ส่งที่ยืนยันแล้ว>` |
| Sender name | `FretPath` |

4. กด **Save** แล้วทดสอบสมัครบัญชีจริงหนึ่งครั้ง (ดู TC-PRD-05 ใน [vercel.md](vercel.md)) ว่าอีเมลถึงกล่องจดหมาย (เช็กจดหมายขยะด้วย)

ผู้ให้บริการที่เลือก: ____ ผลลัพธ์: ____ วันที่: ____ ผู้ทำ: ____

## ขั้นที่ 9 [ทีม] สร้างแอดมินคนแรก

1. เปิดเว็บ production แล้วสมัครบัญชีด้วยอีเมลจริงของแอดมิน กดลิงก์ยืนยันในอีเมลให้เรียบร้อย (ต้องทำขั้นที่ 5-8 และ deploy เว็บก่อน)
2. ใน **SQL Editor** รัน (แทน `<อีเมลแอดมิน>` ด้วยอีเมลที่สมัคร):

```sql
update public.profiles set role = 'admin' where id = (select id from auth.users where email = '<อีเมลแอดมิน>');
```

3. ผลที่คาดหวัง: `Success. 1 row affected` (ถ้าได้ 0 แถว แปลว่าอีเมลพิมพ์ผิดหรือยังไม่ได้สมัคร)
4. ออกจากระบบแล้วเข้าสู่ระบบใหม่ ควรเข้าหน้า `/admin` ได้

ผลลัพธ์: ____ วันที่: ____ ผู้ทำ: ____

## ขั้นที่ 10 [ทีม] เก็บ Connection string (Session Pooler) สำหรับ backup

backup (`.github/workflows/backup.yml`) ต้องใช้ connection string ของฐานข้อมูล รายละเอียดอยู่ใน [backup-restore.md](backup-restore.md) ให้ทำดังนี้

1. กดปุ่ม **Connect** บนแถบด้านบนของโปรเจกต์ (หรือ Database > Connection string) (เมนูอาจย้ายตำแหน่งตามเวอร์ชันของแดชบอร์ด)
2. เลือกแบบ **Session pooler** ใช้พอร์ต **5432** เท่านั้น
   - ห้ามใช้ Direct connection เพราะเป็น IPv6 อย่างเดียว และ GitHub runner ไม่มี IPv6
   - ห้ามใช้ Transaction pooler (พอร์ต 6543)
3. รูปแบบ (ตัวอย่าง ค่าจริงดูจาก dashboard): `postgresql://postgres.<project-ref>:<รหัสผ่าน>@<pooler-host>:5432/postgres`
4. แทน `[YOUR-PASSWORD]` ด้วย Database Password จากขั้นที่ 1 ถ้ารหัสผ่านมีอักขระพิเศษต้อง percent-encode (เช่น `@` เป็น `%40`)
5. นำไปตั้งเป็น GitHub secret `SUPABASE_DB_URL` ตาม [secrets.md](secrets.md) (ห้ามวางลงแชตหรือ repo)

ผลลัพธ์: ____ วันที่: ____ ผู้ทำ: ____

## ขั้นที่ 11 [ทีม] คัดลอก URL และ anon key

ที่ **Project Settings** > **API** (หรือ **API Keys**) จดสองค่านี้ไปใช้ใน Vercel ([vercel.md](vercel.md)) และ GitHub Secrets ([secrets.md](secrets.md))

- Project URL: `https://<project-ref>.supabase.co`
- anon / public key (ค่านี้ฝังในเว็บฝั่งผู้ใช้อยู่แล้ว ไม่ใช่ความลับระดับสูง แต่ยังไม่ควรโพสต์สาธารณะ)
- **ห้ามเอา service role key ไปใส่ที่ใดในโปรเจกต์นี้** (Vercel หรือ GitHub Secrets) ถ้าไม่จำเป็น

ผลลัพธ์: ____ วันที่: ____ ผู้ทำ: ____

---

## รายการตรวจหลังตั้งค่าเสร็จ (ส่งผลให้ Dev ตรวจ)

ทีมรันแล้วกรอกผลจริง

### 1. migrations ครบทั้ง Local และ Remote

```bash
npx supabase migration list --linked
```

ผลที่คาดหวัง: ทุก migration (16 ไฟล์) มีค่าทั้งคอลัมน์ Local และ Remote

ผลลัพธ์: ____ วันที่: ____ ผู้ทำ: ____

### 2. จำนวนบทเรียนที่เผยแพร่ = 5

ใน SQL Editor:

```sql
select count(*) from public.lessons where status='published';
```

ผลที่คาดหวัง: `5`

ผลลัพธ์: ____ วันที่: ____ ผู้ทำ: ____

### 3. ไม่มีบัญชีทดสอบ

ใน SQL Editor:

```sql
select count(*) from auth.users where email like '%@fretpath.test';
```

ผลที่คาดหวัง: `0` (ถ้ามากกว่า 0 แปลว่ามีการรัน seed.sql ผิดพลาด หยุดและแจ้ง Dev ทันที)

ผลลัพธ์: ____ วันที่: ____ ผู้ทำ: ____

### 4. การตั้งค่า Auth

- [ ] Site URL และ Redirect URLs ตรงกับโดเมนจริง (ขั้นที่ 5) ผลลัพธ์: ____
- [ ] Confirm email เปิด, รหัสผ่านขั้นต่ำ 8 (ขั้นที่ 6) ผลลัพธ์: ____
- [ ] เทมเพลตอีเมล 2 แบบ + subject ไทย (ขั้นที่ 7) ผลลัพธ์: ____
- [ ] SMTP ทำงาน อีเมลถึงจริง (ขั้นที่ 8) ผลลัพธ์: ____
- [ ] มีแอดมินคนแรกและเข้า `/admin` ได้ (ขั้นที่ 9) ผลลัพธ์: ____

วันที่: ____ ผู้ทำ: ____
