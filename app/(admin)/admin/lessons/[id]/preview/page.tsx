import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChordLab } from '@/components/ChordLab';
import { LessonMarkdown } from '@/components/LessonMarkdown';
import { StringPlayer } from '@/components/StringPlayer';
import { YouTubeEmbed } from '@/components/YouTubeEmbed';
import { requireAdmin } from '@/lib/data/admin';
import { getAdminLesson, getAdminLessonSortOrder, getAdminQuestions } from '@/lib/data/admin-lessons';

export const metadata = { title: 'ตัวอย่างบทเรียน' };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function LessonPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const lesson = await getAdminLesson(id);
  if (!lesson) notFound();
  const [questions, sortOrder] = await Promise.all([getAdminQuestions(id), getAdminLessonSortOrder(id)]);
  return (
    <main className="space-y-4">
      <p role="note" className="rounded border border-amber-600 bg-amber-50 p-3 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
        ตัวอย่างสำหรับผู้ดูแล — ผู้เรียนยังไม่เห็นถ้าเป็นฉบับร่าง
      </p>
      <Link href={`/admin/lessons/${lesson.id}`} className="underline underline-offset-4">
        กลับไปแก้ไขบทเรียน
      </Link>
      <article className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold break-words">{lesson.title}</h1>
        {lesson.videoUrl ? <YouTubeEmbed url={lesson.videoUrl} title={lesson.title} /> : null}
        <LessonMarkdown source={lesson.contentMd} />
        <StringPlayer />
        {sortOrder >= 2 && sortOrder <= 5 ? <ChordLab /> : null}
        <section aria-labelledby="preview-questions" className="space-y-3">
          <h2 id="preview-questions" className="text-xl font-semibold">
            แบบทดสอบ
          </h2>
          {questions.length === 0 ? <p>ยังไม่มีคำถาม</p> : null}
          <ol className="space-y-4">
            {questions.map((q) => (
              <li key={q.id} className="space-y-1">
                <p className="font-medium">{q.prompt}</p>
                <ul className="list-disc space-y-1 pl-6">
                  {q.choices.map((c, i) => (
                    <li key={q.choiceIds[i]}>{c}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>
      </article>
    </main>
  );
}
