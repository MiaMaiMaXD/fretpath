import Link from 'next/link';
import { BarChart } from '@/components/BarChart';
import { StatCard } from '@/components/StatCard';
import { bangkokLastDays, bangkokWeekRange } from '@/lib/bangkok';
import { getDashboard } from '@/lib/data/dashboard';
import { activityLabel } from '@/lib/practice-activities';
import { averageBestScore, dailyMinutes, lessonsProgress, nextLesson, weeklyMinutes } from '@/lib/stats';

const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
function thaiShort(ymd: string): string {
  return `${Number(ymd.slice(8, 10))} ${MONTHS[Number(ymd.slice(5, 7)) - 1]}`;
}

export default async function DashboardPage() {
  const data = await getDashboard();
  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p>ยังไม่ได้ลงทะเบียนเรียนคอร์สใด</p>
      </div>
    );
  }
  const { lessons, profile, recentLogs, weekLogs } = data;
  const progress = lessonsProgress(lessons);
  const avg = averageBestScore(lessons);
  const week = weeklyMinutes(weekLogs, bangkokWeekRange());
  const goal = profile.weeklyGoalMinutes;
  const weekText = goal > 0 ? `${week} / ${goal} นาที` : `${week} นาที (ยังไม่ตั้งเป้าหมาย)`;
  const next = nextLesson(lessons);
  const days = dailyMinutes(weekLogs, bangkokLastDays(7)).map((d) => ({ label: thaiShort(d.date), value: d.minutes }));
  const scores = lessons.map((x) => ({ label: `บท ${x.sortOrder}`, value: x.bestScore ?? 0 }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard id="lessons" label="บทที่ผ่านแล้ว" value={`${progress.completed} / ${progress.total} บท`} />
        <StatCard id="avg-score" label="คะแนนเฉลี่ยสูงสุด" value={avg === null ? '—' : `${avg}%`} />
        <StatCard id="week-minutes" label="นาทีฝึกสัปดาห์นี้" value={weekText} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <BarChart title="นาทีฝึก 7 วันล่าสุด" bars={days} unit="นาที" />
        <BarChart title="คะแนนสูงสุดรายบท" bars={scores} unit="%" max={100} />
      </div>
      <div>
        {next ? (
          <Link
            href={`/lessons/${next.slug}`}
            className="inline-block rounded bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-800"
          >
            ไปบทถัดไป
          </Link>
        ) : (
          <p className="font-medium">จบคอร์สแล้ว</p>
        )}
      </div>
      <section>
        <h2 className="mb-2 text-lg font-semibold">ประวัติการฝึกล่าสุด</h2>
        {recentLogs.length === 0 ? (
          <p>ยังไม่มีบันทึกการฝึก</p>
        ) : (
          <ul aria-label="ประวัติการฝึกล่าสุด" className="space-y-2">
            {recentLogs.map((l) => (
              <li key={l.id} className="rounded border border-neutral-300 p-3 break-words dark:border-neutral-700">
                {thaiShort(l.practicedOn)} · {l.minutes} นาที · {activityLabel(l.activity)}
                {l.lessonTitle ? ` · ${l.lessonTitle}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
