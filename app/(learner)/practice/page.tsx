import { Metronome } from '@/components/Metronome';
import { PracticeForm } from '@/components/PracticeForm';
import { PracticeList } from '@/components/PracticeList';
import { bangkokToday } from '@/lib/bangkok';
import { getPath } from '@/lib/data/path';
import { listMyPracticeLogs } from '@/lib/data/practice';

export default async function PracticePage() {
  const today = bangkokToday();
  const [path, logs] = await Promise.all([getPath(), listMyPracticeLogs()]);
  const lessons = (path?.lessons ?? []).filter((l) => l.state !== 'locked').map((l) => ({ id: l.id, title: l.title }));
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">บันทึกการฝึก</h1>
      <Metronome />
      <PracticeForm today={today} lessons={lessons} />
      <section aria-labelledby="history" className="flex flex-col gap-3">
        <h2 id="history" className="text-xl font-semibold">
          ประวัติการฝึก
        </h2>
        <PracticeList logs={logs} today={today} lessons={lessons} />
      </section>
    </div>
  );
}
