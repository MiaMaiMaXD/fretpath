# ความลับ (Secrets) และการตั้งค่า GitHub Actions

> เอกสารนี้จะถูกขยายเพิ่มในงานถัดไป ห้ามใส่ค่าจริงของความลับลงในไฟล์นี้ (repo เป็น public)

## รายการ Secrets

### GitHub Actions secrets

| ชื่อ | ค่า | ใช้โดย |
| --- | --- | --- |
| `PROD_URL` | URL ของ production ไม่มี `/` ท้าย เช่น `https://<โดเมนของเรา>` | `keep-alive.yml` |

## เปิด workflow ที่ GitHub ปิดอัตโนมัติ

GitHub จะปิด scheduled workflow (เช่น `keep-alive.yml`) เมื่อ repo ไม่มีความเคลื่อนไหวเกิน 60 วัน
หากพบว่า workflow ถูกปิด ให้เปิดกลับด้วยวิธีใดวิธีหนึ่ง:

- เว็บ: แท็บ Actions → เลือก workflow → กด "Enable workflow"
- CLI: `gh workflow enable keep-alive.yml`

จากนั้นกด Run workflow หนึ่งครั้งเพื่อตรวจว่าผ่าน
