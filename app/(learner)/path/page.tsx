import type { Metadata } from 'next';
import Link from 'next/link';
import { FretNeck } from '@/components/path/FretNeck';
import { LessonRow, SoonRow } from '@/components/path/LessonRow';
import { getPath } from '@/lib/data/path';
import { layoutPath, unitsFor } from '@/lib/path-frets';
import { lockedNotice } from '@/lib/path-state';
import { lessonsProgress, nextLesson } from '@/lib/stats';
import './path.css';

export const metadata: Metadata = { title: 'เส้นทางเรียน — FretPath' };

export default async function PathPage({ searchParams }: { searchParams: Promise<{ locked?: string | string[] }> }) {
  const { locked } = await searchParams;
  const path = await getPath();
  if (!path) {
    return (
      <div className="fp-path">
        <h1 className="title">เส้นทางเรียน</h1>
        <p>ยังไม่มีคอร์สที่ลงทะเบียน</p>
      </div>
    );
  }
  const lessons = [...path.lessons].sort((a, b) => a.sortOrder - b.sortOrder);
  const slug = typeof locked === 'string' ? locked : null;
  const notice = slug ? lockedNotice(lessons, slug) : null;
  const next = nextLesson(lessons);
  const slots = layoutPath(path.course.slug, lessons);
  const nextFret = next ? slots.findIndex((s) => s.lesson?.id === next.id) : -1;
  const progress = lessonsProgress(lessons);
  const allDone = progress.total > 0 && progress.completed === progress.total;

  return (
    <div className="fp-path">
      <div className="path-head">
        <div>
          <h1 className="title">เส้นทางเรียน: {path.course.title}</h1>
          <p className="sub">ไล่จากหัวกีตาร์ไปปลายคอ ทีละเฟรต ทีละบท</p>
        </div>
        <p className="count" data-testid="path-progress">
          เรียนจบแล้ว <b>{progress.completed}</b> จาก {progress.total} บท
        </p>
      </div>

      {notice ? (
        <p role="alert" className="notice">
          {notice}
        </p>
      ) : null}

      <FretNeck slots={slots} currentId={next?.id ?? null} />

      <div className="path-grid">
        <div className="lessons">
          {unitsFor(slots.length).map((u) => {
            const inUnit = slots.slice(u.from, u.to + 1);
            const real = inUnit.flatMap((s) => (s.lesson ? [s.lesson] : []));
            const done = real.filter((l) => l.state === 'completed').length;
            const soon = inUnit.length - real.length;
            return (
              <section key={u.from} className="unit" aria-labelledby={`unit-${u.from}`}>
                <div className="unit-head">
                  <h2 id={`unit-${u.from}`}>{u.name}</h2>
                  <small>
                    เฟรต {u.from}–{u.to}
                    {real.length > 0 ? ` · จบ ${done}/${real.length}` : ''}
                    {soon > 0 ? ` · อีก ${soon} บทเร็ว ๆ นี้` : ''}
                  </small>
                </div>
                <ol className="lesson-list">
                  {inUnit.map((s) =>
                    s.lesson ? (
                      <LessonRow key={s.fret} lesson={s.lesson} fret={s.fret} current={s.lesson.id === next?.id} />
                    ) : (
                      <SoonRow key={s.fret} plan={s.plan} fret={s.fret} />
                    ),
                  )}
                </ol>
              </section>
            );
          })}
        </div>

        <aside className="side" aria-label="เรียนต่อ">
          <div className="next-card" data-testid="path-next">
            {next ? (
              <>
                <p className="k">
                  {progress.completed === 0 ? 'เริ่มเรียน' : 'เรียนต่อจากเดิม'} · เฟรต {nextFret}
                </p>
                <h2>{next.title}</h2>
                <Link href={`/lessons/${next.slug}`} className="btn btn-amber">
                  เข้าบทเรียน
                </Link>
              </>
            ) : (
              <>
                <p className="k">ยินดีด้วย</p>
                <h2>{allDone ? 'คุณเรียนจบทุกบทในคอร์สนี้แล้ว' : 'ยังไม่มีบทที่เปิดให้เรียน'}</h2>
                {allDone ? (
                  <Link href="/practice" className="btn btn-amber">
                    ไปซ้อมต่อ
                  </Link>
                ) : null}
              </>
            )}
          </div>
          <div className="legend-card">
            <h3>อ่านคอกีตาร์</h3>
            <ul className="legend">
              <li>
                <i className="dot done" />
                เรียนจบแล้ว
              </li>
              <li>
                <i className="dot now" />
                บทที่เรียนต่อได้
              </li>
              <li>
                <i className="dot lock" />
                ยังล็อก ต้องผ่านบทก่อนหน้า
              </li>
              <li>
                <i className="dot empty" />
                เร็ว ๆ นี้ บทใหม่กำลังจะมา
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
