import type { Metadata } from 'next';
import Link from 'next/link';
import { PracticeList } from '@/components/PracticeList';
import { bangkokToday } from '@/lib/bangkok';
import { getPath } from '@/lib/data/path';
import { listMyPracticeLogs, myPracticeTotals } from '@/lib/data/practice';
import '../practice.css';

export const metadata: Metadata = { title: 'ประวัติการซ้อม — FretPath' };

export default async function PracticeHistoryPage() {
  const today = bangkokToday();
  const [path, logs, totals] = await Promise.all([getPath(), listMyPracticeLogs(200), myPracticeTotals()]);
  const lessons = (path?.lessons ?? []).filter((l) => l.state !== 'locked').map((l) => ({ id: l.id, title: l.title }));
  return (
    <div className="fp-prac">
      <header className="history-head">
        <Link href="/practice" className="back">
          ← กลับไปหน้าซ้อม
        </Link>
        <h1>ประวัติการซ้อม</h1>
      </header>
      <PracticeList logs={logs} today={today} lessons={lessons} totals={totals} />
    </div>
  );
}
