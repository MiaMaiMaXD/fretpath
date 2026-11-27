import { sanitizeLessonHtml } from '@/lib/html';

/** A text page written in the rich-text editor; sanitized again here so only formatting reaches the page. */
export function LessonHtml({ html }: { html: string }) {
  return (
    <div
      className="lesson-html flex flex-col gap-3 break-words [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 [&_a]:underline [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded"
      // sanitized allowlist HTML (lib/html.ts)
      dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(html) }}
    />
  );
}
