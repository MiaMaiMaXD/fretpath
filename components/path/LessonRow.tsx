import Link from 'next/link';
import type { LessonState, PathLesson } from '@/lib/path-state';

export const STATE_LABEL: Record<LessonState, string> = { locked: 'ล็อก', unlocked: 'เรียนได้', completed: 'จบแล้ว' };

/** One lesson in the path list. Locked lessons render no link, so their content can't be opened from here. */
export function LessonRow({ lesson, fret, current }: { lesson: PathLesson; fret: number; current: boolean }) {
  const score =
    lesson.bestScore === null ? `เกณฑ์ผ่าน ${lesson.passScore}%` : `คะแนนสูงสุด ${lesson.bestScore}% · เกณฑ์ผ่าน ${lesson.passScore}%`;
  const body = (
    <>
      <span className="no" aria-hidden="true">
        {fret}
      </span>
      <span className="row-main">
        <span className="row-title">
          <span className="sr-only">เฟรต {fret}: </span>
          {lesson.title}
        </span>
        {lesson.summary ? <span className="row-summary">{lesson.summary}</span> : null}
        <span className="row-score">{score}</span>
      </span>
      <span className={`row-state ${lesson.state}`}>{STATE_LABEL[lesson.state]}</span>
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
