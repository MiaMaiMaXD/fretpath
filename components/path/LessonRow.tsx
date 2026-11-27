import Link from 'next/link';
import type { PlannedLesson } from '@/lib/path-frets';
import type { LessonState, PathLesson } from '@/lib/path-state';

/** A planned lesson that has no content yet: shown so learners can see the whole course. */
export function SoonRow({ plan, fret }: { plan: PlannedLesson; fret: number }) {
  return (
    <li id={`fret-${fret}`} className="lesson-row soon" data-testid="lesson-soon">
      <div className="row-inner">
        <span className="no" aria-hidden="true">
          {fret + 1}
        </span>
        <span className="row-main">
          <span className="row-title">
            <span className="sr-only">บทที่ {fret + 1}: </span>
            {plan.title}
          </span>
          <span className="row-summary">{plan.summary}</span>
        </span>
        <span className="row-state soon">เร็ว ๆ นี้</span>
      </div>
    </li>
  );
}

export const STATE_LABEL: Record<LessonState, string> = {
  locked: 'ไม่พร้อมเข้าเรียน',
  unlocked: 'พร้อมเข้าเรียน',
  completed: 'เรียนจบแล้ว',
};

/** One lesson in the path list. Locked lessons render no link, so their content can't be opened from here. */
export function LessonRow({ lesson, fret, current }: { lesson: PathLesson; fret: number; current: boolean }) {
  const body = (
    <>
      <span className="no" aria-hidden="true">
        {fret + 1}
      </span>
      <span className="row-main">
        <span className="row-title">
          <span className="sr-only">บทที่ {fret + 1}: </span>
          {lesson.title}
        </span>
        {lesson.summary ? <span className="row-summary">{lesson.summary}</span> : null}
      </span>
      <span className="row-side">
        <span className={`row-state ${lesson.state}`}>{STATE_LABEL[lesson.state]}</span>
        {lesson.bestScore !== null ? <span className="row-score">คะแนนสอบ: {lesson.bestScore}%</span> : null}
      </span>
    </>
  );
  return (
    <li
      id={`fret-${fret}`}
      className={`lesson-row ${current ? 'now' : lesson.state}`}
      data-testid={`lesson-card-${lesson.slug}`}
      data-state={lesson.state}
    >
      {lesson.state === 'locked' ? (
        <div className="row-inner">{body}</div>
      ) : (
        <Link href={`/lessons/${lesson.slug}`} className="row-inner">
          {body}
        </Link>
      )}
    </li>
  );
}
