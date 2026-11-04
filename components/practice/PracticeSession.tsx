'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useAudioSupported } from '@/components/StringPlayer';
import { BEATS_PER_BAR, beatIntervalMs, clampBpm, scheduleClicks } from '@/lib/audio/metronome';
import { getAudioContext } from '@/lib/audio/strings';

/* ------------------------------------------------------------------ timer store
   Lives outside React so it survives page changes, and is mirrored to localStorage so it also
   survives a refresh or a closed tab. Elapsed time is always derived from timestamps. */

type TimerState = { startedAt: number | null; accumulatedMs: number };

const KEY = 'fp.practice.timer';
const EMPTY: TimerState = { startedAt: null, accumulatedMs: 0 };
let timer: TimerState | null = null;
const listeners = new Set<() => void>();

function load(): TimerState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const v = JSON.parse(raw) as Partial<TimerState>;
    const startedAt = typeof v.startedAt === 'number' && v.startedAt <= Date.now() ? v.startedAt : null;
    const accumulatedMs = typeof v.accumulatedMs === 'number' && v.accumulatedMs >= 0 ? v.accumulatedMs : 0;
    return { startedAt, accumulatedMs };
  } catch {
    return EMPTY; // storage blocked or corrupt: behave like a fresh timer
  }
}

function getTimer(): TimerState {
  if (timer === null) timer = load();
  return timer;
}

function setTimer(next: TimerState) {
  timer = next;
  try {
    if (next.startedAt === null && next.accumulatedMs === 0) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage unavailable: the timer still works for this page visit
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // keep two open tabs in step
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    timer = load();
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export const timerActions = {
  start() {
    const t = getTimer();
    if (t.startedAt === null) setTimer({ ...t, startedAt: Date.now() });
  },
  pause() {
    const t = getTimer();
    if (t.startedAt !== null) setTimer({ startedAt: null, accumulatedMs: t.accumulatedMs + Date.now() - t.startedAt });
  },
  reset() {
    setTimer(EMPTY);
  },
  resetIfPaused() {
    const t = getTimer();
    if (t.startedAt === null && t.accumulatedMs > 0) setTimer(EMPTY);
  },
};

/** Current timer state; re-renders four times a second while it runs so the clock stays live. */
export function usePracticeTimer() {
  const t = useSyncExternalStore(subscribe, getTimer, () => EMPTY);
  const [, setTick] = useState(0);
  useEffect(() => {
    if (t.startedAt === null) return;
    const id = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [t.startedAt]);
  // eslint-disable-next-line react-hooks/purity
  const elapsed = t.accumulatedMs + (t.startedAt === null ? 0 : Date.now() - t.startedAt);
  return { running: t.startedAt !== null, elapsed, ...timerActions };
}

export function formatClock(ms: number): [string, string] {
  const total = Math.floor(ms / 1000);
  return [String(Math.floor(total / 60)).padStart(2, '0'), String(total % 60).padStart(2, '0')];
}

/* ------------------------------------------------------------------ metronome
   Owned by the learner layout, so clicks keep going while the learner opens a lesson. */

const LOOKAHEAD_MS = 100;
const TICK_MS = 25;

type Metro = {
  supported: boolean;
  bpm: number;
  setBpm: (n: number) => number;
  running: boolean;
  beat: number;
  start: () => void;
  stop: () => void;
};

const MetroContext = createContext<Metro | null>(null);

export function useMetronome(): Metro {
  const m = useContext(MetroContext);
  if (!m) throw new Error('useMetronome must be used inside <PracticeSessionProvider>');
  return m;
}

export function PracticeSessionProvider({ children }: { children: React.ReactNode }) {
  const supported = useAudioSupported();
  const [bpm, setBpmState] = useState(80);
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(-1);
  const bpmRef = useRef(bpm);
  const pumpId = useRef<ReturnType<typeof setInterval> | null>(null);
  const lights = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stop = useCallback(() => {
    if (pumpId.current !== null) clearInterval(pumpId.current);
    pumpId.current = null;
    lights.current.forEach(clearTimeout);
    lights.current = [];
    setRunning(false);
    setBeat(-1);
  }, []);

  useEffect(() => stop, [stop]);

  const setBpm = useCallback((n: number) => {
    const v = clampBpm(n);
    bpmRef.current = v;
    setBpmState(v);
    return v;
  }, []);

  // Click timing comes from the AudioContext clock; the 25 ms interval only schedules the next 100 ms of clicks.
  const start = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx || pumpId.current !== null) return;
    let nextTime = ctx.currentTime + 0.05;
    let next = 0;
    const pump = () => {
      // after a throttled/backgrounded tab, skip missed beats instead of firing them all at once
      if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
      const horizon = ctx.currentTime + LOOKAHEAD_MS / 1000;
      while (nextTime < horizon) {
        scheduleClicks(ctx, bpmRef.current, nextTime, 1, next);
        // Light the beat indicator when the click actually sounds (visual only, so setTimeout precision is fine).
        const b = next;
        const t = setTimeout(() => setBeat(b), Math.max(0, (nextTime - ctx.currentTime) * 1000));
        lights.current = [...lights.current.slice(-8), t];
        nextTime += beatIntervalMs(bpmRef.current) / 1000;
        next = (next + 1) % BEATS_PER_BAR;
      }
    };
    pump();
    pumpId.current = setInterval(pump, TICK_MS);
    setRunning(true);
  }, []);

  const value = useMemo(() => ({ supported, bpm, setBpm, running, beat, start, stop }), [supported, bpm, setBpm, running, beat, start, stop]);
  return <MetroContext.Provider value={value}>{children}</MetroContext.Provider>;
}
