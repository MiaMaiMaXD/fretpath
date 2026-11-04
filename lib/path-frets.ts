import type { PathLesson } from '@/lib/path-state';

/* The learning path drawn as a guitar neck: one lesson per fret, fret 0 (open strings) to fret 21.
   For the guitar-basics course the planned 22-lesson curriculum fills the frets that have no lesson
   yet, shown as "coming soon". Other courses simply place their lessons on frets 0, 1, 2, ... */

export const FRET_COUNT = 22;

/** Inlay positions on a real fretboard; 12 is the double dot. */
export const INLAYS: ReadonlySet<number> = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21]);

export type PathUnit = { name: string; from: number; to: number };

export const UNITS: readonly PathUnit[] = [
  { name: 'ช่วงที่ 1 · จับกีตาร์ครั้งแรก', from: 0, to: 4 },
  { name: 'ช่วงที่ 2 · เล่นเพลงแรก', from: 5, to: 9 },
  { name: 'ช่วงที่ 3 · เข้าใจคอร์ด', from: 10, to: 14 },
  { name: 'ช่วงที่ 4 · ทั่วคอกีตาร์', from: 15, to: 21 },
];

export type PlannedLesson = { slug: string; title: string; summary: string };

/** Planned guitar-basics curriculum, fret 0..21. A lesson created with one of these slugs takes that fret. */
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
 * Places a course's lessons (already in sort order) on frets. A lesson whose slug is in the plan takes
 * its planned fret when that keeps the order; any other lesson takes the next free fret. Planned frets
 * left without a lesson become "coming soon" slots.
 */
export function layoutPath(courseSlug: string, lessons: PathLesson[]): FretSlot[] {
  const plan = CURRICULUM[courseSlug] ?? [];
  const fretOf = new Map(plan.map((p, i) => [p.slug, i]));
  const slots: FretSlot[] = [];
  let cursor = 0;
  for (const lesson of lessons) {
    const planned = fretOf.get(lesson.slug);
    const fret = planned !== undefined && planned >= cursor ? planned : cursor;
    for (; cursor < fret; cursor++) slots.push({ fret: cursor, plan: plan[cursor] });
    slots.push({ fret, lesson });
    cursor = fret + 1;
  }
  for (; cursor < plan.length; cursor++) slots.push({ fret: cursor, plan: plan[cursor] });
  return slots;
}

/** Units that hold at least one of `count` slots; past fret 21 everything goes in one extra unit. */
export function unitsFor(count: number): PathUnit[] {
  const units = UNITS.filter((u) => u.from < count).map((u) => ({ ...u, to: Math.min(u.to, count - 1) }));
  if (count > FRET_COUNT) units.push({ name: 'บทเพิ่มเติม', from: FRET_COUNT, to: count - 1 });
  return units;
}
