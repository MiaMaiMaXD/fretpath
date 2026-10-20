import { CHORDS, type ChordName } from '@/lib/audio/chords';

const X0 = 30;
const GAP = 24;
const TOP = 34;
const FRET_H = 28;
const FRETS = 4;

export function ChordDiagram({ name }: { name: ChordName }) {
  const { frets, fingers } = CHORDS[name];
  const sx = (i: number) => X0 + i * GAP;
  const height = TOP + FRETS * FRET_H + 10;
  return (
    <svg
      role="img"
      aria-label={`คอร์ด ${name}`}
      viewBox={`0 0 ${X0 * 2 + GAP * 5} ${height}`}
      className="h-auto w-full max-w-[220px]"
    >
      <line x1={sx(0)} x2={sx(5)} y1={TOP} y2={TOP} stroke="currentColor" strokeWidth={4} />
      {Array.from({ length: FRETS }, (_, k) => (
        <line
          key={k}
          x1={sx(0)}
          x2={sx(5)}
          y1={TOP + (k + 1) * FRET_H}
          y2={TOP + (k + 1) * FRET_H}
          stroke="currentColor"
        />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <line key={i} x1={sx(i)} x2={sx(i)} y1={TOP} y2={TOP + FRETS * FRET_H} stroke="currentColor" />
      ))}
      {frets.map((f, i) => {
        if (f === 'x')
          return (
            <text key={i} x={sx(i)} y={TOP - 10} textAnchor="middle" fontSize={14} fill="currentColor">
              x
            </text>
          );
        if (f === 0) return <circle key={i} cx={sx(i)} cy={TOP - 14} r={5} fill="none" stroke="currentColor" />;
        const cy = TOP + (f - 0.5) * FRET_H;
        return (
          <g key={i}>
            <circle cx={sx(i)} cy={cy} r={9} fill="currentColor" />
            {fingers[i] ? (
              <text x={sx(i)} y={cy + 4} textAnchor="middle" fontSize={11} className="fill-white dark:fill-neutral-900">
                {fingers[i]}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
