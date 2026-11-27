import Link from 'next/link';
import { AddSectionButton, LessonManager, type ManagerUnit } from '@/components/admin/LessonManager';
import { getAdminCourses, getAdminLessons, getAdminSections } from '@/lib/data/admin-lessons';
import '../admin.css';

export const metadata = { title: 'จัดการบทเรียน' };

/* "จัดการบทเรียน" (2026-11 design): lives in the learner shell so it keeps the app navbar; reached from
   the account menu. Sections come from course_sections; lesson numbers run 1..n in course order (drafts
   included), so admins see every lesson numbered. */
export default async function AdminLessonsPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { course } = await searchParams;
  const courses = await getAdminCourses(); // requireAdmin() inside
  const current = courses.find((c) => c.id === course) ?? courses[0];
  const [lessons, sections] = current
    ? await Promise.all([getAdminLessons(current.id), getAdminSections(current.id)])
    : [[], []];

  const no = new Map(lessons.map((l, i) => [l.id, i + 1]));
  const units: ManagerUnit[] = sections.map((s, i) => {
    const rows = lessons
      .filter((l) => l.sectionId === s.id)
      .map((l) => ({ id: l.id, no: no.get(l.id)!, title: l.title, status: l.status }));
    return { id: s.id, n: i + 1, title: s.title, published: rows.some((r) => r.status === 'published'), lessons: rows };
  });

  const published = lessons.filter((l) => l.status === 'published').length;

  return (
    <main className="fp-lm">
      <section className="panel" aria-labelledby="lm-title">
        <header className="panel-head">
          <div>
            <h1 id="lm-title">จัดการบทเรียน</h1>
            <p className="lead">จัดการช่วงการเรียนรู้และบทเรียนทั้งหมดในระบบ</p>
          </div>
          {current ? <AddSectionButton courseId={current.id} /> : null}
        </header>

        {courses.length > 1 ? (
          <nav aria-label="เลือกคอร์ส" className="courses">
            {courses.map((c) => (
              <Link key={c.id} href={`/admin/lessons?course=${c.id}`} aria-current={c.id === current?.id ? 'page' : undefined}>
                {c.title}
              </Link>
            ))}
          </nav>
        ) : null}

        <ul className="stats" aria-label="สรุป">
          <Stat label="บทเรียนทั้งหมด" value={`${lessons.length} บท`} tone="amber" icon={<BookIcon />} />
          <Stat label="ช่วงการเรียนทั้งหมด" value={`${units.length} ช่วง`} tone="amber" icon={<GridIcon />} />
          <Stat label="เผยแพร่แล้ว" value={`${published} บท`} tone="green" icon={<UploadIcon />} />
          <Stat label="แบบร่าง" value={`${lessons.length - published} บท`} tone="red" icon={<EyeOffIcon />} />
        </ul>

        {current ? (
          <LessonManager courseId={current.id} units={units} order={lessons.map((l) => l.id)} />
        ) : (
          <p className="none">ยังไม่มีคอร์ส</p>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value, tone, icon }: { label: string; value: string; tone: 'amber' | 'green' | 'red'; icon: React.ReactNode }) {
  return (
    <li className={`stat ${tone}`}>
      <div>
        <h2>{label}</h2>
        <p className="value">{value}</p>
      </div>
      {icon}
    </li>
  );
}

const svg = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;
const BookIcon = () => (
  <svg {...svg}>
    <path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z" />
  </svg>
);
const GridIcon = () => (
  <svg {...svg}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const UploadIcon = () => (
  <svg {...svg}>
    <path d="M12 17V4M6 10l6-6 6 6M5 21h14" />
  </svg>
);
const EyeOffIcon = () => (
  <svg {...svg}>
    <path d="M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6A17 17 0 0 0 2 12s4 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
  </svg>
);
