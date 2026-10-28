// SPIKE (throwaway): standalone chord meter page for the instructor demo. Not for merge.
import type { Metadata } from 'next';
import { ChordMeter } from './ChordMeter';

export const metadata: Metadata = {
  title: 'วัดคอร์ดจากไมค์ (spike)',
  robots: { index: false, follow: false },
};

export default function ChordMeterPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">วัดคอร์ดจากไมค์</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        กด &quot;เริ่ม&quot; จับคอร์ดตามโจทย์ แล้วดีดไล่ทีละสายจากสายบน (สายหนา) ลงมา ทำในที่เงียบ ถือกีตาร์ห่างไมค์ประมาณ 30–50 ซม.
      </p>
      <ChordMeter />
    </main>
  );
}
