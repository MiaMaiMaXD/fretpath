import { notFound, redirect } from 'next/navigation';
import { QuizForm } from '@/components/QuizForm';
import { getQuiz } from '@/lib/data/quiz';

export default async function QuizPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const quiz = await getQuiz(slug);
  if (quiz.status === 'locked') redirect('/path?locked=' + encodeURIComponent(slug));
  if (quiz.status === 'not_found') notFound();
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold break-words">แบบทดสอบ: {quiz.title}</h1>
      <p>ต้องได้อย่างน้อย {quiz.passScore}% จึงจะผ่าน</p>
      <QuizForm lessonId={quiz.lessonId} slug={slug} questions={quiz.questions} />
    </section>
  );
}
