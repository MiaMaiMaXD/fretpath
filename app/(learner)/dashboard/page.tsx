import type { Metadata } from 'next';
import Link from 'next/link';
import { PracticeChart, ScoresChart, type PracticeDay, type ScoreRow } from '@/components/dashboard/Charts';
import { bangkokLastDays, bangkokToday, bangkokWeekRange } from '@/lib/bangkok';
import { chartSummary } from '@/lib/chart';
import { getDashboard } from '@/lib/data/dashboard';
import { activityLabel } from '@/lib/practice-activities';
import { averageBestScore, dailyMinutes, lessonsProgress, nextLesson, weeklyMinutes } from '@/lib/stats';
import './dashboard.css';

export const metadata: Metadata = { title: 'ภาพรวมการเรียน — FretPath' };

const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const WEEKDAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const thaiShort = (ymd: string) => `${Number(ymd.slice(8, 10))} ${MONTHS[Number(ymd.slice(5, 7)) - 1]}`;
const weekday = (ymd: string) => WEEKDAYS[new Date(`${ymd}T00:00:00Z`).getUTCDay()];

function Empty({ testId, text, link }: { testId: string; text: string; link?: { href: string; label: string } }) {
  return (
    <div className="empty" data-testid={testId}>
      <svg viewBox="0 0 56 56" aria-hidden="true">
        <rect x="6" y="30" width="8" height="18" rx="3" fill="#e2e8f0" />
        <rect x="18" y="20" width="8" height="28" rx="3" fill="#e2e8f0" />
        <rect x="30" y="34" width="8" height="14" rx="3" fill="#e2e8f0" />
        <rect x="42" y="12" width="8" height="36" rx="3" fill="#fde7c2" />
      </svg>
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
        <p>ยังไม่ได้ลงทะเบียนเรียนคอร์สใด</p>
      </div>
    );
  }

  const { profile, recentLogs, weekLogs } = data;
  const lessons = [...data.lessons].sort((a, b) => a.sortOrder - b.sortOrder);
  const progress = lessonsProgress(lessons);
  const avg = averageBestScore(lessons);
  const scored = lessons.filter((l) => l.bestScore !== null).length;
  const week = weeklyMinutes(weekLogs, bangkokWeekRange());
  const goal = profile.weeklyGoalMinutes;
  const next = nextLesson(lessons);
  const nextIndex = next ? lessons.findIndex((l) => l.id === next.id) : -1;
  const isNew = progress.completed === 0 && recentLogs.length === 0;
  const name = profile.displayName.trim();
  const pass = lessons[0]?.passScore ?? 60;

  const today = bangkokToday();
  const daily = dailyMinutes(weekLogs, bangkokLastDays(7));
  const days: PracticeDay[] = daily.map((d) => ({
    day: weekday(d.date),
    date: thaiShort(d.date),
    minutes: d.minutes,
    today: d.date === today,
  }));
  const practiceSummary = chartSummary(
    'นาทีฝึก 7 วันล่าสุด',
    daily.map((d) => ({ label: thaiShort(d.date), value: d.minutes })),
    'นาที',
  );
  const scoreRows: ScoreRow[] = lessons.map((l, i) => ({
    n: i + 1,
    title: l.title,
    score: l.bestScore,
    locked: l.state === 'locked',
  }));
  const scoresSummary = chartSummary(
    'คะแนนสูงสุดรายบท',
    lessons.map((l, i) => ({ label: `บท ${i + 1}`, value: l.bestScore })),
    '%',
    'ยังไม่สอบ',
  );
  const weekPct = goal > 0 ? Math.min(100, Math.round((week / goal) * 100)) : 0;

  return (
    <div className="fp-dash">
      <h1 className="greet" data-testid="dash-greeting">
        {isNew ? `ยินดีต้อนรับ${name ? ` ${name}` : ''} มาเริ่มบทแรกกัน` : `สวัสดี${name ? ` ${name}` : ''}`}
      </h1>

      <section className="continue" aria-labelledby="continue-title" data-testid="dash-continue">
        <div>
          <p className="kicker">{next ? (isNew ? 'เริ่มเรียน' : 'เรียนต่อจากที่ค้างไว้') : 'ยินดีด้วย'}</p>
          <h2 id="continue-title">
            {next ? `บทที่ ${nextIndex + 1}: ${next.title}` : progress.completed === progress.total ? 'คุณเรียนจบคอร์สแล้ว' : 'ดูบทเรียนทั้งหมดในเส้นทางเรียน'}
          </h2>
          <div className="progress">
            <ol className="pips" aria-hidden="true">
              {lessons.map((l) => (
                <li key={l.id} className={l.state === 'completed' ? 'done' : l.id === next?.id ? 'now' : ''} />
              ))}
            </ol>
            <span>
              ผ่านแล้ว {progress.completed} จาก {progress.total} บท
            </span>
          </div>
        </div>
        {next ? (
          <Link href={`/lessons/${next.slug}`} className="btn btn-primary" data-testid="dash-continue-btn">
            {isNew ? 'เริ่มบทที่ 1' : 'เรียนต่อ'}
          </Link>
        ) : (
          <Link href="/path" className="btn btn-primary" data-testid="dash-continue-btn">
            ดูเส้นทางเรียน
          </Link>
        )}
      </section>

      <section className="stats" aria-label="สรุปสถิติ">
        <div className="stat" data-testid="stat-lessons">
          <h3>บทที่ผ่านแล้ว</h3>
          <div className="value">
            {progress.completed}
            <small> / {progress.total} บท</small>
          </div>
          <p className="sub">
            {next ? (progress.completed === 0 ? `บทที่ ${nextIndex + 1} เปิดให้เรียนแล้ว` : `ถัดไป: บทที่ ${nextIndex + 1}`) : 'ผ่านครบทุกบท'}
          </p>
        </div>
        <div className="stat" data-testid="stat-avg-score">
          <h3>คะแนนเฉลี่ยแบบทดสอบ</h3>
          <div className="value">{avg === null ? '—' : `${avg}%`}</div>
          <p className="sub">{scored ? `จากคะแนนสูงสุดของ ${scored} บทที่สอบแล้ว` : 'ยังไม่ได้ทำแบบทดสอบ'}</p>
        </div>
        <div className="stat" data-testid="stat-week-minutes">
          <h3>ฝึกสัปดาห์นี้ (จ.–อา.)</h3>
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
              <Link href="/profile" className="link">
                ตั้งเป้าหมาย
              </Link>
            </p>
          )}
        </div>
      </section>

      <section className="charts">
        <div className="card" data-testid="chart-practice">
          <div className="card-head">
            <h2>นาทีฝึก 7 วันล่าสุด</h2>
            <Link href="/practice" className="btn-quiet" data-testid="dash-add-practice">
              + บันทึกการฝึก
            </Link>
          </div>
          {recentLogs.length === 0 ? (
            <Empty
              testId="practice-empty"
              text="ยังไม่มีบันทึกการฝึก หลังเรียนบทที่ 1 ลองจับเวลาฝึกครั้งแรก แล้วกราฟจะเริ่มขึ้นตรงนี้"
              link={{ href: '/practice', label: 'ไปหน้าบันทึกการฝึก' }}
            />
          ) : (
            <PracticeChart days={days} summary={practiceSummary} />
          )}
        </div>
        <div className="card" data-testid="chart-scores">
          <div className="card-head">
            <h2>คะแนนสูงสุดรายบท</h2>
          </div>
          {scored === 0 ? (
            <Empty
              testId="scores-empty"
              text={`ทำแบบทดสอบท้ายบทที่ 1 ให้ได้ ${pass}% ขึ้นไป แล้วคะแนนจะขึ้นที่นี่ พร้อมปลดล็อกบทที่ 2`}
            />
          ) : (
            <ScoresChart rows={scoreRows} pass={pass} summary={scoresSummary} />
          )}
        </div>
      </section>

      <section className="card recent" aria-labelledby="recent-title" data-testid="dash-recent">
        <div className="card-head">
          <div>
            <h2 id="recent-title">ประวัติการฝึกซ้อมล่าสุด</h2>
            <p className="card-sub">รายการบันทึกการซ้อมของคุณ</p>
          </div>
          <Link href="/practice" className="btn-quiet">
            ดูทั้งหมด →
          </Link>
        </div>
        {recentLogs.length === 0 ? (
          <Empty
            testId="recent-empty"
            text="บันทึกการฝึกครั้งแรกจะแสดงที่นี่ ฝึกวันละ 15 นาทีสม่ำเสมอ ได้ผลกว่าฝึกนาน ๆ สัปดาห์ละครั้ง"
            link={{ href: '/practice', label: 'จับเวลาฝึกครั้งแรก' }}
          />
        ) : (
          <table className="log" aria-labelledby="recent-title">
            <thead>
              <tr>
                <th scope="col">วันที่</th>
                <th scope="col">หัวข้อที่ฝึก</th>
                <th scope="col" className="num">
                  เวลา (นาที)
                </th>
                <th scope="col">บันทึกเพิ่มเติม</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((l) => (
                <tr key={l.id}>
                  <td className="date">
                    <time dateTime={l.practicedOn}>{l.practicedOn}</time>
                  </td>
                  <td className="what">
                    {activityLabel(l.activity)}
                    {l.lessonTitle ? <small>{l.lessonTitle}</small> : null}
                  </td>
                  <td className="num mins">{l.minutes} นาที</td>
                  <td className="note">{l.note?.trim() || <span className="none">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
