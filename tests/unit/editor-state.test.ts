import { describe, expect, it } from 'vitest';
import { parseDraft, type EditorState } from '@/lib/admin/editor-state';

const state: EditorState = {
  info: { title: 'บท', summary: 's', chords: ['C', 'G'] },
  pages: [{ key: 'a', id: 'p1', kind: 'text', title: 't', html: '<p>x</p>', videoUrl: '' }],
  quiz: { passScore: '60', maxAttempts: '' },
  questions: [{ key: 'q', id: null, kind: 'choice', prompt: 'p', choices: ['a', 'b'], choiceIds: [null, null], correct: 1, explanation: '', chords: [] }],
};

describe('parseDraft', () => {
  it('round-trips the editor state', () => {
    expect(parseDraft(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });
  it('rejects junk and drops unknown kinds and chords', () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft({ info: {} })).toBeNull();
    const p = parseDraft({ ...state, info: { ...state.info, chords: ['C', 'Zz'] }, pages: [{ kind: 'html' }, ...state.pages] });
    expect(p?.info.chords).toEqual(['C']);
    expect(p?.pages).toHaveLength(1);
  });
});
