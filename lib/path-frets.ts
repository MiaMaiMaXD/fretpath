import type { PathLesson } from '@/lib/path-state';

/* The learning path drawn as a guitar neck: one lesson per fret. `FretSlot.fret` is a 0-based slot index;
   learners see slot n as lesson n + 1 drawn on real fret n + 1 (fret 1 is the first after the nut), so
   lesson numbers and inlay dots line up with a 22-fret guitar. Lessons take slots 0, 1, 2, ... in course
   order; units ("ช่วง") come from the course_sections table (see sectionUnits). */

export const FRET_COUNT = 22;

/** Inlay positions on a real fretboard (fret numbers, = lesson numbers on the path); 12 is the double dot. */
export const INLAYS: ReadonlySet<number> = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21]);

export type PathUnit = { name: string; from: number; to: number };

export const UNITS: readonly PathUnit[] = [
  { name: 'ช่วงที่ 1 · จับกีตาร์ครั้งแรก', from: 0, to: 4 },
  { name: 'ช่วงที่ 2 · เล่นเพลงแรก', from: 5, to: 9 },
  { name: 'ช่วงที่ 3 · เข้าใจคอร์ด', from: 10, to: 14 },
  { name: 'ช่วงที่ 4 · ทั่วคอกีตาร์', from: 15, to: 21 },
];

export type PlannedLesson = { slug: string; title: string; summary: string };

/** Planned guitar-basics curriculum, fret 0..21 (home page copy, and "coming soon" slots past the last lesson). */
export const CURRICULUM: Record<string, readonly PlannedLesson[]> = {
  'guitar-basics': [
    { slug: 'guitar-anatomy-tuning', title: 'รู้จักกีตาร์ ท่านั่ง และการตั้งสาย', summary: 'ส่วนประกอบ ชื่อสาย E A D G B E และตั้งสายด้วยจูนเนอร์' },
    { slug: 'read-tab-chord-charts', title: 'อ่านแท็บและแผนผังคอร์ด', summary: 'เลขสาย เลขเฟรต เลขนิ้ว 1–4 และสัญลักษณ์ x / o' },
    { slug: 'first-chords', title: 'คอร์ดแรก Em Am C D', summary: 'วางนิ้วด้วยปลายนิ้ว ให้ทุกสายดังชัด' },
    { slug: 'open-chords-changes', title: 'เปลี่ยนคอร์ด G C D Em ให้ลื่น', summary: 'นิ้วหลัก และฝึกเปลี่ยนคอร์ดใน 1 นาที' },
    { slug: 'strumming-4-4', title: 'นับจังหวะ 4/4 และดีดให้สม่ำเสมอ', summary: 'ห้องเพลง โน้ตตัวดำ ใช้เมโทรนอม 60–80 BPM' },
    { slug: 'twelve-notes', title: 'ตัวโน้ต 12 ตัว ครึ่งเสียงและเต็มเสียง', summary: 'ชาร์ป แฟลต และชื่อโน้ตบนสาย 6 กับสาย 5' },
    { slug: 'eighth-note-strumming', title: 'แพทเทิร์นดีดขึ้นลง ตัวเขบ็ต 1 ชั้น', summary: 'นับ 1 และ 2 และ ให้มือแกว่งต่อเนื่อง' },
    { slug: 'f-chord-first-song', title: 'คอร์ด F แบบง่าย และเล่นเพลงแรกจบเพลง', summary: 'คอร์ด F แบบ 4 สาย กับเพลงที่ใช้ C G Am F' },
    { slug: 'seventh-sus-chords', title: 'คอร์ด 7 และคอร์ด sus', summary: 'A7 D7 E7 G7 Dsus2 Dsus4' },
    { slug: 'c-major-scale', title: 'บันไดเสียง C เมเจอร์ และขั้นคู่', summary: 'สูตร เต็ม เต็ม ครึ่ง เต็ม เต็ม เต็ม ครึ่ง' },
    { slug: 'building-triads', title: 'สร้างคอร์ดจากโน้ต 1–3–5', summary: 'ไตรแอดเมเจอร์และไมเนอร์' },
    { slug: 'chords-in-a-key', title: 'คอร์ดในคีย์ และทางเดินคอร์ด I–IV–V–vi', summary: 'คอร์ดประจำขั้นและเลขโรมัน' },
    { slug: 'capo-octave', title: 'คาโป้ การย้ายคีย์ และเสียงคู่แปดที่เฟรต 12', summary: 'ย้ายคีย์ให้เข้ากับเสียงร้อง และฮาร์โมนิกเฟรต 12' },
    { slug: 'fingerpicking-basics', title: 'เกากีตาร์พื้นฐาน', summary: 'นิ้ว p i m a และการเกาแบบอาร์เปจโจ' },
    { slug: 'power-chords-palm-mute', title: 'พาวเวอร์คอร์ด และการอุดเสียงด้วยฝ่ามือ', summary: 'คอร์ด 5 บนสาย 6 และสาย 5' },
    { slug: 'barre-e-shape', title: 'บาร์คอร์ดรูป E', summary: 'F G Fm ใช้ชื่อโน้ตบนสาย 6 หาตำแหน่ง' },
    { slug: 'barre-a-shape', title: 'บาร์คอร์ดรูป A', summary: 'B♭ Bm C บนสาย 5' },
    { slug: 'minor-pentatonic', title: 'เพนทาโทนิกไมเนอร์ และการด้นสด', summary: 'Am เพนทาโทนิกตำแหน่งที่ 1' },
    { slug: 'legato-techniques', title: 'hammer-on pull-off slide bend', summary: 'เทคนิคมือซ้ายสำหรับเล่นทำนอง' },
    { slug: 'caged-system', title: 'ระบบ CAGED: คอร์ดเดิมใน 5 ตำแหน่ง', summary: 'เชื่อมคอร์ดเปิดกับบาร์คอร์ดทั่วคอ' },
    { slug: 'odd-meters-shuffle', title: 'จังหวะ 3/4, 6/8, ชัฟเฟิล และจังหวะขัด', summary: 'เพลงวอลซ์ บลูส์ชัฟเฟิล และ syncopation' },
    { slug: 'final-song-project', title: 'โปรเจกต์จบ: เล่นเพลงเต็มเพลง', summary: 'อ่านคอร์ดชีตและเล่นกับเมโทรนอมจนจบ' },
  ],
};

export type FretSlot = { fret: number } & ({ lesson: PathLesson; plan?: undefined } | { lesson?: undefined; plan: PlannedLesson });

/**
 * Places a course's lessons (already in sort order) on frets 0, 1, 2, ... in order. When the course has
 * a planned curriculum longer than its lessons, the planned lessons past the last real one become
 * "coming soon" slots. (Lessons used to be pinned to their planned fret by slug, which left gaps once
 * admins reordered lessons; sections now come from the database instead.)
 */
export function layoutPath(courseSlug: string, lessons: PathLesson[]): FretSlot[] {
  const plan = CURRICULUM[courseSlug] ?? [];
  const slots: FretSlot[] = lessons.map((lesson, fret) => ({ fret, lesson }));
  for (let fret = lessons.length; fret < plan.length; fret++) slots.push({ fret, plan: plan[fret] });
  return slots;
}

/** Fallback units by slot count (used when a course has no section data): the fixed UNITS ranges. */
export function unitsFor(count: number): PathUnit[] {
  const units = UNITS.filter((u) => u.from < count).map((u) => ({ ...u, to: Math.min(u.to, count - 1) }));
  if (count > FRET_COUNT) units.push({ name: 'บทเพิ่มเติม', from: FRET_COUNT, to: count - 1 });
  return units;
}

export type SectionInfo = { id: string; title: string };

/** "ช่วงที่ 2 · เล่นเพลงแรก", or just "ช่วงที่ 2" while the section has no name. */
export function sectionName(n: number, title: string): string {
  return title.trim() ? `ช่วงที่ ${n} · ${title.trim()}` : `ช่วงที่ ${n}`;
}

/**
 * Units from the course's sections: consecutive slots whose lesson belongs to the same section form one
 * unit, numbered in order of appearance. Trailing "coming soon" slots form one more unit. Without any
 * section data it falls back to the fixed ranges.
 */
export function sectionUnits(slots: FretSlot[], sections: SectionInfo[]): PathUnit[] {
  if (sections.length === 0 || !slots.some((s) => s.lesson?.sectionId)) return unitsFor(slots.length);
  const title = new Map(sections.map((s) => [s.id, s.title]));
  const units: (PathUnit & { key: string })[] = [];
  for (const s of slots) {
    const key = s.lesson ? (s.lesson.sectionId ?? '') : 'soon';
    const last = units.at(-1);
    if (last && last.key === key) last.to = s.fret;
    else units.push({ key, name: '', from: s.fret, to: s.fret });
  }
  let n = 0;
  return units.map(({ key, from, to }) => ({
    name: key === 'soon' ? 'เร็ว ๆ นี้' : sectionName(++n, title.get(key) ?? ''),
    from,
    to,
  }));
}

/** Lesson id → the lesson number learners see (slot + 1): "บทที่ 1" on fret 1 to "บทที่ 22" on fret 22. */
export function lessonNumbers(slots: FretSlot[]): Record<string, number> {
  return Object.fromEntries(slots.flatMap((s) => (s.lesson ? [[s.lesson.id, s.fret + 1]] : [])));
}
