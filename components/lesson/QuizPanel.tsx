'use client';

import Link from 'next/link';
import { useState } from 'react';
import { QuizForm } from '@/components/QuizForm';
import { RetryCountdown } from '@/components/RetryCountdown';
import type { QuizQuestion } from '@/lib/quiz';

export type LearnerQuiz = {
  lessonId: string;
  slug: string;
  lessonNo: number;
  /** the quiz page's title */
  title: string;
  passScore: number;
  questions: QuizQuestion[];
  maxAttempts: number | null;
  attemptsLeft: number | null;
  /** when a used-up quota reopens (ISO time) */
  retryAt: string | null;
};

/**
 * Learner quiz (2026-11 flow): an intro card ("แบบทดสอบ บทที่ N", attempts used, กลับ / ทำแบบทดสอบ),
 * then the quiz screen. Renders the inside of one white card.
 */
export function QuizPanel({
  quiz,
  pageLabel,
  start = 'intro',
  onBack,
  backHref,
}: {
  quiz: LearnerQuiz;
  /** e.g. "หน้า 3/3" on the intro */
  pageLabel?: string;
  start?: 'intro' | 'quiz';
  /** intro กลับ inside a lesson */
  onBack?: () => void;
  /** intro กลับ on the standalone quiz page */
  backHref?: string;
}) {
  const [step, setStep] = useState(start);
  const exhausted = quiz.attemptsLeft === 0;
  const used = quiz.maxAttempts !== null && quiz.attemptsLeft !== null ? quiz.maxAttempts - quiz.attemptsLeft : null;

  if (step === 'quiz' && !exhausted) {
    return (
      <QuizForm
        lessonId={quiz.lessonId}
        questions={quiz.questions}
        title={quiz.title}
        onBack={() => setStep('intro')}
      />
    );
  }

  return (
    <div className="lv-quiz-intro">
      <div className="lv-meta">
        {pageLabel ? <span className="lv-chip">{pageLabel}</span> : null}
        <span className="lv-chip pass">เกณฑ์คะแนนผ่าน {quiz.passScore}%</span>
        <span className="lv-badge">กำลังเรียน</span>
      </div>
      <hr />
      <p className="lv-kicker">แบบทดสอบ บทที่ {quiz.lessonNo}</p>
      <h1 className="lv-title sm">{quiz.title}</h1>
      <p className="lv-summary">ทำแบบทดสอบให้ผ่านเกณฑ์เพื่อปลดล็อกบทถัดไป</p>
      <p className="lv-attempts" data-testid="quiz-attempts">
        {quiz.maxAttempts === null
          ? 'ทำแบบทดสอบได้ไม่จำกัดจำนวนครั้ง'
          : quiz.attemptsLeft === null
            ? 'ผ่านแล้ว ทำซ้ำได้ไม่จำกัดจำนวนครั้ง'
            : `จำนวนครั้งที่สามารถทำแบบทดสอบได้ ${used}/${quiz.maxAttempts} ครั้ง`}
      </p>
      {exhausted && quiz.retryAt ? (
        <div data-testid="quiz-exhausted">
          <RetryCountdown until={quiz.retryAt} />
        </div>
      ) : null}
      <div className="lv-actions center">
        {onBack ? (
          <button type="button" className="lv-pill slate" onClick={onBack}>
            กลับ
          </button>
        ) : backHref ? (
          <Link href={backHref} className="lv-pill slate">
            กลับ
          </Link>
        ) : null}
        <button type="button" className="lv-pill amber" onClick={() => setStep('quiz')} disabled={exhausted} data-testid="quiz-start">
          ทำแบบทดสอบ
        </button>
      </div>
    </div>
  );
}
