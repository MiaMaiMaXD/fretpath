import Link from 'next/link';
import { getAdminOverview } from '@/lib/data/admin';

export const metadata = { title: 'ภาพรวมหลังบ้าน' };

export default async function AdminOverviewPage() {
  const { courses, learnerCount } = await getAdminOverview();
  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">ภาพรวมหลังบ้าน</h1>
      <section aria-labelledby="lessons-h" className="space-y-2">
        <h2 id="lessons-h" className="text-lg font-semibold">จำนวนบทเรียน</h2>
        <ul className="space-y-2">
          {courses.map((c) => (
            <li key={c.id} className="rounded border border-neutral-300 p-3 dark:border-neutral-700">
              <span className="font-medium">{c.title}</span>{' '}
              <span>เผยแพร่ {c.published} บท</span>, <span>ฉบับร่าง {c.draft} บท</span>
            </li>
          ))}
        </ul>
        <Link href="/admin/lessons" className="underline underline-offset-4">จัดการบทเรียน</Link>
      </section>
      <section aria-labelledby="learners-h" className="space-y-2">
        <h2 id="learners-h" className="text-lg font-semibold">ผู้เรียน</h2>
        <p>ผู้เรียนทั้งหมด {learnerCount} คน</p>
        <Link href="/admin/learners" className="underline underline-offset-4">ผู้เรียน</Link>
      </section>
    </main>
  );
}
