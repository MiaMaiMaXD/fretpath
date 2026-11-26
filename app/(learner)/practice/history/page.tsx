import type { Metadata } from 'next';
import { PracticeList } from '@/components/PracticeList';
import { bangkokToday } from '@/lib/bangkok';
import { getPath } from '@/lib/data/path';
import { listMyPracticeLogs, myPracticeTotals } from '@/lib/data/practice';
import { layoutPath, lessonNumbers } from '@/lib/path-frets';
import './history.css';

export const metadata: Metadata = { title: 'ประวัติการฝึกซ้อม — FretPath' };

export default async function PracticeHistoryPage() {
  const today = bangkokToday();
  const [path, logs, totals] = await Promise.all([getPath(), listMyPracticeLogs(200), myPracticeTotals()]);
  const all = path?.lessons ?? [];
  const lessons = all.filter((l) => l.state !== 'locked').map((l) => ({ id: l.id, title: l.title }));
  const lessonNo = path ? lessonNumbers(layoutPath(path.course.slug, all)) : {};
  return (
    <div className="fp-hist">
      <h1>ประวัติการฝึกซ้อม</h1>
      <PracticeList logs={logs} today={today} lessons={lessons} lessonNo={lessonNo} totals={totals} />
    </div>
  );
}
