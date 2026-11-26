import { FRET_COUNT, INLAYS, unitsFor, type FretSlot } from '@/lib/path-frets';
import { NeckScroll } from './NeckScroll';
import { STATE_LABEL } from './LessonRow';

/**
 * The course as a guitar neck: lesson N sits on fret N (fret 1 is the first one after the nut), so the
 * numbers and inlay dots match a real guitar. Each fret jumps to its lesson in the list below.
 */
export function FretNeck({ slots, currentId }: { slots: FretSlot[]; currentId: string | null }) {
  const frets = Math.max(FRET_COUNT, slots.length);
  // first column: the headstock end, closed by the nut; then one column per fret
  const cols = { gridTemplateColumns: `28px repeat(${frets}, minmax(44px, 1fr))` };
  const current = slots.findIndex((s) => s.lesson?.id === currentId);
  const units = unitsFor(frets);
  return (
    <nav className="neck-wrap" aria-label="คอกีตาร์ กดเลขบทเพื่อไปที่บทเรียน">
      <NeckScroll>
        <div className="neck" style={cols} data-testid="fret-neck">
          <span className="nut" aria-hidden="true" />
          {Array.from({ length: frets }, (_, i) => {
            const slot = slots[i];
            const fret = i + 1;
            const l = slot?.lesson;
            const kind = l ? (l.id === currentId ? 'now' : l.state) : slot ? 'soon' : 'empty';
            const inner = (
              <>
                <span className="no" aria-hidden="true">
                  {fret}
                </span>
                <span className="stone" aria-hidden="true" />
                {INLAYS.has(fret) ? (
                  <span className="inlay" aria-hidden="true">
                    <i />
                    {fret === 12 ? <i /> : null}
                  </span>
                ) : null}
              </>
            );
            const cls = `fret ${kind}`;
            if (!slot) {
              return (
                <span key={i} className={cls} aria-hidden="true">
                  {inner}
                </span>
              );
            }
            const title = l ? l.title : slot.plan!.title;
            const status = l ? STATE_LABEL[l.state] : 'เร็ว ๆ นี้';
            return (
              <a
                key={i}
                href={`#fret-${i}`}
                className={cls}
                aria-current={l && l.id === currentId ? 'step' : undefined}
                aria-label={`บทที่ ${fret}: ${title} (${status})`}
              >
                {inner}
              </a>
            );
          })}
        </div>
        <div className="units-bar" style={cols} aria-hidden="true">
          {units.map((u) => (
            <span
              key={u.from}
              className={current >= u.from && current <= u.to ? 'on' : undefined}
              style={{ gridColumn: `${u.from + 2} / span ${u.to - u.from + 1}` }}
            >
              {u.name}
            </span>
          ))}
        </div>
      </NeckScroll>
    </nav>
  );
}
