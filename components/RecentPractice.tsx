import Link from 'next/link';
import type { PracticeLog } from '@/lib/data/practice';
import { activityLabel, feelingLabel, practiceDayLabel, practiceTitle } from '@/lib/practice-activities';

/** Sidebar on /practice: the five latest sessions at a glance; managing them happens on /practice/history. */
export function RecentPractice({ logs, today, total }: { logs: PracticeLog[]; today: string; total: number }) {
  return (
    <aside className="recent" aria-labelledby="recent-title">
      <h2 id="recent-title">ซ้อมล่าสุด</h2>
      {logs.length === 0 ? (
        <p className="recent-empty" data-testid="practice-empty">
          ยังไม่มีบันทึก
        </p>
      ) : (
        <ul>
          {logs.map((l) => {
            const feeling = feelingLabel(l.feeling);
            return (
              <li key={l.id}>
                <time dateTime={l.practicedOn} className="r-date">
                  {practiceDayLabel(l.practicedOn, today, false)}
                </time>
                <div className="r-body">
                  <h3>{practiceTitle(l)}</h3>
                  <p className="r-meta">
                    <span className="r-cat">{activityLabel(l.activity)}</span>
                    {feeling ? <span className={`feel tone-${l.feeling}`}>{feeling}</span> : null}
                  </p>
                </div>
                <p className="r-mins">
                  <b>{l.minutes}</b> นาที
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {total > 0 ? (
        <Link href="/practice/history" className="r-all">
          ดูประวัติทั้งหมด ค้นหา และแก้ไข ({total} ครั้ง)
        </Link>
      ) : null}
    </aside>
  );
}
