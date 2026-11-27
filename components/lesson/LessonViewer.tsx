'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChordDiagram } from '@/components/ChordDiagram';
import { StringPlayer, useAudioSupported } from '@/components/StringPlayer';
import { YouTubeEmbed } from '@/components/YouTubeEmbed';
import { chordFrequencies, fingerGuide, type ChordName } from '@/lib/audio/chords';
import { getAudioContext, pluck } from '@/lib/audio/strings';
import { QuizPanel, type LearnerQuiz } from './QuizPanel';
import './lesson-viewer.css';

export type ViewerPage =
  | { key: string; kind: 'text'; title: string; html: string }
  | { key: string; kind: 'video'; title: string; videoUrl: string }
  | { key: string; kind: 'quiz'; title: string };

export type ViewerQuestion =
  | { key: string; kind: 'choice'; prompt: string; choices: string[] }
  | { key: string; kind: 'practical'; prompt: string; chords: ChordName[] };

/** Where a learner stopped in a lesson, kept on this device by "บันทึกและออกจากบทเรียน". */
const placeKey = (slug: string) => `fp-lesson-page:${slug}`;

/**
 * A lesson one page at a time (2026-11 flow): chord lab on the left, the page in a white card with
 * กลับ / ถัดไป, then the quiz intro and quiz full width. Used by learners (graded quiz) and by the admin
 * preview (quiz step shows the questions, ungraded). Text page HTML must already be safe.
 */
export function LessonViewer({
  no,
  title,
  summary,
  passScore,
  chords,
  pages,
  mode,
  slug,
  quizHref,
  questions = [],
  quiz,
  onExit,
}: {
  no: number;
  title: string;
  summary: string;
  passScore: number;
  chords: ChordName[];
  pages: ViewerPage[];
  mode: 'learner' | 'preview';
  /** learner: lesson slug, to remember the page */
  slug?: string;
  /** learner: where the quiz step sends them when the quiz cannot be embedded */
  quizHref?: string;
  /** learner: the graded quiz, shown on the quiz step */
  quiz?: LearnerQuiz;
  /** preview: the quiz to show on the quiz step */
  questions?: ViewerQuestion[];
  /** preview: back to the editor */
  onExit?: () => void;
}) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const top = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const page = pages[i];
  const last = i === pages.length - 1;
  const onQuiz = page?.kind === 'quiz';

  // pick up where the learner left off
  useEffect(() => {
    if (!slug) return;
    const saved = Number(window.localStorage.getItem(placeKey(slug)));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from localStorage after hydration
    if (Number.isInteger(saved) && saved > 0 && saved < pages.length) setI(saved);
  }, [slug, pages.length]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    top.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [i]);

  function saveAndExit() {
    if (slug) window.localStorage.setItem(placeKey(slug), String(i));
    router.push('/path');
  }

  return (
    <div className={`lv ${onQuiz ? 'full' : ''}`} ref={top}>
      {onQuiz ? null : (
        <aside className="lv-side">
          {onExit ? (
            <button type="button" className="lv-pill amber lv-exit" onClick={onExit}>
              ‹ กลับไปหน้าแก้ไขบทเรียน
            </button>
          ) : (
            <button type="button" className="lv-pill amber lv-exit" onClick={saveAndExit} data-testid="lesson-exit">
              ‹ บันทึกและออกจากบทเรียน
            </button>
          )}
          {chords.length > 0 ? (
            <ChordPanel chords={chords} />
          ) : (
            <div className="lv-card lv-strings">
              <StringPlayer />
            </div>
          )}
        </aside>
      )}

      <section className="lv-card lv-main" aria-live="polite">
        {page?.kind === 'quiz' && mode === 'learner' && quiz ? (
          <QuizPanel quiz={quiz} pageLabel={`หน้า ${i + 1}/${pages.length}`} onBack={i > 0 ? () => setI(i - 1) : undefined} />
        ) : (
          <>
            <div className="lv-meta">
              <span className="lv-chip">
                หน้า {pages.length ? i + 1 : 0}/{pages.length}
              </span>
              <span className="lv-chip pass">เกณฑ์คะแนนผ่าน {passScore}%</span>
              <span className="lv-badge">{mode === 'preview' ? 'ตัวอย่าง' : 'กำลังเรียน'}</span>
            </div>
            <hr />

            {!page ? (
              <p className="lv-empty">บทเรียนนี้ยังไม่มีเนื้อหา</p>
            ) : page.kind === 'quiz' ? (
              <QuizStep page={page} mode={mode} quizHref={quizHref} questions={questions} no={no} />
            ) : (
              <>
                <h1 className="lv-title">{i === 0 ? `บทที่ ${no}: ${title}` : title}</h1>
                {i === 0 && summary ? <p className="lv-summary">{summary}</p> : null}
                <hr />
                {/* later pages: the page's own title under the lesson title */}
                {i > 0 && page.title ? <p className="lv-page-title">{page.title}</p> : null}
                {page.kind === 'video' ? (
                  page.videoUrl ? (
                    <div className="lv-video">
                      <YouTubeEmbed url={page.videoUrl} title={page.title || title} />
                    </div>
                  ) : (
                    <p className="lv-empty">ยังไม่ได้ใส่ลิงก์วิดีโอ</p>
                  )
                ) : (
                  <div className="lv-html" dangerouslySetInnerHTML={{ __html: page.html }} />
                )}
              </>
            )}

            <nav className="lv-nav" aria-label="เปลี่ยนหน้า">
              <button type="button" className="lv-pill slate" disabled={i === 0} onClick={() => setI(i - 1)}>
                กลับ
              </button>
              {!last ? (
                <button type="button" className="lv-pill amber" onClick={() => setI(i + 1)}>
                  ถัดไป
                </button>
              ) : null}
            </nav>
          </>
        )}
      </section>
    </div>
  );
}

function QuizStep({
  page,
  mode,
  quizHref,
  questions,
  no,
}: {
  no: number;
  page: Extract<ViewerPage, { kind: 'quiz' }>;
  mode: 'learner' | 'preview';
  quizHref?: string;
  questions: ViewerQuestion[];
}) {
  const choice = questions.filter((q) => q.kind === 'choice');
  return (
    <>
      <p className="lv-kicker">แบบทดสอบ บทที่ {no}</p>
      <h1 className="lv-title sm">{page.title || 'แบบทดสอบ'}</h1>
      {mode === 'learner' ? (
        <div className="lv-quiz-start">
          <p>ทำแบบทดสอบให้ผ่านเกณฑ์เพื่อปลดล็อกบทถัดไป</p>
          {quizHref ? (
            <Link href={quizHref} className="lv-pill amber">
              เริ่มทำแบบทดสอบ
            </Link>
          ) : null}
        </div>
      ) : (
        <ol className="lv-questions">
          {questions.length === 0 ? <p className="lv-empty">ยังไม่มีคำถาม</p> : null}
          {questions.map((q, n) =>
            q.kind === 'choice' ? (
              <li key={q.key} className="lv-q">
                <p className="lv-q-prompt">
                  ข้อที่ {choice.indexOf(q) + 1}: {q.prompt}
                </p>
                <div className="lv-choices" role="radiogroup" aria-label={`ข้อที่ ${n + 1}`}>
                  {q.choices.map((c, ci) => (
                    <label key={ci}>
                      <input type="radio" name={q.key} />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              </li>
            ) : (
              <li key={q.key} className="lv-q practical">
                <p className="lv-q-prompt">ข้อปฏิบัติ: {q.prompt}</p>
                <p className="lv-chords">{q.chords.join(' → ')}</p>
                <p className="lv-note">ผู้เรียนยังไม่เห็นข้อนี้ — ระบบตรวจด้วยไมโครโฟนกำลังพัฒนา</p>
              </li>
            ),
          )}
        </ol>
      )}
    </>
  );
}

const CHORD_LONG: Partial<Record<ChordName, string>> = {
  C: 'C Major (คอร์ด C)',
  G: 'G Major (คอร์ด G)',
  D: 'D Major (คอร์ด D)',
  A: 'A Major (คอร์ด A)',
  E: 'E Major (คอร์ด E)',
  F: 'F Major (คอร์ด F)',
  Am: 'A Minor (คอร์ด Am)',
  Em: 'E Minor (คอร์ด Em)',
  Dm: 'D Minor (คอร์ด Dm)',
  Bm: 'B Minor (คอร์ด Bm)',
};

function ChordPanel({ chords }: { chords: ChordName[] }) {
  const [name, setName] = useState<ChordName>(chords[0]);
  const current = chords.includes(name) ? name : chords[0];
  const supported = useAudioSupported();
  const play = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const freqs = chordFrequencies(current);
    freqs.forEach((hz, k) => window.setTimeout(() => pluck(ctx, hz, 2, 1 / freqs.length), k * 60));
  };
  return (
    <section className="lv-lab" aria-labelledby="lv-lab-h">
      <div className="lv-lab-head">
        <div>
          <h2 id="lv-lab-h">ห้องทดลองจับคอร์ด &amp; ฟังเสียงจริง</h2>
          <p>คลิกเลือกคอร์ดเพื่อดูตำแหน่งนิ้วและฟังเสียงดีด</p>
        </div>
        <button type="button" className="lv-play" onClick={play} disabled={!supported} aria-label={`ฟังเสียงคอร์ด ${current}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9zM16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="lv-lab-chips">
        {chords.map((c) => (
          <button key={c} type="button" className={c === current ? 'on' : ''} aria-pressed={c === current} onClick={() => setName(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="lv-lab-card">
        <p className="lv-lab-name">{CHORD_LONG[current] ?? current}</p>
        <p className="lv-lab-guide">{fingerGuide(current)}</p>
        <ChordDiagram name={current} />
      </div>
    </section>
  );
}
