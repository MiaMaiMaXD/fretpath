import type { Metadata } from 'next';
import Link from 'next/link';
import { PracticeForm } from '@/components/PracticeForm';
import { PracticeList } from '@/components/PracticeList';
import { bangkokToday, bangkokWeekRange } from '@/lib/bangkok';
import { getPath } from '@/lib/data/path';
import { listMyPracticeLogs, myPracticeTotals } from '@/lib/data/practice';
import { getMyProfile } from '@/lib/data/profile';
import { weeklyMinutes } from '@/lib/stats';
import './practice.css';

export const metadata: Metadata = { title: 'บันทึกการฝึก — FretPath' };

export default async function PracticePage() {
  const today = bangkokToday();
  const [path, logs, totals, profile] = await Promise.all([
    getPath(),
    listMyPracticeLogs(100),
    myPracticeTotals(),
    getMyProfile(),
  ]);
  const lessons = (path?.lessons ?? []).filter((l) => l.state !== 'locked').map((l) => ({ id: l.id, title: l.title }));
  const week = weeklyMinutes(logs, bangkokWeekRange());
  const goal = profile.weeklyGoalMinutes;
  const pct = goal > 0 ? Math.min(100, Math.round((week / goal) * 100)) : 0;

  return (
    <div className="fp-prac">
      <header className="prac-head">
        <div>
          <h1>บันทึกการฝึก</h1>
          <p>จับเวลา เคาะจังหวะ แล้วจดไว้ว่าวันนี้ได้อะไร</p>
        </div>
        <div className="week" data-testid="practice-week">
          {goal > 0 ? (
            <>
              <p>
                สัปดาห์นี้ <b>{week}</b> จาก {goal} นาที
              </p>
              <div className="week-bar" role="meter" aria-label="เป้าหมายการซ้อมสัปดาห์นี้" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(week, goal)}>
                <i style={{ width: `${pct}%` }} />
              </div>
            </>
          ) : (
            <p>
              สัปดาห์นี้ <b>{week}</b> นาที <Link href="/profile">ตั้งเป้าหมาย</Link>
            </p>
          )}
        </div>
      </header>
      <div className="prac-grid">
        <PracticeForm today={today} lessons={lessons} />
        <PracticeList logs={logs} today={today} lessons={lessons} totals={totals} />
      </div>
    </div>
  );
}
