import type { Metadata } from 'next';
import { PracticeForm } from '@/components/PracticeForm';
import { PracticeList } from '@/components/PracticeList';
import { bangkokToday } from '@/lib/bangkok';
import { getPath } from '@/lib/data/path';
import { listMyPracticeLogs, myPracticeTotals } from '@/lib/data/practice';
import './practice.css';

export const metadata: Metadata = { title: 'บันทึกการฝึก — FretPath' };

export default async function PracticePage() {
  const today = bangkokToday();
  const [path, logs, totals] = await Promise.all([getPath(), listMyPracticeLogs(100), myPracticeTotals()]);
  const lessons = (path?.lessons ?? []).filter((l) => l.state !== 'locked').map((l) => ({ id: l.id, title: l.title }));
  return (
    <div className="fp-prac">
      <header className="prac-head">
        <h1>บันทึกการฝึก</h1>
        <p>จับเวลา เปิดเมโทรนอม แล้วจดสิ่งที่ซ้อมไว้ ย้อนกลับมาดูพัฒนาการของตัวเองได้ทุกเมื่อ</p>
      </header>
      <div className="prac-grid">
        <div className="prac-left">
          <PracticeForm today={today} lessons={lessons} />
        </div>
        <PracticeList logs={logs} today={today} lessons={lessons} totals={totals} />
      </div>
    </div>
  );
}
