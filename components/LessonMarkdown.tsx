import ReactMarkdown from 'react-markdown';

export function LessonMarkdown({ source }: { source: string }) {
  return (
    <div className="flex flex-col gap-3 break-words [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 [&_a]:underline [&_img]:h-auto [&_img]:max-w-full">
      <ReactMarkdown
        skipHtml
        components={{
          // the page title is the only h1
          h1: ({ children }) => <h2>{children}</h2>,
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={typeof src === 'string' ? src : undefined} alt={alt ?? ''} />
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
