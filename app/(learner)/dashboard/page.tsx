import type { Metadata } from 'next';
import Link from 'next/link';
import { ScoresChart, type ScoreColumn } from '@/components/dashboard/Charts';
import { PracticeTable } from '@/components/practice/PracticeTable';
import { bangkokToday, bangkokWeekRange } from '@/lib/bangkok';
import { chartSummary } from '@/lib/chart';
import { getDashboard } from '@/lib/data/dashboard';
import { layoutPath, lessonNumbers, unitsFor } from '@/lib/path-frets';
import { averageBestScore, lessonsProgress, nextLesson, weeklyMinutes } from '@/lib/stats';
import './dashboard.css';

export const metadata: Metadata = { title: 'ภาพรวมการเรียน — FretPath' };

const icon = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function BookIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...icon}>
      <path d="M3 7h10a3 3 0 0 1 3 3v16a3 3 0 0 0-3-3H3zM29 7H19a3 3 0 0 0-3 3v16a3 3 0 0 1 3-3h10z" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...icon}>
      <path d="M9 4h14v8a7 7 0 0 1-14 0zM9 7H4a5 5 0 0 0 5 6M23 7h5a5 5 0 0 1-5 6M16 19v5M11 28h10l-1-4h-8z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...icon}>
      <circle cx="16" cy="16" r="13" />
      <path d="M16 9v7h6" />
    </svg>
  );
}

function Empty({ testId, text, link }: { testId: string; text: string; link?: { href: string; label: string } }) {
  return (
    <div className="empty" data-testid={testId}>
      <p>{text}</p>
      {link ? (
        <Link href={link.href} className="btn-quiet">
          {link.label}
        </Link>
      ) : null}
    </div>
  );
}

export default async function DashboardPage() {
  const data = await getDashboard();
  if (!data) {
    return (
      <div className="fp-dash">
        <h1 className="greet">ภาพรวมการเรียน</h1>
        <p className="none">ยังไม่ได้ลงทะเบียนเรียนคอร์สใด</p>
      </div>
    );
  }

  const { profile, recentLogs, weekLogs, totals } = data;
  const lessons = [...data.lessons].sort((a, b) => a.sortOrder - b.sortOrder);
  const slots = layoutPath(data.courseSlug, lessons);
  const lessonNo = lessonNumbers(slots);
  const progress = lessonsProgress(lessons);
  const avg = averageBestScore(lessons);
  const scored = lessons.filter((l) => l.bestScore !== null).length;
  const week = weeklyMinutes(weekLogs, bangkokWeekRange());
  const goal = profile.weeklyGoalMinutes;
  const next = nextLesson(lessons);
  const nextNo = next ? lessonNo[next.id] : null;
  const isNew = progress.completed === 0 && recentLogs.length === 0;
  const name = profile.displayName.trim();
  const pass = lessons[0]?.passScore ?? 60;
  const weekPct = goal > 0 ? Math.min(100, Math.round((week / goal) * 100)) : 0;

  const columns: ScoreColumn[] = slots.map((s) =>
    s.lesson
      ? {
          n: s.fret + 1,
          title: s.lesson.title,
          score: s.lesson.bestScore,
          state: s.lesson.bestScore !== null ? 'scored' : s.lesson.state === 'locked' ? 'locked' : 'open',
        }
      : { n: s.fret + 1, title: s.plan.title, score: null, state: 'soon' },
  );
  const scoresSummary = chartSummary(
    'คะแนนแบบทดสอบรายบทเรียน',
    slots.flatMap((s) => (s.lesson ? [{ label: `บทที่ ${s.fret + 1}`, value: s.lesson.bestScore }] : [])),
    '%',
    'ยังไม่สอบ',
  );

  return (
    <div className="fp-dash">
      <h1 className="greet" data-testid="dash-greeting">
        {isNew ? `ยินดีต้อนรับ${name ? ` ${name}` : ''} มาเริ่มบทแรกกัน` : `สวัสดี${name ? ` ${name}` : ''}`}
      </h1>

      <section className="continue" aria-labelledby="continue-title" data-testid="dash-continue">
        <div>
          <p className="kicker">{next ? (isNew ? 'เริ่มเรียน' : 'เรียนต่อจากเดิม') : 'ยินดีด้วย'}</p>
          <h2 id="continue-title">
            {next
              ? `บทที่ ${nextNo}: ${next.title}`
              : progress.completed === progress.total
                ? 'คุณเรียนจบคอร์สแล้ว'
                : 'ดูบทเรียนทั้งหมดในเส้นทางเรียน'}
          </h2>
          <p className="sub">
            ผ่านแล้ว {progress.completed} จาก {progress.total} บท
          </p>
        </div>
        {next ? (
          <Link href={`/lessons/${next.slug}`} className="btn btn-primary" data-testid="dash-continue-btn">
            {isNew ? 'เริ่มเรียน' : 'เรียนต่อ'}
          </Link>
        ) : (
          <Link href="/path" className="btn btn-primary" data-testid="dash-continue-btn">
            ดูเส้นทางเรียน
          </Link>
        )}
      </section>

      <section className="stats" aria-label="สรุปสถิติ">
        <div className="stat" data-testid="stat-lessons">
          <div>
            <h3>ความคืบหน้าบทเรียน</h3>
            <div className="value">
              {progress.completed}/{progress.total} บท
            </div>
            <p className="sub">{next ? `ถัดไป: บทที่ ${nextNo}` : 'ผ่านครบทุกบท'}</p>
          </div>
          <BookIcon />
        </div>
        <div className="stat" data-testid="stat-avg-score">
          <div>
            <h3>คะแนนเฉลี่ย</h3>
            <div className="value">{avg === null ? '—' : `${avg}%`}</div>
            <p className="sub">{scored ? `ของแบบทดสอบ ${scored} บทที่ทำแล้ว` : 'ยังไม่ได้ทำแบบทดสอบ'}</p>
          </div>
          <TrophyIcon />
        </div>
        <div className="stat" data-testid="stat-week-minutes">
          <div>
            <h3>เวลาฝึกสัปดาห์นี้ (จ.–อา.)</h3>
            <div className="value">
              {week}
              <small>{goal > 0 ? ` / ${goal} นาที` : ' นาที'}</small>
            </div>
            {goal > 0 ? (
              <>
                <div className="meter" role="img" aria-label={`ฝึกแล้ว ${weekPct}% ของเป้าหมายสัปดาห์`}>
                  <i style={{ width: `${weekPct}%` }} />
                </div>
                <p className="sub">{week >= goal ? 'ถึงเป้าหมายสัปดาห์นี้แล้ว' : `อีก ${goal - week} นาทีถึงเป้าหมาย`}</p>
              </>
            ) : (
              <p className="sub">
                ยังไม่ตั้งเป้าหมาย ·{' '}
                <Link href="/profile#goal" className="link">
                  ตั้งเป้าหมาย
                </Link>
              </p>
            )}
          </div>
          {/* The clock opens the lessons page (per the dashboard design flow). */}
          <Link href="/path" className="stat-go" aria-label="ไปยังหน้าบทเรียน" data-testid="dash-week-go">
            <ClockIcon />
          </Link>
        </div>
      </section>

      <section className="card" aria-labelledby="scores-title" data-testid="chart-scores">
        <h2 id="scores-title">คะแนนแบบทดสอบรายบทเรียน (%)</h2>
        <p className="card-sub">เกณฑ์ผ่านขั้นต่ำ {pass}% เพื่อปลดล็อกบทเรียนถัดไป</p>
        <ScoresChart columns={columns} units={unitsFor(slots.length)} pass={pass} current={nextNo} summary={scoresSummary} />
      </section>

      <section className="card recent" aria-labelledby="recent-title" data-testid="dash-recent">
        <div className="card-head">
          <div>
            <h2 id="recent-title">ประวัติการฝึกซ้อมล่าสุด</h2>
            <p className="card-sub">รายการบันทึกการซ้อมของคุณ</p>
          </div>
          <Link href="/practice/history" className="see-all" data-testid="dash-see-all">
            ดูทั้งหมด
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
        {recentLogs.length === 0 ? (
          <Empty
            testId="recent-empty"
            text="บันทึกการฝึกครั้งแรกจะแสดงที่นี่ ฝึกวันละ 15 นาทีสม่ำเสมอ ได้ผลกว่าฝึกนาน ๆ สัปดาห์ละครั้ง"
            link={{ href: '/practice', label: 'จับเวลาฝึกครั้งแรก' }}
          />
        ) : (
          <PracticeTable
            logs={recentLogs}
            labelledBy="recent-title"
            minutesHead={`เวลา (รวม ${totals.minutes} นาที)`}
            today={bangkokToday()}
            lessonNo={lessonNo}
            actions={false}
          />
        )}
      </section>
    </div>
  );
}
