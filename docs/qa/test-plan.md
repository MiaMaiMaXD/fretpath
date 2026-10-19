# FretPath — แผนการทดสอบ (Test Plan)

เวอร์ชัน 2.0 (อัปเดตหลังแผนที่ 2) · อ้างอิงสเปก `docs/superpowers/specs/2026-10-19-fretpath-design.md` (หัวข้อ 2, 6, 7)
ผู้รับผิดชอบ: QA · เอกสารที่เกี่ยวข้อง: `test-cases.md`, `rtm.md`, `.github/ISSUE_TEMPLATE/defect.yml`

## 1. วัตถุประสงค์
1. ยืนยันว่าระบบเรียนกีตาร์ FretPath ทำงานตามความต้องการ FR-01 … FR-07 และ NFR-01 … NFR-07 ในสเปก
2. ยืนยันว่าตรรกะด้านความปลอดภัย (คะแนน การปลดล็อก สิทธิ์) ถูกบังคับที่ฐานข้อมูล ไม่ใช่เพียงซ่อนปุ่มในหน้าเว็บ
3. พบข้อบกพร่องให้เร็วที่สุด (Shift-left: QA เขียน Test Case จากสเปกได้ก่อนที่ฟีเจอร์จะเสร็จ)
4. ให้หลักฐานที่ตรวจสอบย้อนกลับได้ (RTM, รายงานเทสต์, Defect Report) สำหรับการส่งโปรเจกต์

## 2. ขอบเขต
### 2.1 อยู่ในขอบเขต
- ความต้องการเชิงฟังก์ชัน FR-01 … FR-07 (ระบบสมาชิก, บทเรียน, เส้นทางการเรียน, แบบทดสอบ, บันทึกการฝึก, Dashboard, ระบบแอดมิน)
- ความต้องการที่ไม่ใช่ฟังก์ชัน NFR-01 … NFR-07 (ความปลอดภัย, มือถือ 375px, เบราว์เซอร์, ภาษาไทย, ความพร้อมใช้งาน, สำรองข้อมูล, ประสิทธิภาพ)
- ชั้นฐานข้อมูล: นโยบาย RLS, ฟังก์ชัน `submit_quiz`, ทริกเกอร์ `handle_new_user` / `unlock_after_publish`, กฎเนื้อหา (เผยแพร่/ลบบท)
- งานอัตโนมัติ: CI, nightly, keep-alive, backup (ตรวจว่าทำงานตามที่กำหนด)

### 2.2 นอกขอบเขต (สเปกข้อ 2.3 — รอบนี้)
- ระบบชำระเงิน
- อีเมลแจ้งเตือนผู้เรียน
- หน้าจัดการหลายคอร์ส
- แอปมือถือ (native)

นอกจากนี้ไม่ทดสอบตัวบริการของผู้ให้บริการภายนอกเอง (Supabase Auth, Vercel, YouTube) ทดสอบเฉพาะการเชื่อมต่อและการแสดงผลฝั่งเรา

## 3. แนวทางการทดสอบ (ระดับเทสต์ตามสเปกข้อ 6)
| ระดับ | เครื่องมือ | ผู้รับผิดชอบ | ครอบคลุม |
|---|---|---|---|
| ฐานข้อมูล | pgTAP (`supabase/tests/001–006`) | Developer | `submit_quiz` ทุกกรณีใน decision table, RLS, ทริกเกอร์, กฎเนื้อหา |
| Unit (ฝั่งเว็บ) | Vitest (`npm run test:unit`, ไฟล์ใน `tests/unit/`) | Developer | ตรรกะล้วน: validation (รหัสผ่าน 7/8, นาที, เป้าหมาย), `safeNextPath`, วันที่ Bangkok, สถิติ Dashboard/ขอบสัปดาห์, ตัวจับเวลา, สถานะเส้นทาง, ตัวแยก YouTube — รันใน CI ก่อน build |
| API / Security | Playwright request context (`e2e/api/`, ป้าย `@security`) | QA | RLS และ RPC ผ่าน Supabase REST ด้วยบทบาท anon / member / admin |
| UI E2E | Playwright (`e2e/specs/`, ป้าย `@smoke`, `@regression`, `@security`) บน Chromium, Firefox, Mobile (Pixel 7) | QA | เส้นทางหลัก 3 เส้นทางของสเปกข้อ 6.3 (เส้นทางที่ 1–2 ทำแล้วในแผนที่ 2: TC-PATH-17, TC-DSH-05; เส้นทางที่ 3 รอแผนที่ 3) และเทสต์ตาม FR |
| Manual / Exploratory | ตาม Test Case และ session-based | QA | UI ที่ยังไม่ automate (TC-DSH-06), Safari บน iPhone จริง (TC-MOB-03), เสียงจริงของ Web Audio |
| Non-functional | Lighthouse (NFR-07), ตรวจ bundle (NFR-01), ตรวจ workflow (NFR-05/06) | QA | ประสิทธิภาพ ความปลอดภัยของ secret ความพร้อมใช้งาน |

หลักการ: ทุก TC ระบุว่าเป็น Manual หรือ Automated และชี้ไฟล์เทสต์อัตโนมัติ (ถ้ามี) ใน `test-cases.md` โดยแยกสถานะ "ทำแล้ว" กับ "วางแผนไว้" อย่างตรงไปตรงมา

### ระดับความรุนแรง (Severity) และความเร่งด่วน (Priority)
| Severity | ความหมาย |
|---|---|
| Critical | ระบบใช้ไม่ได้ ข้อมูลรั่ว หรือกลไกความปลอดภัยถูกข้าม (เช่น อ่านเฉลยได้) |
| High | ฟังก์ชันหลักระดับ M ใช้ไม่ได้และไม่มีทางเลี่ยง |
| Medium | ฟังก์ชันทำงานผิดแต่มีทางเลี่ยง |
| Low | ปัญหาเล็กน้อย เช่น ข้อความ การจัดวาง |

Priority: P1 แก้ทันที · P2 แก้ในรอบนี้ · P3 แก้เมื่อมีเวลา

## 4. เทคนิคออกแบบเทสต์ (สเปกข้อ 6.2)
| เทคนิค | ตัวอย่างในระบบ | TC ตัวอย่าง |
|---|---|---|
| Boundary Value Analysis | คะแนน 59/60 ที่ `pass_score` 60; นาทีฝึก 0/1/600/601; รหัสผ่าน 7/8 ตัว; เป้าหมายต่อสัปดาห์ -1/0/5000/5001; บันทึกสั้น 500/501; ความกว้าง 375px | TC-QZ-02, TC-QZ-12, TC-QZ-13, TC-PRC-03, TC-PRC-06, TC-AUTH-02, TC-AUTH-10, TC-MOB-01 |
| Equivalence Partitioning | อีเมลถูก/ผิดรูปแบบ/ไม่มีในระบบ; วันที่ อดีต/วันนี้/อนาคต; `next` ภายใน/ภายนอกเว็บ | TC-AUTH-01, TC-AUTH-04, TC-AUTH-07, TC-PRC-04, TC-PRC-05 |
| State Transition | บทเรียน ล็อก → เรียนได้ → จบแล้ว; draft ↔ published; ยังไม่ยืนยันอีเมล → ยืนยัน | TC-PATH-10, TC-PATH-13, TC-PATH-14, TC-PATH-17, TC-AUTH-03 |
| Decision Table | ปลดล็อก: (ผ่าน/ไม่ผ่าน) × (มีบทถัดไป/บทสุดท้าย) × (สอบครั้งแรก/สอบซ้ำ) = 8 กรณี | TC-QZ-01, 02, 05–11 (ตารางใน `test-cases.md`) |
| Role-based / Security | anon / member / admin; ผู้เรียน A เข้าถึงข้อมูลผู้เรียน B | TC-SEC-01 … TC-SEC-17 |
| Non-functional (accessibility) | axe-core สแกนหน้าหลัก | TC-SEC-18 |

## 5. สภาพแวดล้อมการทดสอบ (สเปกข้อ 6.5)
| สภาพแวดล้อม | ใช้ทำอะไร | ฐานข้อมูล | ข้อจำกัด |
|---|---|---|---|
| Local | พัฒนาและรันเทสต์ในเครื่อง | Supabase CLI (Docker) + seed | — |
| CI | รันเทสต์อัตโนมัติทุก PR | Supabase CLI ใน GitHub Actions + seed | รัน pgTAP, lint, typecheck, Vitest, build และ Playwright เฉพาะ `chromium` กับป้าย `@smoke`/`@security` |
| Preview | ดูตัวอย่างแต่ละ PR | Vercel Preview + Supabase production | อ่านอย่างเดียว ห้ามรันเทสต์ที่เขียนข้อมูล |
| Production | เว็บจริง | Supabase Free project | ทดสอบเฉพาะ smoke แบบอ่านอย่างเดียว |

- Seed: คอร์ส "กีตาร์พื้นฐาน" + 5 บทพร้อมแบบทดสอบ, แอดมินทดสอบ 1, ผู้เรียนทดสอบ 1 (เฉพาะ Local/CI)
- ข้อมูลทดสอบสร้างผ่าน Supabase Admin API ต่อเทสต์และล้างหลังจบ `SUPABASE_SERVICE_ROLE_KEY` ใช้ได้เฉพาะใน `e2e/` และ GitHub Secrets
- เบราว์เซอร์เป้าหมาย (NFR-03): Chrome, Firefox, Safari มือถือ (Safari ทดสอบแบบ Manual บน iPhone จริง = TC-MOB-03 เพราะชุดโปรเจกต์ Playwright ตามสเปกไม่รวม WebKit)

### 5.1 เครื่องมือและสภาพแวดล้อมของ E2E แผนที่ 2
- **Vitest** (`npm run test:unit`): unit test ฝั่งเว็บ รันเร็ว ไม่ต้องใช้ฐานข้อมูล
- **Mailpit** (อีเมล local/CI ของ Supabase CLI): เปิดที่ `http://127.0.0.1:54324` ใช้ดึงลิงก์ยืนยันอีเมลและตั้งรหัสผ่านใหม่ (helper `e2e/utils/mailpit.ts`); ไม่มีอีเมลจริงถูกส่งออก — ต่างจากข้อ "อีเมลแจ้งเตือนผู้เรียน" ที่อยู่นอกขอบเขต
- **Playwright setup/teardown projects + storageState:** โปรเจกต์ `setup` (`e2e/auth.setup.ts`) สร้างผู้เรียนกลางและบันทึก session ที่ `e2e/.auth/member.json` (อ่านผ่านค่าคงที่ `MEMBER_STATE`); โปรเจกต์ `teardown` ลบผู้ใช้นั้นหลังจบ. ใช้เฉพาะเทสต์ที่ **อ่านอย่างเดียว** (เช่น `/path`, `/lessons/*`); เทสต์ที่เขียนข้อมูลใช้ fixture `member`/`memberPage` ที่สร้างผู้ใช้ใหม่ต่อเทสต์และล้างหลังจบ (ข้อมูลไม่ปนกัน)
- **จำนวน worker = 4** (`workers: 4` ใน `playwright.config.ts`): Firefox headless บน Windows ค้าง (หน่วง 30 วินาทีขึ้นไปแบบสุ่ม) เมื่อใช้ค่าเริ่มต้น (cores/2); ลดเป็น 4 แล้วผ่านครบ 3 โปรเจกต์ซ้ำหลายรอบ — บันทึกไว้เป็นข้อจำกัดของเครื่องทดสอบ ไม่ใช่ข้อบกพร่องของแอป
- **Workaround ที่ทราบ:** TC-AUTH-10 ใช้ `toPass` (retry) ครอบ fill+save เพราะ race ของการ re-key ฟอร์ม; ตามรอยไว้เพื่อแก้ที่ต้นเหตุในรอบ fix สุดท้ายของแผนที่ 2 (สอดคล้องกับ R4)
- **ข้อจำกัดของตัวเทสต์:** `TC-LSN-04` ตรวจว่าปุ่มดีดสายทำงานโดยไม่ error แต่ไม่ได้ตรวจเสียงจริง

## 6. เกณฑ์เริ่มและเกณฑ์จบการทดสอบ (สเปกข้อ 6.1)
### 6.1 เกณฑ์เริ่ม (Entry criteria)
- สเปกผ่านการตรวจทานของทีม และ requirement ทุกข้อมีรหัส
- ฟีเจอร์ที่จะทดสอบถูก merge เข้า branch ที่ทดสอบได้ (Local/CI) และ build ผ่าน
- สภาพแวดล้อมพร้อม: migration ครบ, seed ใช้งานได้, `supabase test db` ผ่านก่อนเริ่มเทสต์ระดับ UI
- Test Case ของฟีเจอร์นั้นเขียนและผ่านการตรวจทานแล้ว

### 6.2 เกณฑ์จบ (Exit criteria)
- ทุก requirement ระดับ M มี TC อย่างน้อย 1 ข้อใน RTM
- TC ระดับ M ผ่าน 100%
- ไม่มี defect severity Critical/High ที่ยังเปิดอยู่
- มี Test Summary Report (`docs/qa/test-summary.md`) สรุปจำนวน TC อัตราผ่าน defect ตาม severity และความครอบคลุม

### 6.3 เกณฑ์ระงับ/ทดสอบต่อ
ระงับเมื่อ build ล้มเหลว หรือ `supabase test db` ล้มเหลว ทดสอบต่อเมื่อ CI กลับเป็นสีเขียว

## 7. ความเสี่ยงและการรับมือ
| # | ความเสี่ยง | ผลกระทบ | โอกาส | การรับมือ |
|---|---|---|---|---|
| R1 | Supabase Free ถูกหยุดโปรเจกต์เมื่อไม่มีการใช้งาน | เว็บ/Preview/Production ใช้ไม่ได้ (NFR-05) | กลาง | `keep-alive.yml` ทุก 2 วัน, ตรวจว่า workflow รันสำเร็จ, สำรองข้อมูลรายสัปดาห์ (`backup.yml`) และเตรียมขั้นตอนกู้โปรเจกต์ |
| R2 | ข้อจำกัดแผน Vercel Hobby (ห้ามใช้เชิงพาณิชย์, โควตา build/bandwidth) | Deploy ไม่ได้หรือผิดเงื่อนไข | ต่ำ–กลาง | ไม่รับเงินหรือบริจาคในรอบนี้, รันเทสต์หนักใน GitHub Actions ไม่ใช่บน Vercel, ไม่เปิด Preview เกินจำเป็น |
| R3 | Developer คนเดียวเป็นคอขวด (ทีมมี Dev 1 + QA 1) | Defect รอแก้นาน เทสต์ล่าช้า | สูง | Shift-left (เขียน TC ล่วงหน้า), จัดลำดับ defect ด้วย severity/priority, QA ระบุสาเหตุเบื้องต้นใน defect, pgTAP ลดการวนกลับของ bug ด้านตรรกะ |
| R4 | เทสต์ E2E ไม่เสถียร (flaky) จากเครือข่าย เวลา หรือข้อมูลร่วมกัน | CI ไม่น่าเชื่อถือ เสียเวลาไล่ | กลาง | ข้อมูลแยกต่อเทสต์และล้างหลังจบ, ใช้ `getByRole`/`data-testid`, web-first assertion แทน sleep, เก็บ trace/video เมื่อล้มเหลว, retry ใน CI ไม่เกิน 1 ครั้งและบันทึกเทสต์ที่ต้อง retry เพื่อแก้ที่ต้นเหตุ |
| R5 | เทสต์เขียนข้อมูลลง production ผ่าน Preview | ข้อมูลจริงปนเปื้อน | ต่ำ | Preview ใช้แบบอ่านอย่างเดียว, เทสต์ที่เขียนข้อมูลรันเฉพาะ Local/CI |
| R6 | กำหนดส่งยังไม่ยืนยัน (สเปกข้อ 1.4) | ลำดับงานทดสอบอาจต้องปรับ | กลาง | จัดลำดับตามความสำคัญ (ความปลอดภัยและเส้นทางหลักก่อน), ทบทวนแผนเมื่อทราบกำหนดส่ง |
| R7 | เขตเวลา (บันทึกการฝึกใกล้เที่ยงคืน Asia/Bangkok) | วันที่บันทึกผิด | กลาง | pgTAP `test_practice_date_uses_bangkok_today`, TC-PRC-04 (เบราว์เซอร์เขตเวลา `America/Los_Angeles`) และ `tests/unit/bangkok.test.ts` |
| R8 | CI รัน Playwright เฉพาะ `chromium` + `@smoke`/`@security` | ข้อบกพร่องเฉพาะ Firefox/มือถือ (เช่น Firefox ค้างตาม 5.1) หลุดไปถึง merge | กลาง | รันชุดเต็มทั้ง 3 โปรเจกต์ก่อนปิดแผน (ทำแล้วในเครื่อง 60/60 ต่อโปรเจกต์) และเพิ่ม nightly ในแผนที่ 3 |

## 8. ตารางเวลา
ลำดับตามแผนพัฒนา (Developer ทำ FR-01 → FR-07 และ QA ทดสอบแต่ละ FR เมื่อเสร็จ) วันที่จริงรอทีมแจ้งกำหนดส่ง

| ช่วง | กิจกรรม QA | เริ่ม | เสร็จ |
|---|---|---|---|
| แผนที่ 1 — ฐานข้อมูลและโครงเทสต์ | Test Plan, defect template, TC ของ FR-03/FR-04/NFR-01, pgTAP, Playwright framework, API/security tests | รอกำหนดส่ง | รอกำหนดส่ง |
| แผนที่ 2 — หน้าเว็บผู้เรียน | TC FR-01, FR-02, FR-05, FR-06 และส่วน UI ของ FR-03/FR-04, NFR-02 (เขียนแล้ว 101 TC รวมแผนที่ 1); E2E `@smoke`/`@regression` (ทำแล้ว) | รอกำหนดส่ง | รอกำหนดส่ง |
| แผนที่ 3 — หลังบ้านแอดมิน | TC FR-07, FR-01.7, FR-01.8, FR-05.5, NFR-05/06/07 (Lighthouse); regression ทุก project; เส้นทางหลักที่ 3 | รอกำหนดส่ง | รอกำหนดส่ง |
| ปิดโครงการ | Regression เต็ม, Test Summary Report, ตรวจ exit criteria | รอกำหนดส่ง | รอกำหนดส่ง |

## 9. ผลงานที่ส่งมอบ
| ผลงาน | ที่เก็บ | สถานะ |
|---|---|---|
| Test Plan | `docs/qa/test-plan.md` | เอกสารนี้ |
| Test Cases | `docs/qa/test-cases.md` | 101 TC: FR-01 … FR-06, NFR-01 … NFR-04 ครบ; FR-07 (UI), FR-01.7/01.8/05.5, NFR-05 … NFR-07 ต่อในแผนที่ 3 |
| RTM | `docs/qa/rtm.md` | ครบทุกแถว; 37/48 ข้อมี TC, ที่เหลือ 11 ข้อรอแผนที่ 3 |
| เทมเพลต Defect Report | `.github/ISSUE_TEMPLATE/defect.yml` | พร้อมใช้ |
| ชุดเทสต์อัตโนมัติ | `supabase/tests/`, `tests/unit/`, `e2e/` | pgTAP 001–006, Vitest, Playwright `e2e/api` และ `e2e/specs` (แผนที่ 2) มีแล้ว |
| รายงานการรันเทสต์ | HTML report ของ Playwright (CI artifact) | ตามการรันจริง |
| Test Summary Report | `docs/qa/test-summary.md` | ปิดโครงการ |
