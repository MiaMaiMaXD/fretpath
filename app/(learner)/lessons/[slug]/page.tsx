import { marked } from 'marked';
import { notFound, redirect } from 'next/navigation';
import { LessonViewer, type ViewerPage } from '@/components/lesson/LessonViewer';
import { getQuiz } from '@/lib/data/quiz';
import { getLessonForLearner } from '@/lib/data/lesson';
import { getPath } from '@/lib/data/path';
import { sanitizeLessonHtml } from '@/lib/html';
import { layoutPath, lessonNumbers } from '@/lib/path-frets';

/* A lesson one page at a time (same view as the admin preview). Text pages are sanitized here. */
export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [result, path, quiz] = await Promise.all([getLessonForLearner(slug), getPath(), getQuiz(slug)]);
  if (result.status === 'locked') redirect('/path?locked=' + encodeURIComponent(slug));
  if (result.status === 'not_found') notFound();
  const { lesson, pages, chords } = result;
  const no = path ? (lessonNumbers(layoutPath(path.course.slug, path.lessons))[lesson.id] ?? lesson.sortOrder) : lesson.sortOrder;
  const view: ViewerPage[] = pages.map((p): ViewerPage =>
    p.kind === 'text'
      ? { key: p.id, kind: 'text', title: p.title, html: sanitizeLessonHtml(p.html ?? marked.parse(p.md ?? '', { async: false, gfm: true })) }
      : p.kind === 'video'
        ? { key: p.id, kind: 'video', title: p.title, videoUrl: p.videoUrl ?? '' }
        : { key: p.id, kind: 'quiz', title: p.title },
  );
  // every lesson ends with its quiz, even if the page list has none
  if (!view.some((p) => p.kind === 'quiz')) view.push({ key: 'quiz', kind: 'quiz', title: 'แบบทดสอบท้ายบท' });
  return (
    <LessonViewer
      mode="learner"
      no={no}
      title={lesson.title}
      summary={lesson.summary ?? ''}
      passScore={lesson.passScore}
      chords={chords}
      pages={view}
      slug={lesson.slug}
      quizHref={`/lessons/${lesson.slug}/quiz`}
      quiz={
        quiz.status === 'ok'
          ? {
              lessonId: quiz.lessonId,
              slug: lesson.slug,
              lessonNo: no,
              title: view.find((p) => p.kind === 'quiz')?.title || 'แบบทดสอบท้ายบท',
              passScore: quiz.passScore,
              questions: quiz.questions,
              practical: quiz.practical,
              maxAttempts: quiz.maxAttempts,
              attemptsLeft: quiz.attemptsLeft,
            retryAt: quiz.retryAt,
            }
          : undefined
      }
    />
  );
}
