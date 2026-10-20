import Link from 'next/link';
import type { PathLesson } from '@/lib/path-state';

const LABEL = { locked: 'ล็อก', unlocked: 'เรียนได้', completed: 'จบแล้ว' } as const;

export function LessonCard({ lesson }: { lesson: PathLesson }) {
  const body = (
    <>
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium break-words">
          {lesson.sortOrder}. {lesson.title}
        </span>
        <span className="rounded border border-neutral-400 px-2 py-0.5 text-sm">{LABEL[lesson.state]}</span>
      </span>
      {lesson.summary ? <span className="mt-1 block text-sm break-words">{lesson.summary}</span> : null}
      <span className="mt-1 block text-sm">
        เกณฑ์ผ่าน {lesson.passScore}% · คะแนนสูงสุด {lesson.bestScore === null ? '-' : `${lesson.bestScore}%`}
      </span>
    </>
  );
  const cls = 'block rounded border border-neutral-300 p-3 dark:border-neutral-700';
  return (
    <li data-testid={`lesson-card-${lesson.slug}`} data-state={lesson.state}>
      {lesson.state === 'locked' ? (
        <div className={`${cls} opacity-70`}>{body}</div>
      ) : (
        <Link href={`/lessons/${lesson.slug}`} className={`${cls} hover:bg-neutral-100 dark:hover:bg-neutral-800`}>
          {body}
        </Link>
      )}
    </li>
  );
}
