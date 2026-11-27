import type { Metadata } from 'next';
import Link from 'next/link';
import { FretNeck } from '@/components/path/FretNeck';
import { LessonRow, SoonRow } from '@/components/path/LessonRow';
import { getPath } from '@/lib/data/path';
import { FRET_COUNT, layoutPath, sectionUnits } from '@/lib/path-frets';
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
  const units = sectionUnits(slots, path.sections);
  // frets with no lesson yet (the neck always shows 22 frets)
  const hasEmptyFrets = slots.length < FRET_COUNT || slots.some((s) => !s.lesson);
  const nextFret = next ? slots.findIndex((s) => s.lesson?.id === next.id) : -1;
  const progress = lessonsProgress(lessons);
  const allDone = progress.total > 0 && progress.completed === progress.total;

  return (
    <div className="fp-path">
      <div className="path-head">
        <div>
          <h1 className="title">เส้นทางเรียน: {path.course.title}</h1>
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

      <FretNeck slots={slots} units={units} currentId={next?.id ?? null} />

      <div className="path-grid">
        <div className="lessons">
          {units.map((u) => {
            const inUnit = slots.slice(u.from, u.to + 1);
            const real = inUnit.flatMap((s) => (s.lesson ? [s.lesson] : []));
            const done = real.filter((l) => l.state === 'completed').length;
            const soon = inUnit.length - real.length;
            return (
              <section key={u.from} className="unit" aria-labelledby={`unit-${u.from}`}>
                <div className="unit-head">
                  <h2 id={`unit-${u.from}`}>{u.name.replace(' · ', ' : ')}</h2>
                  <span className="sr-only">
                    บทที่ {u.from + 1}–{u.to + 1}
                    {real.length > 0 ? ` เรียนจบ ${done} จาก ${real.length} บท` : ''}
                    {soon > 0 ? ` อีก ${soon} บทเร็ว ๆ นี้` : ''}
                  </span>
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
                  {progress.completed === 0 ? 'เริ่มเรียน' : 'เรียนต่อจากเดิม'} · บทที่ {nextFret + 1}
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
                <span>
                  <b>เรียนจบแล้ว</b>
                  <small>สอบผ่านแล้ว กลับไปทบทวนได้ทุกเมื่อ</small>
                </span>
              </li>
              <li>
                <i className="dot now" />
                <span>
                  <b>พร้อมเข้าเรียน</b>
                  <small>บทที่เรียนต่อได้ตอนนี้</small>
                </span>
              </li>
              <li>
                <i className="dot lock" />
                <span>
                  <b>ไม่พร้อมเข้าเรียน</b>
                  <small>ต้องสอบผ่านบทก่อนหน้าก่อน</small>
                </span>
              </li>
              {hasEmptyFrets ? (
                <li>
                  <i className="dot empty" />
                  <span>
                    <b>เร็ว ๆ นี้</b>
                    <small>บทใหม่กำลังจะมา</small>
                  </span>
                </li>
              ) : null}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
