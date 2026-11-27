import { isChordName, type ChordName } from '@/lib/audio/chords';
import { isStoredYouTubeUrl } from '@/lib/youtube';

export type PageKind = 'text' | 'video' | 'quiz';

/** One page in the lesson editor. `id` is null until the page is saved. */
export type EditorPage = {
  key: string;
  id: string | null;
  kind: PageKind;
  title: string;
  /** text pages: editor HTML */
  html: string;
  /** video pages */
  videoUrl: string;
};

export type EditorInfo = { title: string; summary: string; chords: ChordName[] };

export const LIMITS = { title: 200, summary: 5000, pageTitle: 200, html: 200_000 } as const;

export const KIND_LABEL: Record<PageKind, string> = { text: 'ข้อความ', video: 'วิดีโอ', quiz: 'แบบทดสอบ' };

/** Problems that block saving, in Thai; empty when the lesson can be saved. */
export function editorProblems(info: EditorInfo, pages: EditorPage[]): string[] {
  const out: string[] = [];
  if (!info.title.trim()) out.push('กรุณากรอกชื่อบทเรียน');
  if (info.title.length > LIMITS.title) out.push(`ชื่อบทเรียนยาวได้ไม่เกิน ${LIMITS.title} ตัวอักษร`);
  if (info.summary.length > LIMITS.summary) out.push(`คำอธิบายยาวได้ไม่เกิน ${LIMITS.summary} ตัวอักษร`);
  if (info.chords.some((c) => !isChordName(c))) out.push('มีคอร์ดที่ระบบไม่รู้จัก');
  if (pages.filter((p) => p.kind === 'quiz').length > 1) out.push('บทเรียนหนึ่งมีหน้าแบบทดสอบได้ 1 หน้า');
  pages.forEach((p, i) => {
    const n = `หน้าที่ ${i + 1}`;
    if (!p.title.trim()) out.push(`${n}: กรุณากรอกชื่อหน้า`);
    if (p.title.length > LIMITS.pageTitle) out.push(`${n}: ชื่อหน้ายาวได้ไม่เกิน ${LIMITS.pageTitle} ตัวอักษร`);
    if (p.kind === 'text' && p.html.length > LIMITS.html) out.push(`${n}: เนื้อหายาวเกินไป`);
    if (p.kind === 'video' && p.videoUrl.trim() && !isStoredYouTubeUrl(p.videoUrl.trim())) {
      out.push(`${n}: ลิงก์วิดีโอต้องเป็นลิงก์คลิป YouTube เช่น https://www.youtube.com/watch?v=…`);
    }
  });
  return out;
}
