import Link from 'next/link';
import { ReorderList } from '@/components/admin/ReorderList';
import { getAdminCourses, getAdminLessons } from '@/lib/data/admin-lessons';

export const metadata = { title: 'จัดการบทเรียน' };

export default async function AdminLessonsPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { course } = await searchParams;
  const courses = await getAdminCourses();
  const current = courses.find((c) => c.id === course) ?? courses[0];
  const lessons = current ? await getAdminLessons(current.id) : [];

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">จัดการบทเรียน</h1>
      {courses.length > 1 ? (
        <nav aria-label="เลือกคอร์ส">
          <ul className="flex flex-wrap gap-2">
            {courses.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/lessons?course=${c.id}`}
                  aria-current={c.id === current?.id ? 'page' : undefined}
                  className={`underline-offset-4 hover:underline ${c.id === current?.id ? 'font-bold' : ''}`}
                >
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      {current ? (
        <>
          <p>
            คอร์ส: <span className="font-medium">{current.title}</span>
          </p>
          <Link
            href={`/admin/lessons/new?course=${current.id}`}
            className="inline-block rounded bg-neutral-900 px-4 py-2 font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            เพิ่มบทเรียน
          </Link>
          {lessons.length === 0 ? (
            <p>ยังไม่มีบทเรียนในคอร์สนี้</p>
          ) : (
            <ReorderList courseId={current.id} lessons={lessons} />
          )}
        </>
      ) : (
        <p>ยังไม่มีคอร์ส</p>
      )}
    </main>
  );
}
