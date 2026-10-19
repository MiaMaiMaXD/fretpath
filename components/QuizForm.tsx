'use client';

import { useRef, useState, useTransition } from 'react';
import { QuizResultView } from '@/components/QuizResultView';
import { thaiError } from '@/lib/errors';
import { unansweredIds, type QuizQuestion, type QuizResult } from '@/lib/quiz';
import { submitQuiz } from '@/app/(learner)/lessons/[slug]/quiz/actions';

export function QuizForm({
  lessonId,
  slug,
  questions,
}: {
  lessonId: string;
  slug: string;
  questions: QuizQuestion[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [failedNetwork, setFailedNetwork] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);

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
        if (res.ok) setResult(res.result);
        else setError(thaiError(res.code));
      } catch {
        setError(thaiError('NETWORK'));
        setFailedNetwork(true);
      } finally {
        inFlight.current = false;
      }
    });
  }

  if (result) {
    return (
      <QuizResultView
        result={result}
        questions={questions}
        slug={slug}
        onRetry={() => {
          setAnswers({});
          setMissing([]);
          setResult(null);
        }}
      />
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="flex flex-col gap-6"
    >
      {questions.map((q, i) => {
        const isMissing = missing.includes(q.id);
        return (
          <div key={q.id} className="flex flex-col gap-2">
            <p className="font-medium">{q.prompt}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {q.imageUrl ? <img src={q.imageUrl} alt="" className="max-w-full" /> : null}
            <div role="radiogroup" aria-label={`ข้อ ${i + 1}`} aria-invalid={isMissing} className="flex flex-col gap-1">
              {q.choices.map((c) => (
                <label key={c.id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value={c.id}
                    checked={answers[q.id] === c.id}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: c.id }))}
                  />
                  <span>{c.text}</span>
                </label>
              ))}
            </div>
            {isMissing ? <p className="text-red-600">ยังไม่ได้ตอบ</p> : null}
          </div>
        );
      })}
      {missing.length > 0 ? (
        <p role="alert" className="text-red-600">
          ยังไม่ได้ตอบ {missing.length} ข้อ
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-neutral-900 px-4 py-2 font-medium text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {failedNetwork ? 'ส่งอีกครั้ง' : 'ส่งคำตอบ'}
      </button>
    </form>
  );
}
