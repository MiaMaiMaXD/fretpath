import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/* GFM is on so lesson tables (chord charts, note tables) and checklists render; wide tables scroll
   sideways inside their own box instead of widening the page on a phone. */
export function LessonMarkdown({ source }: { source: string }) {
  return (
    <div className="flex flex-col gap-3 break-words [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 [&_a]:underline [&_img]:h-auto [&_img]:max-w-full [&_table]:border-collapse [&_th]:border [&_th]:border-foreground/20 [&_th]:bg-foreground/5 [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_td]:border [&_td]:border-foreground/20 [&_td]:px-3 [&_td]:py-1.5 [&_pre]:overflow-x-auto [&_.contains-task-list]:list-none [&_.contains-task-list]:pl-1">
      <ReactMarkdown
        skipHtml
        remarkPlugins={[remarkGfm]}
        components={{
          // the page title is the only h1
          h1: ({ children }) => <h2>{children}</h2>,
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={typeof src === 'string' ? src : undefined} alt={alt ?? ''} />
          ),
          table: ({ children }) => (
            <div className="max-w-full overflow-x-auto" data-testid="lesson-table">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
