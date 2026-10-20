import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { QuizQuestion, QuizResult } from '@/lib/quiz';

export function QuizResultView({
  result,
  questions,
  slug,
  onRetry,
}: {
  result: QuizResult;
  questions: QuizQuestion[];
  slug: string;
  onRetry: () => void;
}) {
  const scoreRef = useRef<HTMLParagraphElement>(null);
  // Move focus to the score so screen-reader and keyboard users land on the result.
  useEffect(() => scoreRef.current?.focus(), []);
  const byQuestion = new Map(result.results.map((r) => [r.question_id, r]));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-3">
        <p ref={scoreRef} tabIndex={-1} data-testid="quiz-score" className="text-4xl font-bold outline-none">
          {result.score_pct}%
        </p>
        <p className={result.passed ? 'font-semibold text-green-700' : 'font-semibold text-red-600'}>
          {result.passed ? 'ผ่าน' : 'ไม่ผ่าน'}
        </p>
      </div>
      <ol aria-label="ผลรายข้อ" className="flex flex-col gap-4">
        {questions.map((q, i) => {
          const r = byQuestion.get(q.id);
          if (!r) return null;
          const chosen = q.choices.find((c) => c.id === r.choice_id)?.text ?? '';
          const correct = q.choices.find((c) => c.id === r.correct_choice_id)?.text ?? '';
          return (
            <li key={q.id} className="flex flex-col gap-1 rounded border p-3">
              <p className="font-medium">
                ข้อ {i + 1}. {q.prompt}
              </p>
              <p>
                คำตอบของคุณ: {chosen} ({r.is_correct ? 'ถูก' : 'ผิด'})
              </p>
              {r.is_correct ? null : <p>คำตอบที่ถูก: {correct}</p>}
              <p>คำอธิบาย: {r.explanation ?? '-'}</p>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-3">
        {result.passed ? (
          result.next_lesson_slug ? (
            <Link href={`/lessons/${result.next_lesson_slug}`} className="rounded border px-4 py-2 font-medium">
              ไปบทถัดไป
            </Link>
          ) : (
            <p className="font-semibold">จบคอร์สแล้ว</p>
          )
        ) : (
          <>
            <Link href={`/lessons/${slug}`} className="rounded border px-4 py-2 font-medium">
              ทบทวนบทเรียน
            </Link>
            <button type="button" onClick={onRetry} className="rounded border px-4 py-2 font-medium">
              สอบใหม่
            </button>
          </>
        )}
      </div>
    </div>
  );
}
