import { FRET_COUNT, INLAYS, unitsFor } from '@/lib/path-frets';
import type { PathLesson } from '@/lib/path-state';
import { NeckScroll } from './NeckScroll';
import { STATE_LABEL } from './LessonRow';

/** The course as a guitar neck: one fret per lesson; each fret jumps to its lesson in the list below. */
export function FretNeck({ lessons, currentId }: { lessons: PathLesson[]; currentId: string | null }) {
  const frets = Math.max(FRET_COUNT, lessons.length);
  const cols = { gridTemplateColumns: `56px repeat(${frets - 1}, minmax(44px, 1fr))` };
  const current = lessons.findIndex((l) => l.id === currentId);
  const units = unitsFor(lessons.length);
  return (
    <nav className="neck-wrap" aria-label="คอกีตาร์ กดเฟรตเพื่อไปที่บทเรียน">
      <NeckScroll>
        <div className="neck" style={cols} data-testid="fret-neck">
          {Array.from({ length: frets }, (_, i) => {
            const l = lessons[i];
            const cls = `fret${i === 0 ? ' nut' : ''} ${l ? (l.id === currentId ? 'now' : l.state) : 'empty'}`;
            const inlay = INLAYS.has(i) ? (
              <span className="inlay" aria-hidden="true">
                <i />
                {i === 12 ? <i /> : null}
              </span>
            ) : null;
            const inner = (
              <>
                <span className="no" aria-hidden="true">
                  {i}
                </span>
                <span className="stone" aria-hidden="true" />
                {inlay}
              </>
            );
            return l ? (
              <a
                key={i}
                href={`#fret-${i}`}
                className={cls}
                aria-current={l.id === currentId ? 'step' : undefined}
                aria-label={`เฟรต ${i}: ${l.title} (${STATE_LABEL[l.state]})`}
              >
                {inner}
              </a>
            ) : (
              <span key={i} className={cls} aria-hidden="true">
                {inner}
              </span>
            );
          })}
        </div>
        <div className="units-bar" style={cols} aria-hidden="true">
          {units.map((u) => (
            <span
              key={u.from}
              className={current >= u.from && current <= u.to ? 'on' : undefined}
              style={{ gridColumn: `${u.from + 1} / span ${u.to - u.from + 1}` }}
            >
              {u.name}
            </span>
          ))}
        </div>
      </NeckScroll>
    </nav>
  );
}
