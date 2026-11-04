import { FRET_COUNT, INLAYS, unitsFor, type FretSlot } from '@/lib/path-frets';
import { NeckScroll } from './NeckScroll';
import { STATE_LABEL } from './LessonRow';

/** The course as a guitar neck: one fret per lesson; each fret jumps to its lesson in the list below. */
export function FretNeck({ slots, currentId }: { slots: FretSlot[]; currentId: string | null }) {
  const frets = Math.max(FRET_COUNT, slots.length);
  const cols = { gridTemplateColumns: `56px repeat(${frets - 1}, minmax(44px, 1fr))` };
  const current = slots.findIndex((s) => s.lesson?.id === currentId);
  const units = unitsFor(frets);
  return (
    <nav className="neck-wrap" aria-label="คอกีตาร์ กดเฟรตเพื่อไปที่บทเรียน">
      <NeckScroll>
        <div className="neck" style={cols} data-testid="fret-neck">
          {Array.from({ length: frets }, (_, i) => {
            const slot = slots[i];
            const l = slot?.lesson;
            const kind = l ? (l.id === currentId ? 'now' : l.state) : slot ? 'soon' : 'empty';
            const inner = (
              <>
                <span className="no" aria-hidden="true">
                  {i}
                </span>
                <span className="stone" aria-hidden="true" />
                {INLAYS.has(i) ? (
                  <span className="inlay" aria-hidden="true">
                    <i />
                    {i === 12 ? <i /> : null}
                  </span>
                ) : null}
              </>
            );
            const cls = `fret${i === 0 ? ' nut' : ''} ${kind}`;
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
                aria-label={`เฟรต ${i}: ${title} (${status})`}
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
