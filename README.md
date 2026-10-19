# FretPath

ระบบเรียนกีตาร์พื้นฐานออนไลน์แบบก้าวต่อก้าว (โปรเจกต์จบปี 4)

- สเปก: `docs/superpowers/specs/2026-10-19-fretpath-design.md`
- แผนที่ 1 (ฐานราก): `docs/superpowers/plans/2026-10-19-fretpath-plan-1-foundation.md`

## เริ่มบนเครื่องของคุณ

**ต้องมี:** Node.js 22, Docker Desktop (เปิดไว้), Git, Claude Code พร้อมปลั๊กอิน Superpowers

1. แตกไฟล์ zip แล้วเปิดเทอร์มินัลในโฟลเดอร์ `fretpath`
2. ตรวจเครื่องมือ: `node -v` (ต้องเป็น v22), `docker info` (ต้องไม่ error), `git log --oneline` (ต้องเห็น commit ของสเปกและแผน)
3. สร้าง repo บน GitHub (เช่น `fretpath`) แล้วเชื่อม:
   `git remote add origin https://github.com/<user>/fretpath.git && git push -u origin main`
4. แตก branch ทำงานก่อนเริ่ม: `git checkout -b plan-1-foundation`
5. เปิด Claude Code ในโฟลเดอร์นี้ แล้วพิมพ์:
   > ใช้ superpowers:subagent-driven-development ทำแผน `docs/superpowers/plans/2026-10-19-fretpath-plan-1-foundation.md`
6. เมื่อจบแผน เปิด Pull Request จาก `plan-1-foundation` ไป `main`

**การแบ่งงาน:** Task 1–7 ของ Developer, Task 8–11 ของ QA; Task 11 (Test Plan / Test Cases / RTM) เริ่มได้ทันทีโดยไม่ต้องรอโค้ด
