// สถิติ Test Case และความครอบคลุม RTM: อ่าน docs/qa/test-cases.md และ docs/qa/rtm.md
// ใช้: npm run qa:stats  (Node ล้วน ไม่มี dependency)
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TC_ID = /TC-[A-Z]+-\d+[a-z]?/g;
const AREA_ORDER = ['AUTH', 'LSN', 'PATH', 'QZ', 'PRC', 'DSH', 'ADM', 'SEC', 'MOB', 'PERF', 'PRD', 'OPS'];

/** แยกแถวตารางเป็นเซลล์ (ตัด | ที่ขอบออก) */
function cells(line) {
  return line.split('|').slice(1, -1).map((c) => c.trim());
}

/**
 * แถว TC จริงขึ้นต้นด้วย `| TC-<พื้นที่>-<เลข> |` และมี 11 คอลัมน์:
 * รหัส | ชื่อ | อ้างอิง | เงื่อนไขก่อนเริ่ม | ขั้นตอน | ผลที่คาดหวัง | ความสำคัญ | ประเภท | เทคนิค | M/A | ไฟล์เทสต์อัตโนมัติ
 * (แถวสรุป `| TC-AUTH (FR-01) | …` ไม่ตรงรูปแบบรหัส จึงถูกข้าม; ตาราง TC-PERF มี 10 คอลัมน์ข้อมูล จึงรับตั้งแต่ 10 ขึ้นไป)
 * @param {string} markdown
 * @returns {{id: string, area: string, priority: string, mode: 'Automated'|'Manual', partial: boolean}[]}
 */
export function parseTestCases(markdown) {
  const out = [];
  for (const line of markdown.split(/\r?\n/)) {
    if (!/^\| TC-[A-Z]+-\d+[a-z]? \|/.test(line)) continue;
    const c = cells(line);
    if (c.length < 10) continue;
    const ma = c[9];
    const mode = ma.startsWith('Manual') ? 'Manual' : 'Automated';
    out.push({
      id: c[0],
      area: c[0].split('-')[1],
      priority: c[6],
      mode,
      partial: mode === 'Automated' && ma.includes('Manual'),
    });
  }
  return out;
}

/**
 * แถว RTM: `| FR-01.1 | M | TC-AUTH-01, TC-AUTH-02 | สถานะ |` (— = ยังไม่มี TC)
 * นับเฉพาะรหัส TC ในคอลัมน์ที่ 3 ไม่นับรหัสที่พูดถึงในคอลัมน์สถานะ
 * @param {string} markdown
 * @returns {{id: string, level: 'M'|'S'|'C', tcs: string[]}[]}
 */
export function parseRtm(markdown) {
  const out = [];
  for (const line of markdown.split(/\r?\n/)) {
    if (!/^\| (FR|NFR)-[\d.]+ \| [MSC] \|/.test(line)) continue;
    const c = cells(line);
    out.push({ id: c[0], level: /** @type {'M'|'S'|'C'} */ (c[1]), tcs: [...new Set(c[2].match(TC_ID) ?? [])] });
  }
  return out;
}

/**
 * @param {ReturnType<typeof parseTestCases>} tcs
 * @param {ReturnType<typeof parseRtm>} reqs
 */
export function computeStats(tcs, reqs) {
  const byArea = {};
  const byMode = { Automated: 0, Manual: 0, partial: 0 };
  const byPriority = { High: 0, Medium: 0, Low: 0 };
  for (const t of tcs) {
    byArea[t.area] = (byArea[t.area] ?? 0) + 1;
    byMode[t.mode] += 1;
    if (t.partial) byMode.partial += 1;
    if (t.priority in byPriority) byPriority[t.priority] += 1;
  }

  const known = new Set(tcs.map((t) => t.id));
  const referenced = new Set(reqs.flatMap((r) => r.tcs));
  const byLevel = { M: { total: 0, withTc: 0 }, S: { total: 0, withTc: 0 }, C: { total: 0, withTc: 0 } };
  const mWithoutTc = [];
  for (const r of reqs) {
    byLevel[r.level].total += 1;
    if (r.tcs.length > 0) byLevel[r.level].withTc += 1;
    else if (r.level === 'M') mWithoutTc.push(r.id);
  }

  return {
    total: tcs.length,
    byArea,
    byMode,
    byPriority,
    requirements: {
      total: reqs.length,
      withTc: reqs.filter((r) => r.tcs.length > 0).length,
      byLevel,
      mWithoutTc,
    },
    unknownRefs: [...referenced].filter((id) => !known.has(id)),
    notInRtm: tcs.map((t) => t.id).filter((id) => !referenced.has(id)),
  };
}

/** @param {ReturnType<typeof computeStats>} s */
export function formatReport(s) {
  const areas = [...AREA_ORDER, ...Object.keys(s.byArea).filter((a) => !AREA_ORDER.includes(a))].filter((a) => s.byArea[a]);
  const L = s.requirements.byLevel;
  const m = s.requirements.mWithoutTc;
  const lines = [
    `TC ทั้งหมด: ${s.total}`,
    '',
    'จำนวน TC ต่อพื้นที่:',
    ...areas.map((a) => `  TC-${a}: ${s.byArea[a]}`),
    '',
    `Automated: ${s.byMode.Automated} (ในนี้ automate เฉพาะบางส่วน ส่วนที่เหลือเป็น Manual: ${s.byMode.partial})`,
    `Manual: ${s.byMode.Manual}`,
    '',
    `ความสำคัญ: High ${s.byPriority.High} · Medium ${s.byPriority.Medium} · Low ${s.byPriority.Low}`,
    '',
    `requirement ทั้งหมด: ${s.requirements.total} ข้อ; มี TC แล้ว ${s.requirements.withTc} ข้อ`,
    `  M: ${L.M.withTc}/${L.M.total} มี TC`,
    `  S: ${L.S.withTc}/${L.S.total} มี TC`,
    `  C: ${L.C.withTc}/${L.C.total} มี TC`,
    `requirement ระดับ M ที่ยังไม่มี TC: ${m.length}${m.length ? ` (${m.join(', ')})` : ''}`,
  ];
  if (s.unknownRefs.length) lines.push('', `คำเตือน: RTM อ้าง TC ที่ไม่มีใน test-cases.md: ${s.unknownRefs.join(', ')}`);
  if (s.notInRtm.length) lines.push('', `คำเตือน: TC ที่ไม่ปรากฏใน RTM: ${s.notInRtm.join(', ')}`);
  return lines.join('\n');
}

function main() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const tcs = parseTestCases(readFileSync(`${root}docs/qa/test-cases.md`, 'utf8'));
  const reqs = parseRtm(readFileSync(`${root}docs/qa/rtm.md`, 'utf8'));
  console.log(formatReport(computeStats(tcs, reqs)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
