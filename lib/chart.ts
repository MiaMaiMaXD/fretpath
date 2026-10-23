/** A chart bar; `value` null means "no data" (e.g. a lesson not attempted yet), which is not the same as 0. */
export type Bar = { label: string; value: number | null };

/** Accessible text for a bar chart. Missing values read as `emptyLabel` so they are not mistaken for 0. */
export function chartSummary(title: string, bars: Bar[], unit: string, emptyLabel = 'ไม่มีข้อมูล'): string {
  return `${title}: ${bars.map((b) => (b.value === null ? `${b.label} ${emptyLabel}` : `${b.label} ${b.value} ${unit}`)).join(', ')}`;
}

/** `max` fixes the scale (e.g. 100); otherwise scales to the largest value present. */
export function chartScale(bars: Bar[], max?: number): number {
  return max ?? Math.max(...bars.map((b) => b.value ?? 0), 0);
}
