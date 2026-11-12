import type { Metadata } from 'next';
import Link from 'next/link';
import { PracticeForm } from '@/components/PracticeForm';
import { RecentPractice } from '@/components/RecentPractice';
import { bangkokToday, bangkokWeekRange } from '@/lib/bangkok';
import { getPath } from '@/lib/data/path';
import { listMyPracticeLogs, myPracticeTotals } from '@/lib/data/practice';
import { getMyProfile } from '@/lib/data/profile';
import { weeklyMinutes } from '@/lib/stats';
import './practice.css';

export const metadata: Metadata = { title: 'บันทึกการฝึก — FretPath' };

export default async function PracticePage() {
  const today = bangkokToday();
  const range = bangkokWeekRange();
  const [path, logs, totals, profile] = await Promise.all([
    getPath(),
    listMyPracticeLogs(100),
    myPracticeTotals(),
    getMyProfile(),
  ]);
  const lessons = (path?.lessons ?? []).filter((l) => l.state !== 'locked').map((l) => ({ id: l.id, title: l.title }));
  const week = weeklyMinutes(logs, range);
  const goal = profile.weeklyGoalMinutes;

  const weekNode =
    goal > 0 ? (
      <>
        <p data-testid="practice-week">
          สัปดาห์นี้ซ้อมไป <b>{week}</b> จากเป้า {goal} นาที
        </p>
        <div className="week-bar" role="meter" aria-label="เป้าหมายการซ้อมสัปดาห์นี้" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(week, goal)}>
          <i style={{ width: `${Math.min(100, Math.round((week / goal) * 100))}%` }} />
        </div>
      </>
    ) : (
      <p data-testid="practice-week">
        สัปดาห์นี้ซ้อมไป <b>{week}</b> นาที <Link href="/profile#goal">ตั้งเป้าหมาย</Link>
      </p>
    );

  return (
    <div className="fp-prac">
      <h1 className="sr-only">บันทึกการฝึก</h1>
      <div className="room">
        <PracticeForm today={today} lessons={lessons} week={weekNode} />
        <RecentPractice logs={logs.slice(0, 5)} today={today} total={totals.sessions} />
      </div>
    </div>
  );
}
