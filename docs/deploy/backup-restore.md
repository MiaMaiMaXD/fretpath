# Backup และการกู้คืนฐานข้อมูล (NFR-06)

## สิ่งที่ backup เก็บ

workflow `.github/workflows/backup.yml` (ชื่อ "Backup") รันทุกวันอาทิตย์ 03:00 น. เวลาไทย (cron `0 20 * * 6` UTC) และกด Run workflow เองได้ ทำสิ่งต่อไปนี้กับฐานข้อมูล production ของ Supabase:

1. dump 3 ไฟล์: `roles.sql` (roles), `schema.sql` และ `data.sql` (schema `public`, `auth`, `storage`)
2. ทดสอบกู้คืนใน Postgres ชั่วคราว (`docker run --log-driver none postgres:17` ไม่ใช้ service container เพราะ log ของ service container ถูกพิมพ์ในหน้า run ที่เป็นสาธารณะ และ Postgres จะ log ทั้งแถวของ INSERT ที่ล้มเหลว) ด้วย `scripts/backup-check.sh restore` job จะ **ล้มเหลว (และไม่อัปโหลดอะไร)** ถ้าข้อใดข้อหนึ่งเป็นจริง:
   - restore `schema.sql` มี error > 0
   - restore `data.sql` มี error > 0
   - `public.lessons` < 1 แถว
   - `auth.users` < 1 แถว
   - จำนวน `public.profiles` ไม่เท่ากับ `auth.users`

   log แสดงเฉพาะตัวเลข (ไม่มีเนื้อหาแถว) เช่น `restore data: 0 error(s)` และ `public.lessons count after restore: N`
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

หมายเหตุ: `psql` บน runner อาจเป็นรุ่นต่างจาก server ที่เป็น Postgres 17 (psql ใหม่/เก่ากว่าเล็กน้อยใช้ restore ได้ ส่วน `pg_dump` ที่ใช้จริงมากับ Supabase CLI ตรงกับ server อัตโนมัติ)

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

## ผ่อนเกณฑ์ของ restore check (allow-list)

ค่าเริ่มต้นเข้มงวด (error = 0) ถ้า run production ครั้งแรกล้มเพราะ error ที่ไม่เป็นอันตราย (ทีมต้องตรวจสาเหตุจากชื่อ object ใน log แล้วบันทึกเหตุผลใน PR) ให้ผ่อนเฉพาะข้อนั้นอย่างชัดเจนโดยเพิ่ม `env:` ให้ขั้น "Restore check" ใน `.github/workflows/backup.yml`:

```yaml
      - name: Restore check (must succeed or the job fails)
        env:
          ALLOW_SCHEMA_ERRORS: "3"       # จำนวน error สูงสุดที่ยอมรับตอน restore schema (ค่าเริ่มต้น 0)
          ALLOW_DATA_ERRORS: "0"         # ... ตอน restore data (ค่าเริ่มต้น 0)
          ALLOW_PROFILE_MISMATCH: "1"    # ยอมให้ profiles != auth.users (ค่าเริ่มต้น 0)
        run: scripts/backup-check.sh restore work
```

ให้ใส่ตัวเลขเท่ากับจำนวนที่ตรวจแล้ว ไม่ใส่เกิน เกณฑ์ `lessons >= 1` และ `auth.users >= 1` ผ่อนไม่ได้

## เปลี่ยน (rotate) passphrase

1. ตั้งค่า `BACKUP_PASSPHRASE` ใหม่ใน Settings > Secrets and variables > Actions และเก็บค่าใหม่นอก GitHub
2. backup เก่ายังต้องใช้ passphrase เดิม: ถอดรหัสแล้วเข้ารหัสใหม่ด้วยค่าใหม่ หรือเก็บ passphrase เดิมไว้จนกว่า artifact เก่าจะหมดอายุ (90 วัน)
3. กด Run workflow ตรวจว่าผ่าน

## สิ่งที่ทีมต้องทำ (TODO)

- [ ] ตั้ง secret `SUPABASE_DB_URL` (connection string ของ production แบบ Session Pooler พอร์ต 5432 เท่านั้น: direct connection เป็น IPv6 อย่างเดียวและ GitHub runner ไม่มี IPv6, และห้ามใช้ transaction pooler 6543; รหัสผ่านต้อง percent-encode)
- [ ] ตั้ง secret `BACKUP_PASSPHRASE` สร้างด้วย `openssl rand -base64 32` (Windows PowerShell: `$b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)`) เก็บใน password manager ของทีมก่อนตั้งใน GitHub: ถ้าทำหาย backup ทั้งหมดกู้คืนไม่ได้
- [ ] Actions > Backup > Run workflow ครั้งแรก
- [ ] TC-OPS-03: ดาวน์โหลด artifact แล้ว `file fretpath-backup-*.gpg` ต้องบอกว่าเป็น PGP/GPG encrypted data และไม่มีไฟล์ `.sql` ใน artifact
- [ ] TC-OPS-04: log ขั้น "Restore check" แสดง `restore schema: 0 error(s)`, `restore data: 0 error(s)`, `public.lessons count after restore: N` (N >= 1), `auth.users` >= 1 และ `public.profiles` เท่ากับ `auth.users` (ถ้ามี error ที่ไม่เป็นอันตราย ดูหัวข้อ allow-list)
- [ ] ลองกู้คืนจริง 1 ครั้งตามคู่มือนี้ในเครื่อง และบันทึกผล
- [ ] ยืนยันเวอร์ชัน Postgres ของ production ตรงกับ `postgres:17` ใน workflow
