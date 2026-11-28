import { notFound, redirect } from 'next/navigation';
import { QuizPanel } from '@/components/lesson/QuizPanel';
import { getQuiz } from '@/lib/data/quiz';
import { getPath } from '@/lib/data/path';
import { layoutPath, lessonNumbers } from '@/lib/path-frets';
import '@/components/lesson/lesson-viewer.css';

/* Direct link to a lesson's quiz: straight to the quiz screen; กลับ on the intro returns to the lesson. */
export default async function QuizPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [quiz, path] = await Promise.all([getQuiz(slug), getPath()]);
  if (quiz.status === 'locked') redirect('/path?locked=' + encodeURIComponent(slug));
  if (quiz.status === 'not_found') notFound();
  const no = path ? (lessonNumbers(layoutPath(path.course.slug, path.lessons))[quiz.lessonId] ?? 0) : 0;
  return (
    <div className="lv full">
      <section className="lv-card lv-main">
        <QuizPanel
          start="quiz"
          backHref={`/lessons/${slug}`}
          quiz={{
            lessonId: quiz.lessonId,
            slug,
            lessonNo: no,
            title: `แบบทดสอบ${quiz.title}`,
            passScore: quiz.passScore,
            questions: quiz.questions,
            practical: quiz.practical,
            maxAttempts: quiz.maxAttempts,
            attemptsLeft: quiz.attemptsLeft,
            retryAt: quiz.retryAt,
          }}
        />
      </section>
    </div>
  );
}
