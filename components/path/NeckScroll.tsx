'use client';

import { useEffect, useRef } from 'react';

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
    <div className="neck-scroll" ref={ref}>
      {children}
    </div>
  );
}
