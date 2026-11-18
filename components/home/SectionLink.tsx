'use client';

/**
 * In-page link to a home section that scrolls there without putting "#section" in the address bar (the URL stays /).
 * The href stays as a fallback before the page's JavaScript has loaded; modified clicks (new tab etc.) behave normally.
 */
export function SectionLink({
  to,
  className,
  testId,
  children,
}: {
  /** id of the target section */
  to: string;
  className?: string;
  testId?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={`#${to}`}
      className={className}
      data-testid={testId}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const section = document.getElementById(to);
        if (!section) return;
        e.preventDefault();
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        section.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
        // keyboard and screen-reader users land on the section heading too
        section.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
      }}
    >
      {children}
    </a>
  );
}
