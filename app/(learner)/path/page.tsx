import { LessonCard } from '@/components/LessonCard';
import { getPath } from '@/lib/data/path';
import { lockedNotice } from '@/lib/path-state';

export default async function PathPage({ searchParams }: { searchParams: Promise<{ locked?: string | string[] }> }) {
  const { locked } = await searchParams;
  const path = await getPath();
  if (!path) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">เส้นทางเรียน</h1>
        <p>ยังไม่มีคอร์สที่ลงทะเบียน</p>
      </div>
    );
  }
  const slug = typeof locked === 'string' ? locked : null;
  const notice = slug ? lockedNotice(path.lessons, slug) : null;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold break-words">เส้นทางเรียน: {path.course.title}</h1>
      {notice ? <p role="alert">{notice}</p> : null}
      <ol className="flex flex-col gap-3">
        {path.lessons.map((l) => (
          <LessonCard key={l.id} lesson={l} />
        ))}
      </ol>
    </div>
  );
}
