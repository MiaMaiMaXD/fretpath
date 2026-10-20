import { describe, expect, it } from 'vitest';
import { computeStats, formatReport, parseRtm, parseTestCases } from '../../scripts/tc-stats.mjs';

// Fixture mirrors the real docs/qa/test-cases.md and rtm.md row format.
const TEST_CASES = `# FretPath — Test Cases

| รหัส | ชื่อ | อ้างอิง | เงื่อนไขก่อนเริ่ม | ขั้นตอน | ผลที่คาดหวัง | ความสำคัญ | ประเภท | เทคนิค | M/A | ไฟล์เทสต์อัตโนมัติ |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-AUTH-01 | สมัครสมาชิก | FR-01.1 | ไม่มี session | 1. สมัคร | เข้า Dashboard | High | Positive | EP | Automated | \`e2e/specs/auth.spec.ts\` (\`@smoke\`) |
| TC-QZ-08 | ฟังเฉลย | FR-04.5 | ผู้เรียนล็อกอิน | 1. เปิดเฉลย | เห็นคำอธิบาย | Medium | Positive | EP | Manual | ไม่มีเทสต์อัตโนมัติ |
| TC-QZ-18 | สลับตัวเลือก | FR-04.1 | ผู้เรียนล็อกอิน | 1. ส่งคำตอบ | ได้ผล | High | Positive | EP | Automated (API) / Manual (UI) | \`e2e/api/submit-quiz.spec.ts\` |

## สรุปจำนวน TC

| พื้นที่ | จำนวน TC | Automated แล้ว | ยังไม่ automate |
|---|---|---|---|
| TC-AUTH (FR-01) | 99 | 99 | 0 |
`;

const RTM = `# FretPath — RTM

| Requirement | ระดับ | TC | สถานะ |
|---|---|---|---|
| FR-01.1 | M | TC-AUTH-01, TC-QZ-08 | ทำแล้ว (อัตโนมัติ) |
| FR-04.1 | S | — | รอแผนที่ 4 |
| FR-04.5 | M | — | รอแผนที่ 4 |
`;

describe('parseTestCases', () => {
  it('reads only real TC rows (not headers, separators or summary rows)', () => {
    const tcs = parseTestCases(TEST_CASES);
    expect(tcs.map((t) => t.id)).toEqual(['TC-AUTH-01', 'TC-QZ-08', 'TC-QZ-18']);
  });

  it('extracts area, priority and Manual/Automated', () => {
    const [a, b, c] = parseTestCases(TEST_CASES);
    expect(a).toMatchObject({ area: 'AUTH', priority: 'High', mode: 'Automated', partial: false });
    expect(b).toMatchObject({ area: 'QZ', priority: 'Medium', mode: 'Manual', partial: false });
    expect(c).toMatchObject({ mode: 'Automated', partial: true });
  });
});

describe('parseRtm', () => {
  it('extracts requirement id, level and TC ids (dash means none)', () => {
    expect(parseRtm(RTM)).toEqual([
      { id: 'FR-01.1', level: 'M', tcs: ['TC-AUTH-01', 'TC-QZ-08'] },
      { id: 'FR-04.1', level: 'S', tcs: [] },
      { id: 'FR-04.5', level: 'M', tcs: [] },
    ]);
  });
});

describe('computeStats', () => {
  const stats = computeStats(parseTestCases(TEST_CASES), parseRtm(RTM));

  it('counts TCs by area, mode and priority', () => {
    expect(stats.total).toBe(3);
    expect(stats.byArea).toEqual({ AUTH: 1, QZ: 2 });
    expect(stats.byMode).toEqual({ Automated: 2, Manual: 1, partial: 1 });
    expect(stats.byPriority).toEqual({ High: 2, Medium: 1, Low: 0 });
  });

  it('counts requirements with a TC per level and lists M requirements without one', () => {
    expect(stats.requirements.total).toBe(3);
    expect(stats.requirements.byLevel.M).toEqual({ total: 2, withTc: 1 });
    expect(stats.requirements.byLevel.S).toEqual({ total: 1, withTc: 0 });
    expect(stats.requirements.byLevel.C).toEqual({ total: 0, withTc: 0 });
    expect(stats.requirements.mWithoutTc).toEqual(['FR-04.5']);
  });

  it('reports RTM references to unknown TCs and TCs missing from the RTM', () => {
    const s = computeStats(parseTestCases(TEST_CASES), [{ id: 'FR-9', level: 'M', tcs: ['TC-NOPE-01'] }]);
    expect(s.unknownRefs).toEqual(['TC-NOPE-01']);
    expect(s.notInRtm).toEqual(['TC-AUTH-01', 'TC-QZ-08', 'TC-QZ-18']);
  });
});

describe('formatReport', () => {
  it('prints the M-without-TC count the exit criteria depends on', () => {
    const text = formatReport(computeStats(parseTestCases(TEST_CASES), parseRtm(RTM)));
    expect(text).toContain('requirement ระดับ M ที่ยังไม่มี TC: 1 (FR-04.5)');
    expect(text).toContain('TC ทั้งหมด: 3');
  });
});
