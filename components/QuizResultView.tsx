import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { QuizQuestion, QuizResult } from '@/lib/quiz';
import { RetryCountdown } from './RetryCountdown';

export function QuizResultView({
  result,
  questions,
  onRetry,
}: {
  result: QuizResult;
  questions: QuizQuestion[];
  onRetry: () => void;
}) {
  const scoreRef = useRef<HTMLParagraphElement>(null);
  // the attempt that used up the quota locks the quiz for 24 hours from now
  const [reopensAt] = useState(() => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
  // Move focus to the score so screen-reader and keyboard users land on the result.
  useEffect(() => scoreRef.current?.focus(), []);
  const byQuestion = new Map(result.results.map((r) => [r.question_id, r]));
  return (
    <div className="lv-result">
      <div className={`lv-score ${result.passed ? 'pass' : 'fail'}`}>
        <p ref={scoreRef} tabIndex={-1} data-testid="quiz-score" className="lv-score-n">
          {result.score_pct}%
        </p>
        <div>
          <p className="lv-score-verdict">{result.passed ? 'ผ่าน' : 'ไม่ผ่าน'}</p>
          <p className="lv-score-sub">
            {result.passed ? 'เยี่ยมมาก! ปลดล็อกบทถัดไปแล้ว' : `ต้องได้อย่างน้อย ${result.pass_score}% จึงจะผ่าน`}
          </p>
        </div>
      </div>
      <ol aria-label="ผลรายข้อ" className="lv-questions">
        {questions.map((q, i) => {
          const r = byQuestion.get(q.id);
          if (!r) return null;
          return (
            <li key={q.id} className={`lv-q ${r.is_correct ? 'right' : 'wrong'}`}>
              <p className="lv-q-prompt">
                ข้อที่ {i + 1}: {q.prompt}
                <span className="lv-mark">{r.is_correct ? 'ถูก' : 'ผิด'}</span>
              </p>
              {/* every choice as on the quiz; only the learner's own one is marked (the key is not shown) */}
              <div className="lv-choices result">
                {q.choices.map((c) => {
                  const chosen = c.id === r.choice_id;
                  return (
                    <div key={c.id} className={chosen ? (r.is_correct ? 'chosen right' : 'chosen wrong') : ''}>
                      <span className="lv-dot" aria-hidden="true" />
                      <span>{c.text}</span>
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="lv-actions center">
        {result.passed ? (
          result.next_lesson_slug ? (
            <Link href={`/lessons/${result.next_lesson_slug}`} className="lv-pill amber">
              ไปบทถัดไป
            </Link>
          ) : (
            <p className="lv-done">จบคอร์สแล้ว ยินดีด้วย!</p>
          )
        ) : (
          <>
            <Link href="/path" className="lv-pill slate">
              ทบทวนบทเรียน
            </Link>
            {result.attempts_left === 0 ? (
              <>
                <button type="button" className="lv-pill amber" disabled>
                  สอบใหม่
                </button>
                <div data-testid="quiz-exhausted" className="lv-quota-row">
                  <RetryCountdown until={reopensAt} />
                </div>
              </>
            ) : (
              <button type="button" onClick={onRetry} className="lv-pill amber">
                สอบใหม่
                {typeof result.attempts_left === 'number' ? ` (เหลือ ${result.attempts_left} ครั้ง)` : ''}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
