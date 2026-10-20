# FretPath — Requirements Traceability Matrix (RTM)

เวอร์ชัน 4.0 · จับคู่ requirement ทุกข้อในสเปกข้อ 2.1–2.2 กับ Test Case ใน `test-cases.md` (ปิด RTM หลังแผนที่ 4 — production) · ตัวเลขใน "สรุปความครอบคลุม" ตรงกับผล `npm run qa:stats` ณ วันที่ปิด

**ระดับ:** M = Must, S = Should, C = Could (MoSCoW ตามสเปกข้อ 2)

**สถานะ:**
- `ทำแล้ว (อัตโนมัติ)` = ทุก TC ที่ผูกอยู่มีเทสต์อัตโนมัติ (pgTAP และ/หรือ Playwright ที่ตั้งชื่อตามรหัส TC)
- `มี TC (บางส่วนยังไม่ automate)` = เขียน TC แล้ว แต่บางส่วนยังเป็น Manual (ระบุไว้ในคอลัมน์สถานะ)
- ข้อความท้ายสถานะที่ระบุ "ยืนยันบน production" ด้วย TC แบบ Manual เป็นการตรวจซ้ำในสภาพแวดล้อมจริง ไม่ลดสถานะของ requirement ที่มีเทสต์อัตโนมัติครบแล้ว
- ผลการรันจริงของทุก TC (รวม TC ที่ต้องมี production) ไม่อยู่ในตารางนี้ แต่อยู่ใน `test-summary.md`

| Requirement | ระดับ | TC | สถานะ |
|---|---|---|---|
| FR-01.1 | M | TC-AUTH-01, TC-AUTH-02, TC-PATH-17 | ทำแล้ว (อัตโนมัติ) |
| FR-01.2 | M | TC-AUTH-01, TC-AUTH-03, TC-PATH-17, TC-AUTH-11, TC-AUTH-14, TC-AUTH-17, TC-PRD-05 | ทำแล้ว (อัตโนมัติ); ยืนยันบน production ด้วย TC-PRD-05 (Manual) |
| FR-01.3 | M | TC-AUTH-04, TC-AUTH-05, TC-AUTH-07, TC-AUTH-08, TC-PRD-03, TC-PRD-04 | ทำแล้ว (อัตโนมัติ) |
| FR-01.4 | M | TC-AUTH-06, TC-AUTH-13, TC-PRD-05 | ทำแล้ว (อัตโนมัติ); ยืนยันบน production ด้วย TC-PRD-05 (Manual) |
| FR-01.5 | M | TC-AUTH-09, TC-AUTH-10 | ทำแล้ว (อัตโนมัติ) |
| FR-01.6 | M | TC-AUTH-01, TC-PATH-03, TC-PATH-14, TC-PATH-17, TC-PATH-19 | ทำแล้ว (อัตโนมัติ) ทั้งทริกเกอร์ DB และขั้นตอนสมัครผ่านหน้าเว็บ |
| FR-01.7 | S | TC-AUTH-15, TC-AUTH-18 | มี TC (บางส่วนยังไม่ automate): TC-AUTH-15 ตรวจกรณีปิดปุ่ม (อัตโนมัติ); TC-AUTH-18 ล็อกอินด้วย Google จริงบน production เป็น Manual (OAuth ต้องใช้บัญชีและหน้า consent จริง) |
| FR-01.8 | C | TC-AUTH-12, TC-AUTH-16, TC-SEC-23 | ทำแล้ว (อัตโนมัติ) |
| FR-02.1 | M | TC-LSN-01, TC-LSN-03 | ทำแล้ว (อัตโนมัติ) |
| FR-02.2 | M | TC-LSN-02 | มี TC (บางส่วนยังไม่ automate): E2E ตรวจเฉพาะบทที่ไม่มีวิดีโอ; การแยก YouTube ID ตรวจที่ระดับ unit (`tests/unit/youtube.test.ts`) ยังไม่มี E2E กรณีมีวิดีโอ |
| FR-02.3 | M | TC-LSN-04, TC-LSN-05, TC-MOB-03 | มี TC (บางส่วนยังไม่ automate): E2E ยืนยันว่าปุ่มทำงานโดยไม่ error แต่ไม่ได้ตรวจว่ามีเสียงจริง → ฟังด้วยมือบน iPhone (TC-MOB-03) |
| FR-02.4 | S | TC-LSN-06 | ทำแล้ว (อัตโนมัติ) |
| FR-03.1 | M | TC-SEC-06, TC-PATH-01, TC-PATH-02, TC-PATH-13, TC-PATH-14, TC-PATH-15, TC-PATH-17, TC-PRD-06 | ทำแล้ว (อัตโนมัติ); TC-PATH-02 ส่วน UI (บท draft ไม่แสดง) ตรวจเฉพาะที่ระดับ DB เพราะ seed E2E ไม่มีบท draft |
| FR-03.2 | M | TC-PATH-03, TC-PATH-04, TC-PATH-14, TC-PATH-17, TC-PATH-19 | ทำแล้ว (อัตโนมัติ) |
| FR-03.3 | M | TC-SEC-02, TC-PATH-05, TC-PATH-06, TC-PATH-07, TC-PATH-12, TC-PATH-17, TC-QZ-01, TC-QZ-02, TC-QZ-05, TC-QZ-12, TC-QZ-13, TC-QZ-25 | มี TC (บางส่วนยังไม่ automate): TC-QZ-13 (59% ที่ 17 ข้อ) เป็น Manual; ขอบ pass_score ครอบคลุมโดย TC-QZ-02 และ TC-QZ-12 |
| FR-03.4 | M | TC-SEC-06, TC-SEC-07, TC-PATH-08, TC-PATH-09, TC-PATH-15, TC-PATH-16, TC-PATH-18, TC-QZ-28 | ทำแล้ว (อัตโนมัติ) (TC-PATH-16 ทดแทน TC-PATH-08) |
| FR-03.5 | M | TC-PATH-04, TC-PATH-10, TC-PATH-11, TC-PATH-12 | ทำแล้ว (อัตโนมัติ) |
| FR-04.1 | M | TC-QZ-18 | มี TC (บางส่วนยังไม่ automate): API อัตโนมัติ, UI สลับตัวเลือกเป็น Manual |
| FR-04.2 | M | TC-QZ-04, TC-QZ-17, TC-QZ-19 | ทำแล้ว (อัตโนมัติ) |
| FR-04.3 | M | TC-SEC-01, TC-SEC-02, TC-SEC-07, TC-SEC-08, TC-SEC-12, TC-QZ-01, TC-QZ-03, TC-QZ-04, TC-QZ-14, TC-QZ-15, TC-QZ-20, TC-QZ-24 | มี TC (บางส่วนยังไม่ automate): TC-QZ-15 และส่วน UI ของ TC-QZ-20 เป็น Manual |
| FR-04.4 | M | TC-QZ-02, TC-QZ-03, TC-QZ-05, TC-QZ-07, TC-QZ-10, TC-QZ-21, TC-QZ-25, TC-QZ-27, TC-PATH-17 | ทำแล้ว (อัตโนมัติ) |
| FR-04.5 | M | TC-SEC-15, TC-PATH-13, TC-QZ-06, TC-QZ-08, TC-QZ-09, TC-QZ-11, TC-QZ-16, TC-QZ-26 | มี TC (บางส่วนยังไม่ automate): TC-SEC-15, TC-QZ-08, TC-QZ-11 เป็น Manual |
| FR-04.6 | M | TC-QZ-06, TC-QZ-22, TC-QZ-23 | ทำแล้ว (อัตโนมัติ) |
| FR-05.1 | M | TC-PRC-02, TC-PRC-03, TC-PRC-06, TC-DSH-05 | มี TC (บางส่วนยังไม่ automate): ช่อง "บทเรียนที่เกี่ยวข้อง" (ไม่บังคับ) ยังไม่มี E2E |
| FR-05.2 | M | TC-PRC-01, TC-PRC-04, TC-PRC-05 | ทำแล้ว (อัตโนมัติ) ทั้ง DB และ UI |
| FR-05.3 | M | TC-PRC-07 | มี TC (บางส่วนยังไม่ automate): E2E ครอบคลุมเริ่ม/หยุด/ใช้เวลานี้; ปุ่มรีเซ็ตและแท็บค้างนานตรวจด้วยมือ (ตรรกะเวลาตรวจที่ระดับ unit `timer.test.ts`) |
| FR-05.4 | M | TC-SEC-04, TC-SEC-10, TC-PRC-02, TC-PRC-08 | ทำแล้ว (อัตโนมัติ) |
| FR-05.5 | C | TC-PRC-09 | ทำแล้ว (อัตโนมัติ): E2E ตรวจปรับ BPM และเริ่ม/หยุดโดยไม่มี error ไม่ตรวจเสียงจริง |
| FR-06.1 | M | TC-DSH-01, TC-DSH-02, TC-DSH-03, TC-DSH-05 | ทำแล้ว (อัตโนมัติ) |
| FR-06.2 | M | TC-DSH-02, TC-DSH-05 | ทำแล้ว (อัตโนมัติ) |
| FR-06.3 | M | TC-DSH-06 | มี TC (Manual — ยังไม่ automate): ไม่มี E2E ตรวจกราฟคะแนนสูงสุดรายบท |
| FR-06.4 | M | TC-DSH-01, TC-DSH-03, TC-DSH-04 | ทำแล้ว (อัตโนมัติ) |
| FR-07.1 | M | TC-SEC-03, TC-SEC-09, TC-SEC-13, TC-SEC-17, TC-SEC-19, TC-SEC-20, TC-SEC-21, TC-ADM-03, TC-ADM-17, TC-PRD-03 | ทำแล้ว (อัตโนมัติ) ทั้งหน้าเว็บและฐานข้อมูล |
| FR-07.2 | M | TC-ADM-04, TC-ADM-05, TC-ADM-06, TC-ADM-07, TC-ADM-08, TC-ADM-15, TC-ADM-18, TC-SEC-22 | ทำแล้ว (อัตโนมัติ) |
| FR-07.3 | M | TC-ADM-09, TC-ADM-10, TC-ADM-11, TC-ADM-18, TC-ADM-19, TC-ADM-20, TC-SEC-20 | ทำแล้ว (อัตโนมัติ) |
| FR-07.4 | M | TC-SEC-11, TC-PATH-02, TC-PATH-07, TC-ADM-04, TC-ADM-18 | ทำแล้ว (อัตโนมัติ) |
| FR-07.5 | M | TC-ADM-01, TC-ADM-05, TC-ADM-09, TC-ADM-11, TC-ADM-18 | ทำแล้ว (อัตโนมัติ) |
| FR-07.6 | M | TC-ADM-02, TC-ADM-06, TC-ADM-07 | ทำแล้ว (อัตโนมัติ) |
| FR-07.7 | M | TC-ADM-12, TC-ADM-13 | ทำแล้ว (อัตโนมัติ) |
| FR-07.8 | S | TC-ADM-14 | ทำแล้ว (อัตโนมัติ) |
| FR-07.9 | S | TC-ADM-16, TC-ADM-17 | ทำแล้ว (อัตโนมัติ) |
| NFR-01 | M | TC-SEC-01, TC-SEC-02, TC-SEC-03, TC-SEC-04, TC-SEC-05, TC-SEC-06, TC-SEC-07, TC-SEC-08, TC-SEC-09, TC-SEC-10, TC-SEC-11, TC-SEC-12, TC-SEC-13, TC-SEC-14, TC-SEC-15, TC-SEC-16, TC-SEC-17, TC-PATH-09, TC-QZ-04, TC-AUTH-04, TC-AUTH-06, TC-AUTH-07, TC-PRC-05, TC-SEC-19, TC-SEC-20, TC-SEC-21, TC-SEC-22, TC-SEC-23, TC-SEC-24, TC-SEC-25, TC-AUTH-14, TC-AUTH-17, TC-PRD-02, TC-PRD-04, TC-OPS-03 | มี TC (บางส่วนยังไม่ automate): TC-SEC-15, TC-SEC-16 เป็น Manual; TC-SEC-17 automate แล้วโดย TC-SEC-19/21; ส่วน CSP/security headers ตรวจด้วย TC-SEC-24 และ guard ของ TC-SEC-25; บน production ตรวจ header ด้วย TC-PRD-02, ไม่มีบัญชี seed ด้วย TC-PRD-04, backup ไม่รั่วด้วย TC-OPS-03 |
| NFR-02 | M | TC-MOB-01, TC-MOB-01b, TC-MOB-02, TC-PATH-18, TC-SEC-18, TC-MOB-01c, TC-SEC-18b | ทำแล้ว (อัตโนมัติ) ที่ 375px (Pixel 7 = 412px ครอบคลุมโดยโปรเจกต์ `mobile`; ที่ 375px ใช้ `viewport` ใน spec) |
| NFR-03 | M | TC-MOB-03 (Manual) และ spec ทั้งหมดที่รันในโปรเจกต์ `chromium`, `firefox`, `mobile` | มี TC (บางส่วนยังไม่ automate): Safari บน iPhone จริงไม่มีโปรเจกต์อัตโนมัติ (สเปก 6.3 ไม่รวม WebKit) → TC-MOB-03 เป็น Manual; CI รัน `chromium` เท่านั้น (Firefox/Pixel 7 รันในเครื่อง ผ่านครบ) |
| NFR-04 | M | TC-AUTH-02, TC-AUTH-04, TC-AUTH-06, TC-LSN-03, TC-PATH-16, TC-PRC-03, TC-PRC-05, TC-QZ-19, TC-QZ-23 | มี TC (บางส่วนยังไม่ automate): ตรวจข้อความ Thai/error ที่ระบุในเทสต์แล้ว แต่ยังไม่มี TC ตรวจ copy ทั้งระบบ → ตรวจด้วยมือก่อนปิดโครงการ |
| NFR-05 | M | TC-OPS-01, TC-OPS-02, TC-PRD-01, TC-PRD-06 | มี TC (บางส่วนยังไม่ automate): TC-OPS-01 และ TC-PRD-01/06 อัตโนมัติ (keep-alive.yml, nightly job `production`); TC-OPS-02 (อีเมลแจ้งเมื่อล้ม) เป็น Manual เพราะอีเมลเป็นของ GitHub |
| NFR-06 | M | TC-OPS-03, TC-OPS-04 | มี TC (บางส่วนยังไม่ automate): TC-OPS-03 เข้ารหัสและ TC-OPS-04 restore check อัตโนมัติใน backup.yml; การกู้คืนจริงในเครื่องตาม `docs/deploy/backup-restore.md` เป็น Manual |
| NFR-07 | M | TC-PERF-01 | ทำแล้ว (อัตโนมัติ) ใน nightly job `production` (`lighthouserc.json`); บน production (2026-10-20) LCP/TTI 2298 ms ผ่านเกณฑ์ — ดู `test-summary.md` หัวข้อ 6 (ในเครื่อง TTI 3166 ms) |

## สรุปความครอบคลุม

ตัวเลขข้างล่างตรงกับผล `npm run qa:stats` (สคริปต์ `scripts/tc-stats.mjs` อ่านตารางในไฟล์นี้และ `test-cases.md`) เมื่อปิด RTM

- requirement ทั้งหมด 48 ข้อ (FR 41 ข้อ + NFR 7 ข้อ) — มี TC ครบทั้ง 48 ข้อ (M 42/42 · S 4/4 · C 2/2)
- ระดับ M ทั้งหมด 42 ข้อ มี TC แล้ว 42 ข้อ; requirement ระดับ M ที่ยังไม่มี TC = **0** (เกณฑ์จบข้อ 1 ของสเปก 6.1 ผ่าน)
- TC ทั้งหมด 148 ข้อ (Automated 137, Manual 11) ทุก TC ที่อ้างในตารางนี้มีแถวใน `test-cases.md` และทุก TC ใน `test-cases.md` ปรากฏในตารางนี้อย่างน้อย 1 แถว (สคริปต์รายงานคำเตือนถ้าไม่ตรง — ตอนปิด RTM ไม่มีคำเตือน)
- สถานะ (รวม 48 ข้อ): ทำแล้ว (อัตโนมัติ) 33 ข้อ (FR-01.1–01.6, FR-01.8, FR-02.1, FR-02.4, FR-03.1, FR-03.2, FR-03.4, FR-03.5, FR-04.2, FR-04.4, FR-04.6, FR-05.2, FR-05.4, FR-05.5, FR-06.1, FR-06.2, FR-06.4, FR-07.1–07.9, NFR-02, NFR-07) · มี TC แต่บางส่วนยังไม่ automate 15 ข้อ (FR-01.7, FR-02.2, FR-02.3, FR-03.3, FR-04.1, FR-04.3, FR-04.5, FR-05.1, FR-05.3, FR-06.3, NFR-01, NFR-03, NFR-04, NFR-05, NFR-06)
- ความครอบคลุมไม่เท่ากับผ่าน: ผลรันจริง (รวมผลของ TC Manual และ TC ที่ต้องมี production) อยู่ใน `test-summary.md`
- ช่องว่างที่ยอมรับ (ไม่มี E2E): กราฟคะแนนสูงสุดรายบท (FR-06.3), ช่องบทเรียนที่เกี่ยวข้องและปุ่มรีเซ็ตตัวจับเวลา (FR-05.1/05.3), วิดีโอ YouTube ที่ฝังจริง (FR-02.2), เสียงจริงของปุ่มดีดสายและเมโทรนอม (FR-02.3, FR-05.5), Safari บน iPhone (NFR-03), Google OAuth จริง (FR-01.7 — Manual TC-AUTH-18), อีเมลแจ้งเตือนของ GitHub (NFR-05 — Manual TC-OPS-02)
