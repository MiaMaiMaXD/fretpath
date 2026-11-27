import { isChordName } from '@/lib/audio/chords';
import type { EditorInfo, EditorPage } from './lesson-pages';
import type { QuizQuestionDraft, QuizSettings } from './quiz-editor';

/** Everything the lesson editor edits; also the JSON stored as a draft in lesson_drafts.data. */
export type EditorState = {
  info: EditorInfo;
  pages: EditorPage[];
  quiz: QuizSettings;
  questions: QuizQuestionDraft[];
};

export const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const str = (x: unknown) => (typeof x === 'string' ? x : '');
const idOrNull = (x: unknown) => (typeof x === 'string' && x ? x : null);
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const obj = (x: unknown): Record<string, unknown> => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : {});

/** Reads a stored draft defensively (it is JSON written by an older editor, maybe). null when unusable. */
export function parseDraft(data: unknown): EditorState | null {
  const d = obj(data);
  if (!d.info || !Array.isArray(d.pages) || !Array.isArray(d.questions)) return null;
  const info = obj(d.info);
  const quiz = obj(d.quiz);
  return {
    info: {
      title: str(info.title),
      summary: str(info.summary),
      chords: arr(info.chords).filter((c): c is EditorInfo['chords'][number] => typeof c === 'string' && isChordName(c)),
    },
    pages: arr(d.pages).flatMap((x, i): EditorPage[] => {
      const p = obj(x);
      const kind = p.kind === 'video' || p.kind === 'quiz' ? p.kind : p.kind === 'text' ? 'text' : null;
      if (!kind) return [];
      return [{ key: str(p.key) || `draft-${i}`, id: idOrNull(p.id), kind, title: str(p.title), html: str(p.html), videoUrl: str(p.videoUrl) }];
    }),
    quiz: { passScore: str(quiz.passScore) || '60', maxAttempts: str(quiz.maxAttempts) },
    questions: arr(d.questions).flatMap((x, i): QuizQuestionDraft[] => {
      const q = obj(x);
      const kind = q.kind === 'practical' ? 'practical' : q.kind === 'choice' ? 'choice' : null;
      if (!kind) return [];
      const choices = arr(q.choices).map(str);
      const ids = arr(q.choiceIds).map(idOrNull);
      return [
        {
          key: str(q.key) || `draft-q-${i}`,
          id: idOrNull(q.id),
          kind,
          prompt: str(q.prompt),
          choices,
          choiceIds: ids.length === choices.length ? ids : choices.map(() => null),
          correct: typeof q.correct === 'number' ? q.correct : null,
          explanation: str(q.explanation),
          chords: arr(q.chords).filter((c): c is QuizQuestionDraft['chords'][number] => typeof c === 'string' && isChordName(c)),
        },
      ];
    }),
  };
}
