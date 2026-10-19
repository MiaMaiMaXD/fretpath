import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { LessonMarkdown } from '@/components/LessonMarkdown';
import { YouTubeEmbed } from '@/components/YouTubeEmbed';
import { getLessonForLearner } from '@/lib/data/lesson';

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getLessonForLearner(slug);
  if (result.status === 'locked') redirect('/path?locked=' + encodeURIComponent(slug));
  if (result.status === 'not_found') notFound();
  const { lesson, contentMd, videoUrl } = result;
  return (
    <article className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold break-words">{lesson.title}</h1>
      {videoUrl ? <YouTubeEmbed url={videoUrl} title={lesson.title} /> : null}
      <LessonMarkdown source={contentMd} />
      <Link href={`/lessons/${lesson.slug}/quiz`} className="self-start rounded border px-4 py-2 font-medium">
        ทำแบบทดสอบ
      </Link>
    </article>
  );
}
