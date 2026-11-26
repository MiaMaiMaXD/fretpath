'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

/**
 * Full-screen mode for the practice stage. The `full` class alone covers the viewport, so it also works where
 * elements cannot go full screen (iPhone Safari); elsewhere the browser's own full screen is used on top of it.
 */
export function useStageFullscreen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [full, setFull] = useState(false);
  // The browser's full-screen request still in flight; exiting before it settles would let it land afterwards
  // and flip the stage back to full screen.
  const pending = useRef<Promise<void> | null>(null);

  useLayoutEffect(() => {
    const onChange = () => setFull(document.fullscreenElement !== null && document.fullscreenElement === ref.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useLayoutEffect(() => {
    if (!full) return;
    // Everything behind the stage is hidden: keep it out of the tab order and stop the page scrolling.
    const hidden: HTMLElement[] = [];
    for (let el: HTMLElement | null = ref.current; el && el !== document.body; el = el.parentElement) {
      for (const sib of el.parentElement?.children ?? []) {
        if (sib !== el && sib instanceof HTMLElement && !sib.inert) {
          sib.inert = true;
          hidden.push(sib);
        }
      }
    }
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void exit();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      for (const el of hidden) el.inert = false;
      root.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [full]);

  async function enter() {
    setFull(true);
    // refused by the browser: the viewport-covering layout is enough
    const req = (ref.current?.requestFullscreen?.() ?? Promise.resolve()).catch(() => {});
    pending.current = req;
    await req;
    if (pending.current === req) pending.current = null;
  }

  /** Resolves once the page behind is usable again, so callers can scroll to and focus something in it. */
  async function exit() {
    if (pending.current) await pending.current;
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    flushSync(() => setFull(false));
  }

  return { ref, full, enter, exit };
}
