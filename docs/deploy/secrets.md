# ความลับ (Secrets) และการตั้งค่า GitHub Actions

> ห้ามใส่ค่าจริงของความลับลงในไฟล์นี้ (repo เป็น public)

## รายการ Secrets

### GitHub Actions secrets

| ชื่อ | ค่า | ใช้โดย |
| --- | --- | --- |
| `PROD_URL` | URL ของ production ไม่มี `/` ท้าย เช่น `https://<โดเมนของเรา>` | `keep-alive.yml`, `nightly.yml` (job production) |
| `PROD_SUPABASE_URL` | `https://<project-ref>.supabase.co` | `nightly.yml` (job `production`), TC-PRD-06 |
| `PROD_SUPABASE_ANON_KEY` | anon / public key ของโปรเจกต์ production | `nightly.yml` (job `production`), TC-PRD-06 |
| `SUPABASE_DB_URL` | connection string แบบ **Session Pooler พอร์ต 5432 เท่านั้น** (GitHub runner ไม่มี IPv6 จึงใช้ direct connection ไม่ได้ และห้ามใช้ transaction pooler 6543) รหัสผ่านต้อง percent-encode | `backup.yml` |
| `BACKUP_PASSPHRASE` | รหัสผ่านสุ่มยาวสำหรับเข้ารหัส backup เก็บสำเนาใน password manager นอก GitHub (หายแล้ว backup เก่าเปิดไม่ได้) | `backup.yml` |
| `SUPABASE_ACCESS_TOKEN` | token ของ Supabase CLI | **ยังไม่ต้องตั้ง** ไม่มี workflow ใน `.github/workflows` ใช้ (ตรวจแล้ว) ตั้งเฉพาะเมื่อมีการเรียก CLI (เช่น `supabase db push`) ใน Actions |

หมายเหตุ

- ตั้งที่ GitHub: Settings > Secrets and variables > Actions > New repository secret
- **ห้ามใส่ service role key ใน GitHub Secrets** ถ้าไม่จำเป็น
- ขั้นตอนตั้งค่า backup ดู [backup-restore.md](backup-restore.md); วิธีหา connection string ดู [supabase.md](supabase.md) ขั้นที่ 10; ค่า URL/anon key ดู [supabase.md](supabase.md) ขั้นที่ 11

### Vercel environment variables

ตั้งที่ Vercel: Project > Settings > Environment Variables (ขั้นตอนเต็มดู [vercel.md](vercel.md)) ตั้งทั้ง Production และ Preview

| ชื่อ | ค่า | ใช้โดย |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` | เว็บ (ตอน build และตอนรัน) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / public key | เว็บ |
| `NEXT_PUBLIC_SITE_URL` | `https://<domain>` มี `https://` ไม่มี `/` ท้าย | `lib/site-url.ts` |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | `false` (เปลี่ยนเป็น `true` ตาม [google.md](google.md)) | ปุ่ม Google และ CSP `form-action` |

ค่า `NEXT_PUBLIC_*` ถูกฝังในไฟล์ที่ส่งถึงเบราว์เซอร์ ห้ามใส่ความลับจริงในตัวแปรชื่อขึ้นต้นนี้

### ความลับที่เก็บนอก GitHub / Vercel

| ความลับ | เก็บที่ |
| --- | --- |
| Database Password | password manager ของทีม (ใช้ตอน `supabase link` และใน `SUPABASE_DB_URL`) |
| SMTP password / API key | กรอกใน Supabase (Authentication > SMTP) และ password manager ดู [supabase.md](supabase.md) ขั้นที่ 8 |
| Google Client Secret | กรอกใน Supabase (Providers > Google) และ password manager ดู [google.md](google.md) |

## เปิด workflow ที่ GitHub ปิดอัตโนมัติ

GitHub จะปิด scheduled workflow (เช่น `keep-alive.yml`) เมื่อ repo ไม่มีความเคลื่อนไหวเกิน 60 วัน
หากพบว่า workflow ถูกปิด ให้เปิดกลับด้วยวิธีใดวิธีหนึ่ง:

- เว็บ: แท็บ Actions → เลือก workflow → กด "Enable workflow"
- CLI: `gh workflow enable keep-alive.yml`

จากนั้นกด Run workflow หนึ่งครั้งเพื่อตรวจว่าผ่าน
