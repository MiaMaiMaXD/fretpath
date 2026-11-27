import { describe, expect, it } from 'vitest';
import { editorProblems, type EditorPage } from '@/lib/admin/lesson-pages';

const page = (p: Partial<EditorPage>): EditorPage => ({ key: 'k', id: null, kind: 'text', title: 'หน้า', html: '', videoUrl: '', ...p });
const info = { title: 'บท', summary: '', chords: [] };

describe('editorProblems', () => {
  it('accepts a normal lesson', () => {
    expect(editorProblems(info, [page({}), page({ kind: 'video', videoUrl: 'https://youtu.be/dQw4w9WgXcQ' })])).toEqual([]);
  });
  it('needs a lesson title and page titles', () => {
    expect(editorProblems({ ...info, title: ' ' }, [page({ title: '' })])).toEqual(['กรุณากรอกชื่อบทเรียน', 'หน้าที่ 1: กรุณากรอกชื่อหน้า']);
  });
  it('rejects a channel link as a video and a second quiz page', () => {
    const out = editorProblems(info, [page({ kind: 'video', videoUrl: 'https://www.youtube.com/FretPath' }), page({ kind: 'quiz' }), page({ kind: 'quiz' })]);
    expect(out).toContain('บทเรียนหนึ่งมีหน้าแบบทดสอบได้ 1 หน้า');
    expect(out.some((m) => m.startsWith('หน้าที่ 1: ลิงก์วิดีโอ'))).toBe(true);
  });
  it('allows an empty video link while drafting', () => {
    expect(editorProblems(info, [page({ kind: 'video' })])).toEqual([]);
  });
});
