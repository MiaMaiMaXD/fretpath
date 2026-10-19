export type Bar = { label: string; value: number };

/** Inline-SVG column chart. `max` fixes the scale (e.g. 100); otherwise scales to the largest value. */
export function BarChart({ title, bars, unit, max }: { title: string; bars: Bar[]; unit: string; max?: number }) {
  const scale = max ?? Math.max(...bars.map((b) => b.value), 0);
  const H = 100;
  const W = 100 / Math.max(bars.length, 1);
  const summary = `${title}: ${bars.map((b) => `${b.label} ${b.value} ${unit}`).join(', ')}`;
  return (
    <figure className="rounded border border-neutral-300 p-3 dark:border-neutral-700">
      <figcaption className="mb-2 font-medium">{title}</figcaption>
      <svg role="img" aria-label={summary} viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="h-32 w-full">
        <line x1="0" y1={H} x2="100" y2={H} className="stroke-neutral-400" strokeWidth="0.5" />
        {bars.map((b, i) => {
          const h = scale > 0 ? (b.value / scale) * (H - 2) : 0;
          return (
            <rect
              key={i}
              x={i * W + W * 0.15}
              y={H - h}
              width={W * 0.7}
              height={h}
              className="fill-indigo-600 dark:fill-indigo-400"
            />
          );
        })}
      </svg>
      <div aria-hidden="true" className="mt-1 flex text-xs text-neutral-700 dark:text-neutral-300">
        {bars.map((b, i) => (
          <span key={i} className="flex-1 truncate text-center">
            {b.label}
          </span>
        ))}
      </div>
    </figure>
  );
}
