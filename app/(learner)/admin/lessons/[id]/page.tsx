import { notFound } from 'next/navigation';
import { LessonEditor } from '@/components/admin/LessonEditor';
import { getAdminLessonEditor } from '@/lib/data/admin-lessons';
import '../../admin.css';
import './editor.css';

export const metadata = { title: 'แก้ไขบทเรียน' };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Lesson editor (2026-11 design): lesson info + an ordered list of pages (text / video / quiz). */
export default async function EditLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const lesson = await getAdminLessonEditor(id); // requireAdmin() inside
  if (!lesson) notFound();
  return (
    <main className="fp-lm">
      <LessonEditor
        key={lesson.id}
        lessonId={lesson.id}
        courseId={lesson.courseId}
        no={lesson.no}
        status={lesson.status}
        live={{
          info: { title: lesson.title, summary: lesson.summary, chords: lesson.chords },
          pages: lesson.pages,
          quiz: { passScore: String(lesson.passScore), maxAttempts: lesson.maxAttempts === null ? '' : String(lesson.maxAttempts) },
          questions: lesson.questions,
        }}
        draft={lesson.draft}
      />
    </main>
  );
}
