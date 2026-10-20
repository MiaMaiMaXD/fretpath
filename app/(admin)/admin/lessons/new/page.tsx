import Link from 'next/link';
import { LessonForm } from '@/components/admin/LessonForm';
import { getAdminCourses } from '@/lib/data/admin-lessons';

export const metadata = { title: 'เพิ่มบทเรียน' };

export default async function NewLessonPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { course } = await searchParams;
  const courses = await getAdminCourses();
  const current = courses.find((c) => c.id === course) ?? courses[0];
  if (!current) return <main><p>ยังไม่มีคอร์ส</p></main>;
  return (
    <main className="space-y-4">
      <Link href={`/admin/lessons?course=${current.id}`} className="underline underline-offset-4">
        กลับไปรายการบทเรียน
      </Link>
      <h1 className="text-2xl font-bold">เพิ่มบทเรียน</h1>
      <p>คอร์ส: {current.title}</p>
      <LessonForm
        mode={{ kind: 'create', courseId: current.id }}
        initial={{ title: '', slug: '', summary: '', contentMd: '', videoUrl: '', passScore: '60' }}
      />
    </main>
  );
}
