import type { Metadata } from 'next';
import Link from 'next/link';
import { FretNeck } from '@/components/path/FretNeck';
import { LessonRow } from '@/components/path/LessonRow';
import { getPath } from '@/lib/data/path';
import { unitsFor } from '@/lib/path-frets';
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
  const nextFret = next ? lessons.findIndex((l) => l.id === next.id) : -1;
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

      <FretNeck lessons={lessons} currentId={next?.id ?? null} />

      <div className="path-grid">
        <div className="lessons">
          {unitsFor(lessons.length).map((u) => {
            const inUnit = lessons.slice(u.from, u.to + 1);
            const done = inUnit.filter((l) => l.state === 'completed').length;
            return (
              <section key={u.from} className="unit" aria-labelledby={`unit-${u.from}`}>
                <div className="unit-head">
                  <h2 id={`unit-${u.from}`}>{u.name}</h2>
                  <small>
                    เฟรต {u.from}–{u.to} · จบ {done}/{inUnit.length}
                  </small>
                </div>
                <ol className="lesson-list">
                  {inUnit.map((l, k) => (
                    <LessonRow key={l.id} lesson={l} fret={u.from + k} current={l.id === next?.id} />
                  ))}
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
                เฟรตว่าง บทใหม่กำลังจะมา
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
