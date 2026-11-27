const TZ = 'Asia/Bangkok';
const DAY_MS = 86_400_000;
const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today's date in Thai time as YYYY-MM-DD. */
export function bangkokToday(now: Date = new Date()): string {
  return fmt.format(now);
}

function shift(ymd: string, days: number): string {
  const t = Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10)) + days * DAY_MS;
  return new Date(t).toISOString().slice(0, 10);
}

/** Monday..Sunday (YYYY-MM-DD) of the Thai week containing today. */
export function bangkokWeekRange(now: Date = new Date()): { start: string; end: string } {
  const today = bangkokToday(now);
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const start = shift(today, -((dow + 6) % 7));
  return { start, end: shift(start, 6) };
}

/** Last n Thai days, oldest to newest, ending today. */
export function bangkokLastDays(n: number, now: Date = new Date()): string[] {
  const today = bangkokToday(now);
  return Array.from({ length: n }, (_, i) => shift(today, i - (n - 1)));
}

/** "23 ชั่วโมง 59 นาที" until `until` (at least 1 minute while it is still in the future). */
export function timeUntil(until: Date, now: Date = new Date()): string {
  const mins = Math.max(1, Math.floor((until.getTime() - now.getTime()) / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h} ชั่วโมง ${m} นาที` : `${m} นาที`;
}
