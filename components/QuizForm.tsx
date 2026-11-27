'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { QuizResultView } from '@/components/QuizResultView';
import { thaiError } from '@/lib/errors';
import { unansweredIds, type QuizQuestion, type QuizResult } from '@/lib/quiz';
import { submitQuiz } from '@/app/(learner)/lessons/[slug]/quiz/actions';
import './lesson/lesson-viewer.css';

/** Answers picked but not sent yet, kept on this device so กลับ or leaving the page does not lose them. */
const draftKey = (lessonId: string) => `fp-quiz-answers:${lessonId}`;

function readDraft(lessonId: string, questions: QuizQuestion[]): Record<string, string> {
  try {
    const saved = JSON.parse(window.localStorage.getItem(draftKey(lessonId)) ?? '{}') as Record<string, unknown>;
    // keep only answers that still match a question and one of its choices
    return Object.fromEntries(
      questions.flatMap((q) => {
        const c = saved[q.id];
        return typeof c === 'string' && q.choices.some((x) => x.id === c) ? [[q.id, c]] : [];
      }),
    );
  } catch {
    return {};
  }
}

function writeDraft(lessonId: string, answers: Record<string, string>) {
  try {
    if (Object.keys(answers).length === 0) window.localStorage.removeItem(draftKey(lessonId));
    else window.localStorage.setItem(draftKey(lessonId), JSON.stringify(answers));
  } catch {
    // storage full or blocked: answers just are not remembered
  }
}

/**
 * The quiz screen (2026-11 design): kicker + title with the score pill top right, the questions, then
 * กลับ / ส่งคำตอบ. The result replaces the questions in place.
 */
export function QuizForm({
  lessonId,
  questions,
  title = 'แบบทดสอบ',
  onBack,
}: {
  lessonId: string;
  questions: QuizQuestion[];
  title?: string;
  /** กลับ: back to the quiz intro */
  onBack?: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [failedNetwork, setFailedNetwork] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);

  const correct = result ? result.results.filter((r) => r.is_correct).length : 0;

  // bring back answers picked before กลับ / leaving the page (after hydration: storage is client-only)
  useEffect(() => {
    const saved = readDraft(lessonId, questions);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from localStorage
    if (Object.keys(saved).length > 0) setAnswers(saved);
  }, [lessonId, questions]);

  function choose(questionId: string, choiceId: string) {
    setAnswers((a) => {
      const next = { ...a, [questionId]: choiceId };
      writeDraft(lessonId, next);
      return next;
    });
  }

  function send() {
    if (inFlight.current) return;
    const missingIds = unansweredIds(questions, answers);
    setMissing(missingIds);
    if (missingIds.length > 0) return;
    inFlight.current = true;
    setError(null);
    setFailedNetwork(false);
    const payload = questions.map((q) => ({ question_id: q.id, choice_id: answers[q.id] }));
    startTransition(async () => {
      try {
        const res = await submitQuiz(lessonId, payload);
        if (res.ok) {
          setResult(res.result);
          writeDraft(lessonId, {}); // sent: start the next try fresh
        } else setError(thaiError(res.code));
      } catch {
        setError(thaiError('NETWORK'));
        setFailedNetwork(true);
      } finally {
        inFlight.current = false;
      }
    });
  }

  const header = (
    <div className="lv-quiz-head">
      <div>
        <p className="lv-kicker">แบบทดสอบ</p>
        <h1 className="lv-title">{title}</h1>
      </div>
      <span className={`lv-chip score ${result ? (result.passed ? 'good' : 'warn') : ''}`} data-testid="quiz-points">
        คะแนน: {correct}/{questions.length}
      </span>
    </div>
  );

  if (result) {
    return (
      <>
        {header}
        <hr />
        <QuizResultView
          result={result}
          questions={questions}
          onRetry={() => {
            setAnswers({});
            setMissing([]);
            setResult(null);
          }}
        />
      </>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="lv-form"
    >
      {header}
      <hr />
      <ol className="lv-questions">
        {questions.map((q, i) => {
          const isMissing = missing.includes(q.id);
          return (
            <li key={q.id} className={`lv-q ${isMissing ? 'missing' : ''}`}>
              <p className="lv-q-prompt" id={`q-${q.id}-label`}>
                ข้อที่ {i + 1}: {q.prompt}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {q.imageUrl ? <img src={q.imageUrl} alt="" className="lv-q-img" /> : null}
              <div role="radiogroup" aria-label={`ข้อ ${i + 1}`} aria-invalid={isMissing} className="lv-choices">
                {q.choices.map((c) => (
                  <label key={c.id} className={answers[q.id] === c.id ? 'on' : ''}>
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={c.id}
                      checked={answers[q.id] === c.id}
                      onChange={() => choose(q.id, c.id)}
                    />
                    <span>{c.text}</span>
                  </label>
                ))}
              </div>
              {isMissing ? <p className="lv-q-missing">ยังไม่ได้ตอบ</p> : null}
            </li>
          );
        })}
      </ol>
      {missing.length > 0 ? (
        <p role="alert" className="lv-alert">
          ยังไม่ได้ตอบ {missing.length} ข้อ
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="lv-alert">
          {error}
        </p>
      ) : null}
      <div className="lv-actions center">
        {onBack ? (
          <button type="button" className="lv-pill slate" onClick={onBack} disabled={pending}>
            กลับ
          </button>
        ) : null}
        <button type="submit" disabled={pending} className="lv-pill amber">
          {pending ? 'กำลังส่ง…' : failedNetwork ? 'ส่งอีกครั้ง' : 'ส่งคำตอบ'}
        </button>
      </div>
    </form>
  );
}
