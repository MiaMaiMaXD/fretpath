import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LessonForm } from '@/components/admin/LessonForm';
import { PublishPanel } from '@/components/admin/PublishPanel';
import { QuestionsSection } from '@/components/admin/QuestionEditor';
import { getAdminLesson, getAdminQuestions } from '@/lib/data/admin-lessons';

export const metadata = { title: 'แก้ไขบทเรียน' };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const lesson = await getAdminLesson(id);
  if (!lesson) notFound();
  const questions = await getAdminQuestions(id);
  return (
    <main className="space-y-6">
      <Link href={`/admin/lessons?course=${lesson.courseId}`} className="underline underline-offset-4">
        กลับไปรายการบทเรียน
      </Link>
      <h1 className="text-2xl font-bold">แก้ไขบทเรียน</h1>
      <Link href={`/admin/lessons/${lesson.id}/preview`} className="inline-block underline underline-offset-4">
        ดูตัวอย่าง
      </Link>
      <PublishPanel
        lessonId={lesson.id}
        courseId={lesson.courseId}
        status={lesson.status}
        questionIds={lesson.questionIds}
      />
      <LessonForm
        mode={{ kind: 'edit', lessonId: lesson.id }}
        initial={{
          title: lesson.title,
          slug: lesson.slug,
          summary: lesson.summary,
          contentMd: lesson.contentMd,
          videoUrl: lesson.videoUrl,
          passScore: String(lesson.passScore),
        }}
      />
      <QuestionsSection lessonId={lesson.id} questions={questions} />
    </main>
  );
}
