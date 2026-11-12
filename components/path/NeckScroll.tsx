'use client';

import { useEffect, useRef } from 'react';

/**
 * A fret click scrolls to its lesson row without putting "#fret-N" in the address bar (the URL stays /path).
 * The href stays as a fallback before the page's JavaScript has loaded.
 */
function jumpToRow(e: React.MouseEvent<HTMLDivElement>) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#fret-"]');
  const row = link && document.getElementById(link.getAttribute('href')!.slice(1));
  if (!row) return;
  e.preventDefault();
  row.scrollIntoView({ block: 'start' }); // smooth via the page's scroll-behavior (off for reduced motion)
  // keyboard and screen-reader users land on the lesson too
  row.querySelector<HTMLElement>('a')?.focus({ preventScroll: true });
  // brief highlight, restarted on every click
  row.classList.remove('is-flash');
  void row.offsetWidth;
  row.classList.add('is-flash');
}

/** Horizontal scroller for the neck; on narrow screens it starts with the current fret in view. */
export function NeckScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = ref.current;
    const now = box?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!box || !now || box.scrollWidth <= box.clientWidth) return;
    box.scrollLeft = now.offsetLeft - box.clientWidth / 2 + now.offsetWidth / 2;
  }, []);
  return (
    <div className="neck-scroll" ref={ref} onClick={jumpToRow}>
      {children}
    </div>
  );
}
