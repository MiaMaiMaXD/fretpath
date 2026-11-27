'use client';

import { useState } from 'react';
import {
  emptyQuestion,
  MAX_PRACTICAL,
  PRACTICAL_CHORDS,
  questionLabel,
  type QuizQuestionDraft,
  type QuizSettings,
} from '@/lib/admin/quiz-editor';
import type { ChordName } from '@/lib/audio/chords';

let seq = 0;
const newKey = () => `q-${Date.now()}-${seq++}`;

/**
 * Quiz page body (2026-11 design): retake and pass settings, then collapsible questions — multiple
 * choice ("ปรนัย") or one practical chord question ("ปฏิบัติ"). Changes are saved with the lesson.
 */
export function QuizEditor({
  settings,
  onSettings,
  questions,
  onQuestions,
  onDelete,
}: {
  settings: QuizSettings;
  onSettings: (s: QuizSettings) => void;
  questions: QuizQuestionDraft[];
  onQuestions: (q: QuizQuestionDraft[]) => void;
  /** asks for confirmation, then removes the question */
  onDelete: (index: number) => void;
}) {
  const [open, setOpen] = useState<string | null>(questions[0]?.key ?? null);
  const [drag, setDrag] = useState<{ q: string; choice?: number } | null>(null);
  const practicalLeft = MAX_PRACTICAL - questions.filter((q) => q.kind === 'practical').length;

  const patch = (key: string, p: Partial<QuizQuestionDraft>) =>
    onQuestions(questions.map((q) => (q.key === key ? { ...q, ...p } : q)));

  function add(kind: QuizQuestionDraft['kind']) {
    const q = emptyQuestion(kind, newKey());
    onQuestions([...questions, q]);
    setOpen(q.key);
  }

  function dropQuestion(targetKey: string) {
    if (!drag || drag.choice !== undefined || drag.q === targetKey) return;
    const list = [...questions];
    const to = list.findIndex((q) => q.key === targetKey);
    const [item] = list.splice(list.findIndex((q) => q.key === drag.q), 1);
    list.splice(to, 0, item);
    onQuestions(list);
  }

  function dropChoice(q: QuizQuestionDraft, to: number) {
    if (!drag || drag.q !== q.key || drag.choice === undefined || drag.choice === to) return;
    const from = drag.choice;
    const move = <T,>(xs: T[]) => {
      const out = [...xs];
      const [x] = out.splice(from, 1);
      out.splice(to, 0, x);
      return out;
    };
    const choices = move(q.choices);
    const choiceIds = move(q.choiceIds);
    // the correct answer follows its text
    const order = q.choices.map((_, i) => i);
    const [o] = order.splice(from, 1);
    order.splice(to, 0, o);
    patch(q.key, { choices, choiceIds, correct: q.correct === null ? null : order.indexOf(q.correct) });
  }

  return (
    <div className="qz">
      <div className="qz-settings">
        <label className="fld">
          <span>จำนวนครั้งที่ทำได้ต่อวัน</span>
          <input
            inputMode="numeric"
            placeholder="กรอกจำนวน"
            value={settings.maxAttempts}
            onChange={(e) => onSettings({ ...settings, maxAttempts: e.target.value.replace(/\D/g, '').slice(0, 2) })}
          />
        </label>
        <label className="fld">
          <span>เกณฑ์คะแนนที่ให้ผ่าน (%)</span>
          <input
            inputMode="numeric"
            placeholder="กรอกเกณฑ์คะแนน"
            value={settings.passScore}
            onChange={(e) => onSettings({ ...settings, passScore: e.target.value.replace(/\D/g, '').slice(0, 3) })}
          />
        </label>
      </div>

      <div className="fld">
        <span>แบบทดสอบ</span>
        {questions.length === 0 ? <p className="hint">ยังไม่มีข้อสอบ กด “เพิ่มปรนัย” เพื่อเริ่ม</p> : null}
        <ol className="qz-list">
          {questions.map((q, i) => {
            const isOpen = open === q.key;
            return (
              <li
                key={q.key}
                className={`qz-q ${isOpen ? 'open' : ''} ${drag?.q === q.key && drag.choice === undefined ? 'dragging' : ''}`}
                data-testid="qz-question"
                onDragOver={(e) => {
                  if (drag && drag.choice === undefined) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  dropQuestion(q.key);
                  setDrag(null);
                }}
              >
                <div className="qz-head">
                  <span
                    className="grip"
                    draggable
                    onDragStart={() => setDrag({ q: q.key })}
                    onDragEnd={() => setDrag(null)}
                    title="ลากเพื่อเรียงลำดับ"
                    aria-hidden="true"
                  >
                    ⠿
                  </span>
                  <QuestionIcon kind={q.kind} />
                  <button type="button" className="qz-title" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : q.key)}>
                    <span>{questionLabel(q, i)}</span>
                    <svg viewBox="0 0 24 24" aria-hidden="true" className={isOpen ? 'up' : ''}>
                      <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </button>
                  <button type="button" className="qz-x" aria-label={`ลบข้อที่ ${i + 1}`} onClick={() => onDelete(i)}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                {isOpen ? (
                  <div className="qz-body">
                    <label className="fld">
                      <span>คำถาม</span>
                      <input value={q.prompt} placeholder="กรอกคำถาม" onChange={(e) => patch(q.key, { prompt: e.target.value })} />
                    </label>
                    {q.kind === 'choice' ? (
                      <ol className="qz-choices" aria-label={`ตัวเลือกของข้อที่ ${i + 1}`}>
                        {q.choices.map((c, ci) => (
                          <li
                            key={ci}
                            className="qz-choice"
                            onDragOver={(e) => {
                              if (drag?.q === q.key && drag.choice !== undefined) e.preventDefault();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              dropChoice(q, ci);
                              setDrag(null);
                            }}
                          >
                            <span
                              className="grip"
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation();
                                setDrag({ q: q.key, choice: ci });
                              }}
                              onDragEnd={() => setDrag(null)}
                              aria-hidden="true"
                            >
                              ⠿
                            </span>
                            <button
                              type="button"
                              className={`qz-mark ${q.correct === ci ? 'on' : ''}`}
                              aria-pressed={q.correct === ci}
                              aria-label={`ตั้งตัวเลือกที่ ${ci + 1} เป็นข้อที่ถูก`}
                              onClick={() => patch(q.key, { correct: ci })}
                            >
                              {q.correct === ci ? (
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                  <path d="m6 12 4 4 8-8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              ) : null}
                            </button>
                            <input
                              value={c}
                              placeholder={`ตัวเลือกที่ ${ci + 1}`}
                              aria-label={`ตัวเลือกที่ ${ci + 1}`}
                              onChange={(e) => patch(q.key, { choices: q.choices.map((x, xi) => (xi === ci ? e.target.value : x)) })}
                            />
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <fieldset className="fld chords">
                        <legend>เลือกคอร์ดในข้อปฏิบัติ</legend>
                        <div className="chips">
                          {PRACTICAL_CHORDS.map((c) => {
                            const on = q.chords.includes(c);
                            return (
                              <button
                                key={c}
                                type="button"
                                className={`chip ${on ? 'on' : ''}`}
                                aria-pressed={on}
                                onClick={() =>
                                  patch(q.key, {
                                    chords: on
                                      ? q.chords.filter((x) => x !== c)
                                      : PRACTICAL_CHORDS.filter((x): x is ChordName => x === c || q.chords.includes(x)),
                                  })
                                }
                              >
                                {c}
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="qz-add">
        <button type="button" className="pill amber wide" onClick={() => add('choice')}>
          + เพิ่มปรนัย
        </button>
        <button type="button" className="pill green wide" disabled={practicalLeft <= 0} onClick={() => add('practical')}>
          + เพิ่มปฏิบัติ ({Math.max(0, practicalLeft)})
        </button>
      </div>
    </div>
  );
}

function QuestionIcon({ kind }: { kind: QuizQuestionDraft['kind'] }) {
  const c = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;
  return kind === 'choice' ? (
    <svg {...c} className="kind text">
      <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
      <path d="M14 3v5h5M8 13h8M8 17h8M8 9h3" />
    </svg>
  ) : (
    <svg {...c} className="kind quiz">
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </svg>
  );
}
