# Backup และการกู้คืนฐานข้อมูล (NFR-06)

## สิ่งที่ backup เก็บ

workflow `.github/workflows/backup.yml` (ชื่อ "Backup") รันทุกวันอาทิตย์ 03:00 น. เวลาไทย (cron `0 20 * * 6` UTC) และกด Run workflow เองได้ ทำสิ่งต่อไปนี้กับฐานข้อมูล production ของ Supabase:

1. dump 3 ไฟล์: `roles.sql` (roles), `schema.sql` และ `data.sql` (schema `public`, `auth`, `storage`)
2. ทดสอบกู้คืนใน Postgres ชั่วคราว (`scripts/backup-check.sh restore`) และต้องนับ `public.lessons` ได้ >= 1 มิฉะนั้น job ล้มเหลว (ไม่อัปโหลดอะไร)
3. รวมเป็น `.tar.gz` แล้วเข้ารหัสด้วย GPG (AES256, symmetric) เป็น `fretpath-backup-<YYYY-MM-DD>.tar.gz.gpg` และลบไฟล์ SQL ดิบทิ้ง
4. อัปโหลดเป็น artifact ชื่อ `fretpath-backup` เก็บ 90 วัน

ข้อควรระวัง: repo เป็น public ใครก็ดาวน์โหลด artifact ได้ และ dump มีอีเมลกับ password hash ผู้ใช้ จึงอัปโหลดเฉพาะไฟล์ที่เข้ารหัสเท่านั้น ห้ามแก้ workflow ให้อัปโหลดไฟล์ `.sql` หรือ `.tar.gz` ดิบ

ไม่รวม: ไฟล์ใน Storage bucket (dump เก็บเฉพาะ metadata) และการตั้งค่า Auth ใน dashboard

## ดาวน์โหลด

```bash
gh run list --workflow Backup --repo <owner>/<repo>
gh run download <run-id> --repo <owner>/<repo> -n fretpath-backup
```

หรือ GitHub > Actions > Backup > เลือก run > Artifacts > `fretpath-backup`

## ถอดรหัส

```bash
gpg -d fretpath-backup-YYYY-MM-DD.tar.gz.gpg > backup.tar.gz   # gpg จะถาม passphrase
mkdir restore && tar xzf backup.tar.gz -C restore   # ได้ roles.sql schema.sql data.sql
```

ความเข้ากันได้: ไฟล์ถูกสร้างด้วย `gpg --symmetric --cipher-algo AES256` (โหมด MDC ปกติ ไม่ใช้ AEAD ที่ไม่ได้สั่ง) จึงถอดรหัสได้ด้วย GnuPG 2.1 ขึ้นไป (ubuntu-latest ใช้ 2.4.x) ไม่ต้องใช้ตัวเลือกพิเศษ

ใช้ passphrase ที่เก็บไว้นอก GitHub (secret `BACKUP_PASSPHRASE`) ถ้า passphrase หาย backup เก่าจะเปิดไม่ได้เลย ลบไฟล์ `backup.tar.gz` และโฟลเดอร์ `restore` ทิ้งเมื่อเสร็จ

## กู้คืนลง Supabase local

```bash
npx supabase start
npx supabase db reset --no-seed            # สร้าง schema ใหม่โดยไม่ใส่ seed (กัน duplicate key ใน public/auth/storage)
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f restore/data.sql
```

ถ้าไม่มี `psql` ให้ใช้ `docker exec -i supabase_db_fretpath psql -U postgres < restore/data.sql`
ถ้าต้องการทดสอบแบบเดียวกับ CI (Postgres เปล่า): `RESTORE_ADMIN_URL=postgresql://postgres:postgres@localhost:5432/postgres scripts/backup-check.sh restore restore` (สคริปต์จะ drop/สร้าง database `restore_check` ใน server นั้น อย่าชี้ไปที่ DB จริง)

## กู้คืนลงโปรเจกต์ Supabase ใหม่

1. สร้างโปรเจกต์ใหม่ (เวอร์ชัน Postgres เดียวกับของเดิม) แล้วเอา connection string แบบ Session Pooler (พอร์ต 5432) เท่านั้น เพราะ direct connection เป็น IPv6 อย่างเดียว
2. ใช้ migration ของ repo สร้าง schema: `npx supabase link --project-ref <ref>` แล้ว `npx supabase db push` (แนะนำ เพราะ schema ที่ Supabase จัดการเองจะตรงเวอร์ชัน) แล้วโหลดข้อมูล:
   ```bash
   psql "$NEW_DB_URL" -f restore/data.sql
   ```
   ถ้า row ซ้ำกับ seed ให้ truncate ตารางนั้นก่อน
3. ทางเลือก: โหลด `roles.sql` และ `schema.sql` เองกับโปรเจกต์ว่าง (จะมี error ของ object ที่ Supabase มีอยู่แล้ว ซึ่งปกติ)
4. ตรวจ: `select count(*) from public.lessons;` ต้อง >= 1 และลองล็อกอินด้วยผู้ใช้เดิม

## เปลี่ยนเวอร์ชัน Postgres ของ restore check

workflow ใช้ service `postgres:17` ถ้าโปรเจกต์ production เป็นเวอร์ชันอื่น (ดูที่ Dashboard > Settings > Infrastructure) ให้แก้ `image:` ใน `.github/workflows/backup.yml` เป็นเวอร์ชันเดียวกันหรือใหม่กว่า (Supabase CLI ใช้ pg_dump ตรงกับ server อัตโนมัติ)

## เปลี่ยน (rotate) passphrase

1. ตั้งค่า `BACKUP_PASSPHRASE` ใหม่ใน Settings > Secrets and variables > Actions และเก็บค่าใหม่นอก GitHub
2. backup เก่ายังต้องใช้ passphrase เดิม: ถอดรหัสแล้วเข้ารหัสใหม่ด้วยค่าใหม่ หรือเก็บ passphrase เดิมไว้จนกว่า artifact เก่าจะหมดอายุ (90 วัน)
3. กด Run workflow ตรวจว่าผ่าน

## สิ่งที่ทีมต้องทำ (TODO)

- [ ] ตั้ง secret `SUPABASE_DB_URL` (connection string ของ production แบบ Session Pooler พอร์ต 5432 เท่านั้น: direct connection เป็น IPv6 อย่างเดียวและ GitHub runner ไม่มี IPv6, และห้ามใช้ transaction pooler 6543; รหัสผ่านต้อง percent-encode)
- [ ] ตั้ง secret `BACKUP_PASSPHRASE` (สุ่มยาว และเก็บสำเนาใน password manager นอก GitHub)
- [ ] Actions > Backup > Run workflow ครั้งแรก
- [ ] TC-OPS-03: ดาวน์โหลด artifact แล้ว `file fretpath-backup-*.gpg` ต้องบอกว่าเป็น PGP/GPG encrypted data และไม่มีไฟล์ `.sql` ใน artifact
- [ ] TC-OPS-04: log ขั้น "Restore check" แสดง `public.lessons count after restore: N` โดย N >= 1
- [ ] ลองกู้คืนจริง 1 ครั้งตามคู่มือนี้ในเครื่อง และบันทึกผล
- [ ] ยืนยันเวอร์ชัน Postgres ของ production ตรงกับ `postgres:17` ใน workflow
