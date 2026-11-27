'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { saveLessonEditor, setLessonPublished, type SaveLessonResult } from '@/app/(admin)/admin/lessons/actions';
import { ChordDiagram } from '@/components/ChordDiagram';
import { LessonViewer } from '@/components/lesson/LessonViewer';
import { YouTubeEmbed } from '@/components/YouTubeEmbed';
import { sameJson as same, type EditorState } from '@/lib/admin/editor-state';
import { publishProblemsThai } from '@/lib/admin/lesson-form';
import { KIND_LABEL, LIMITS, type EditorPage, type PageKind } from '@/lib/admin/lesson-pages';
import { CHORD_NAMES, type ChordName } from '@/lib/audio/chords';
import { isStoredYouTubeUrl } from '@/lib/youtube';
import { ConfirmDialog } from './ConfirmDialog';
import { QuizEditor } from './QuizEditor';
import { RichTextEditor } from './RichTextEditor';

type Props = {
  lessonId: string;
  courseId: string;
  no: number;
  status: 'draft' | 'published';
  /** what learners see now */
  live: EditorState;
  /** saved but not yet live (published lessons only) */
  draft: EditorState | null;
};

type Modal =
  | { kind: 'publish' }
  | { kind: 'unpublish' }
  | { kind: 'delete-page'; index: number }
  | { kind: 'delete-question'; index: number }
  | null;

let seq = 0;
const newKey = () => `new-${Date.now()}-${seq++}`;

/** Copies ids the server assigned to new pages/questions into a state, matching by position. */
function withIds(state: EditorState, res: SaveLessonResult): EditorState {
  const pageIds = res.pageIds ?? [];
  const qIds = res.questionIds ?? [];
  return {
    ...state,
    pages: state.pages.map((p, i) => ({ ...p, id: pageIds[i] ?? p.id })),
    questions: state.questions.map((q, i) => ({ ...q, id: qIds[i] ?? q.id })),
  };
}

export function LessonEditor(props: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const initial = props.draft ?? props.live;
  // live = what learners see; saved = last saved (draft or live); the rest = what is on screen
  const [live, setLive] = useState(props.live);
  const [saved, setSaved] = useState(initial);
  const [info, setInfo] = useState(initial.info);
  const [pages, setPages] = useState(initial.pages);
  const [quiz, setQuiz] = useState(initial.quiz);
  const [questions, setQuestions] = useState(initial.questions);
  const [selected, setSelected] = useState<string | null>(initial.pages[0]?.key ?? null);
  const [infoOpen, setInfoOpen] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; list?: string[] } | null>(null);
  const [status, setStatus] = useState(props.status);
  const [addOpen, setAddOpen] = useState(false);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const addRef = useOutsideClose(addOpen, () => setAddOpen(false));

  const state: EditorState = { info, pages, quiz, questions };
  const dirty = !same(state, saved);
  // a published lesson whose screen differs from what learners see: "อัปเดต"
  const notLive = status === 'published' && !same(state, live);
  const liveByKey = useMemo(() => new Map(live.pages.map((p) => [p.key, p])), [live.pages]);
  const quizNotLive = !same(quiz, live.quiz) || !same(questions, live.questions);
  // red bar: this page is not what learners see (unsaved, or saved as a draft only)
  const pageNotLive = (p: EditorPage) => !same(p, liveByKey.get(p.key)) || (p.kind === 'quiz' && quizNotLive);
  const current = pages.find((p) => p.key === selected) ?? null;
  const currentIndex = current ? pages.indexOf(current) : -1;

  // warn before leaving with unsaved edits
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function patchPage(key: string, patch: Partial<EditorPage>) {
    setPages((ps) => ps.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  }

  function addPage(kind: PageKind) {
    setAddOpen(false);
    if (kind === 'quiz' && pages.some((p) => p.kind === 'quiz')) {
      setMsg({ ok: false, text: 'บทเรียนนี้มีหน้าแบบทดสอบแล้ว (มีได้ 1 หน้า)' });
      return;
    }
    const p: EditorPage = { key: newKey(), id: null, kind, title: '', html: '', videoUrl: '' };
    setPages((ps) => [...ps, p]);
    setSelected(p.key);
  }

  /** After a successful save: put new ids on screen and remember what the server now has. */
  function settle(snapshot: EditorState, res: SaveLessonResult) {
    const next = withIds(snapshot, res);
    const idOf = new Map(next.pages.map((p) => [p.key, p.id]));
    const qIdOf = new Map(next.questions.map((q) => [q.key, q.id]));
    setPages((ps) => ps.map((p) => ({ ...p, id: idOf.get(p.key) ?? p.id })));
    setQuestions((qs) => qs.map((q) => ({ ...q, id: qIdOf.get(q.key) ?? q.id })));
    setSaved(next);
    if (res.savedTo === 'live') setLive(next);
  }

  function fail(res: { message?: string; problems?: string[] }, fallback: string) {
    setMsg({ ok: false, text: res.message ?? fallback, list: res.problems });
  }

  /** "บันทึกแบบร่างและออก": save the draft when something changed, then back to the lesson list. */
  function saveAndExit() {
    const listUrl = `/admin/lessons?course=${props.courseId}`;
    if (!dirty) return router.push(listUrl);
    const snapshot = state;
    start(async () => {
      const res = await saveLessonEditor(props.lessonId, snapshot, 'draft');
      if (!res.ok) return fail(res, 'บันทึกไม่สำเร็จ');
      settle(snapshot, res);
      router.push(listUrl);
    });
  }

  function save(target: 'draft' | 'live') {
    const snapshot = state;
    start(async () => {
      const res = await saveLessonEditor(props.lessonId, snapshot, target);
      if (!res.ok) return fail(res, 'บันทึกไม่สำเร็จ');
      settle(snapshot, res);
      setMsg({
        ok: true,
        text:
          res.savedTo === 'draft'
            ? 'บันทึกแบบร่างแล้ว ผู้เรียนยังเห็นฉบับเดิมจนกว่าจะกด “อัปเดต”'
            : target === 'live' && status === 'published'
              ? 'อัปเดตแล้ว ผู้เรียนเห็นฉบับใหม่แล้ว'
              : 'บันทึกแล้ว',
      });
      router.refresh();
    });
  }

  function confirmModal() {
    if (!modal) return;
    if (modal.kind === 'delete-question') {
      // removed on screen; saved (and checked against learners' answers) with the next save
      setQuestions((qs) => qs.filter((_, i) => i !== modal.index));
      setModal(null);
      return;
    }
    if (modal.kind === 'delete-page') {
      // also just on screen until saved, so a published lesson keeps the page until "อัปเดต"
      const p = pages[modal.index];
      const next = pages[modal.index + 1] ?? pages[modal.index - 1];
      setPages((ps) => ps.filter((x) => x.key !== p.key));
      setSelected(next?.key ?? null);
      setModal(null);
      return;
    }
    const publishing = modal.kind === 'publish';
    const snapshot = state;
    start(async () => {
      const res = await setLessonPublished(props.lessonId, snapshot, publishing);
      setModal(null);
      if (res.pageIds) settle(snapshot, { ...res, savedTo: 'live' });
      if (res.ok) {
        setStatus(publishing ? 'published' : 'draft');
        setMsg({ ok: true, text: publishing ? 'เผยแพร่แล้ว ผู้เรียนเห็นบทนี้บนหน้าเส้นทางการเรียน' : 'ยกเลิกการเผยแพร่แล้ว' });
        router.refresh();
      } else {
        const ids = withIds(snapshot, res).questions;
        setMsg({
          ok: false,
          text: res.message ?? (publishing ? 'เผยแพร่ไม่ได้ เพราะบทเรียนยังไม่ครบ' : 'ยกเลิกการเผยแพร่ไม่สำเร็จ'),
          list: res.problems
            ? res.problems.some((p) => /^[A-Z_]+(:|$)/.test(p))
              ? publishProblemsThai(res.problems, (id) => `ข้อที่ ${ids.findIndex((q) => q.id === id) + 1}`)
              : res.problems
            : undefined,
        });
      }
    });
  }

  function dropOn(targetKey: string) {
    if (!dragKey || dragKey === targetKey) return;
    setPages((ps) => {
      const list = [...ps];
      const to = list.findIndex((p) => p.key === targetKey);
      const [item] = list.splice(list.findIndex((p) => p.key === dragKey), 1);
      list.splice(to, 0, item);
      return list;
    });
  }

  if (preview) {
    return (
      <LessonViewer
        mode="preview"
        no={props.no}
        title={info.title}
        summary={info.summary}
        passScore={Number(quiz.passScore) || 0}
        chords={info.chords}
        pages={pages.map((p) =>
          p.kind === 'text'
            ? { key: p.key, kind: 'text', title: p.title, html: p.html }
            : p.kind === 'video'
              ? { key: p.key, kind: 'video', title: p.title, videoUrl: isStoredYouTubeUrl(p.videoUrl.trim()) ? p.videoUrl.trim() : '' }
              : { key: p.key, kind: 'quiz', title: p.title },
        )}
        questions={questions.map((q) =>
          q.kind === 'choice'
            ? { key: q.key, kind: 'choice', prompt: q.prompt, choices: q.choices }
            : { key: q.key, kind: 'practical', prompt: q.prompt, chords: q.chords },
        )}
        onExit={() => setPreview(false)}
      />
    );
  }

  return (
    <div className="le">
      <header className="le-head card">
        <div className="le-title">
          <h1>
            บทที่ {props.no}: {info.title || 'ไม่มีชื่อ'}
          </h1>
          <p>{info.summary || 'ยังไม่มีคำอธิบาย'}</p>
        </div>
        <div className="le-actions">
          <button type="button" className="pill slate" onClick={() => setPreview(true)} data-testid="le-preview">
            ดูตัวอย่าง
          </button>
          <button type="button" className="pill green" disabled={!dirty || pending} onClick={() => save('draft')} data-testid="le-save">
            {pending && dirty ? 'กำลังบันทึก…' : 'บันทึกแบบร่าง'}
          </button>
          {status === 'published' && notLive ? (
            <button type="button" className="pill green" disabled={pending} onClick={() => save('live')} data-testid="le-status">
              อัปเดต
            </button>
          ) : status === 'published' ? (
            <button type="button" className="pill amber" disabled={pending} onClick={() => setModal({ kind: 'unpublish' })} data-testid="le-status">
              เผยแพร่
            </button>
          ) : (
            <button type="button" className="pill red" disabled={pending} onClick={() => setModal({ kind: 'publish' })} data-testid="le-status">
              แบบร่าง
            </button>
          )}
        </div>
      </header>

      <div className={`le-msg ${msg?.ok === false ? 'err' : ''}`} role="status" aria-live="polite">
        {msg ? (
          <>
            {msg.text}
            {msg.list?.length ? (
              <ul>
                {msg.list.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="le-grid">
        <div className="le-side-col">
        <button type="button" className="pill amber wide le-exit" onClick={saveAndExit} disabled={pending} data-testid="le-exit">
          ‹ บันทึกแบบร่างและออก
        </button>
        <aside className="le-side card" aria-labelledby="le-pages-h">
          <h2 id="le-pages-h">จัดการบทเรียน</h2>
          <p className="sub">จัดการบทเรียน สามารถเพิ่มหน้าบทเรียนและแบบทดสอบ</p>
          <ol className="le-pages">
            {pages.map((p, i) => (
              <li
                key={p.key}
                className={`le-page ${p.key === selected ? 'on' : ''} ${pageNotLive(p) ? 'dirty' : ''} ${dragKey === p.key ? 'dragging' : ''}`}
                draggable
                onDragStart={() => setDragKey(p.key)}
                onDragEnd={() => setDragKey(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  dropOn(p.key);
                  setDragKey(null);
                }}
              >
                <button type="button" onClick={() => setSelected(p.key)} aria-current={p.key === selected ? 'true' : undefined}>
                  <span className="grip" aria-hidden="true">
                    ⠿
                  </span>
                  <span className="n">{i + 1}</span>
                  <span className={`t ${p.title ? '' : 'ph'}`}>{p.title || 'หน้าใหม่!'}</span>
                  <KindIcon kind={p.kind} />
                  <span className="sr-only">
                    {KIND_LABEL[p.kind]}
                    {pageNotLive(p) ? ' (ผู้เรียนยังไม่เห็นฉบับนี้)' : ''}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {pages.length === 0 ? <p className="empty">ยังไม่มีหน้า กด “เพิ่มหน้า”</p> : null}
          <div className="le-side-actions">
            <div className="le-add" ref={addRef}>
              <button type="button" className="pill amber wide" aria-expanded={addOpen} onClick={() => setAddOpen((o) => !o)}>
                เพิ่มหน้า
              </button>
              {addOpen ? (
                <ul className="le-add-menu">
                  {(['text', 'video', 'quiz'] as const).map((k) => (
                    <li key={k}>
                      <button type="button" onClick={() => addPage(k)}>
                        <KindIcon kind={k} />
                        {KIND_LABEL[k]}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <button
              type="button"
              className="pill red wide"
              disabled={currentIndex < 0 || pending}
              onClick={() => setModal({ kind: 'delete-page', index: currentIndex })}
            >
              ลบ
            </button>
          </div>
        </aside>
        </div>

        <div className="le-main">
          <section className="card le-info">
            <button type="button" className="le-info-head" aria-expanded={infoOpen} onClick={() => setInfoOpen((o) => !o)}>
              <h2>ข้อมูลบทเรียน</h2>
              <svg viewBox="0 0 24 24" aria-hidden="true" className={infoOpen ? 'up' : ''}>
                <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
            {infoOpen ? (
              <div className="le-info-body">
                <label className="fld">
                  <span>ชื่อบทเรียน</span>
                  <input value={info.title} maxLength={LIMITS.title} onChange={(e) => setInfo({ ...info, title: e.target.value })} />
                </label>
                <label className="fld">
                  <span className="row">
                    คำอธิบาย
                    <small>
                      {info.summary.length}/{LIMITS.summary}
                    </small>
                  </span>
                  <textarea
                    rows={4}
                    value={info.summary}
                    maxLength={LIMITS.summary}
                    onChange={(e) => setInfo({ ...info, summary: e.target.value })}
                  />
                </label>
                <ChordPicker value={info.chords} onChange={(chords) => setInfo({ ...info, chords })} />
              </div>
            ) : null}
          </section>

          {current ? (
            <section className="card le-page-edit" aria-label={`หน้าที่ ${currentIndex + 1}`}>
              <label className="fld">
                <span>{current.kind === 'quiz' ? 'ชื่อหน้าแบบทดสอบ' : 'ชื่อหน้าเนื้อหา'}</span>
                <input
                  value={current.title}
                  placeholder="กรอกชื่อหน้า"
                  maxLength={LIMITS.pageTitle}
                  onChange={(e) => patchPage(current.key, { title: e.target.value })}
                />
              </label>
              {current.kind === 'text' ? (
                <div className="fld">
                  <span>เนื้อหา</span>
                  <RichTextEditor
                    key={current.key}
                    lessonId={props.lessonId}
                    value={current.html}
                    label={`เนื้อหาหน้าที่ ${currentIndex + 1}`}
                    onChange={(html) => patchPage(current.key, { html })}
                  />
                </div>
              ) : null}
              {current.kind === 'video' ? (
                <>
                  <label className="fld">
                    <span>ลิงก์วิดีโอ</span>
                    <input
                      value={current.videoUrl}
                      placeholder="กรอกลิงก์ เช่น https://www.youtube.com/watch?v=…"
                      inputMode="url"
                      onChange={(e) => patchPage(current.key, { videoUrl: e.target.value })}
                    />
                  </label>
                  {isStoredYouTubeUrl(current.videoUrl.trim()) ? (
                    <YouTubeEmbed url={current.videoUrl.trim()} title={current.title || 'วิดีโอ'} />
                  ) : current.videoUrl.trim() ? (
                    <p className="hint err">ลิงก์นี้ยังเปิดเป็นวิดีโอไม่ได้ ต้องเป็นลิงก์คลิป YouTube</p>
                  ) : null}
                </>
              ) : null}
              {current.kind === 'quiz' ? (
                <QuizEditor
                  settings={quiz}
                  onSettings={setQuiz}
                  questions={questions}
                  onQuestions={setQuestions}
                  onDelete={(index) => setModal({ kind: 'delete-question', index })}
                />
              ) : null}
            </section>
          ) : (
            <section className="card le-page-edit">
              <p className="hint">เลือกหน้าทางซ้าย หรือกด “เพิ่มหน้า”</p>
            </section>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={modal !== null}
        pending={pending}
        onCancel={() => setModal(null)}
        onConfirm={confirmModal}
        {...(modal?.kind === 'delete-page'
          ? {
              title: 'คุณต้องการจะลบหรือไม่?',
              detail:
                pages[modal.index]?.kind === 'quiz'
                  ? `หน้าที่ ${modal.index + 1} จะหายไปถาวร (คำถามยังเก็บไว้ เพิ่มหน้าแบบทดสอบใหม่เพื่อแก้ได้)`
                  : `หน้าที่ ${modal.index + 1} จะหายไปถาวร คุณต้องการจะลบหรือไม่?`,
            }
          : modal?.kind === 'delete-question'
            ? { title: 'คุณต้องการจะลบหรือไม่?', detail: `“ข้อที่ ${modal.index + 1}” จะหายไปถาวร` }
          : modal?.kind === 'unpublish'
            ? {
                title: 'คุณต้องการจะยกเลิกการเผยแพร่หรือไม่?',
                detail: 'บทเรียนนี้จะไม่แสดงให้เห็นบนหน้าเส้นทางการเรียน จนกว่าจะกดเผยแพร่อีกครั้ง',
                confirmLabel: 'ตกลง',
                icon: 'pause' as const,
              }
            : {
                title: 'คุณต้องการจะเผยแพร่บทเรียนนี้หรือไม่?',
                detail: 'บทเรียนนี้จะแสดงให้เห็นบนหน้าเส้นทางการเรียน',
                confirmLabel: 'ตกลง',
                tone: 'primary' as const,
                icon: 'send' as const,
              })}
      />
    </div>
  );
}

function ChordPicker({ value, onChange }: { value: ChordName[]; onChange: (v: ChordName[]) => void }) {
  const toggle = (c: ChordName) =>
    onChange(value.includes(c) ? value.filter((x) => x !== c) : CHORD_NAMES.filter((x) => x === c || value.includes(x)));
  return (
    <fieldset className="fld chords">
      <legend>เลือกคอร์ดตัวอย่าง</legend>
      <div className="chips">
        {CHORD_NAMES.map((c) => (
          <button key={c} type="button" className={`chip ${value.includes(c) ? 'on' : ''}`} aria-pressed={value.includes(c)} onClick={() => toggle(c)}>
            {c}
          </button>
        ))}
      </div>
      {value.length > 0 ? (
        <ul className="chord-grid">
          {value.map((c) => (
            <li key={c} className="chord-card">
              <b>{c}</b>
              <ChordDiagram name={c} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">ยังไม่ได้เลือกคอร์ด ผู้เรียนจะไม่เห็นห้องทดลองคอร์ดในบทนี้</p>
      )}
    </fieldset>
  );
}

export function KindIcon({ kind }: { kind: PageKind }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;
  if (kind === 'text')
    return (
      <svg {...common} className="kind text">
        <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
        <path d="M14 3v5h5M8 13h8M8 17h8M8 9h3" />
      </svg>
    );
  if (kind === 'video')
    return (
      <svg {...common} className="kind video">
        <rect x="3" y="6" width="13" height="12" rx="2" />
        <path d="m16 10 5-3v10l-5-3" />
      </svg>
    );
  return (
    <svg {...common} className="kind quiz">
      <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
      <path d="M14 3v5h5" />
      <path d="m12 11 1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z" />
    </svg>
  );
}

/** Ref for a popup that closes on a click outside it. */
function useOutsideClose(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener('pointerdown', h);
    return () => document.removeEventListener('pointerdown', h);
  }, [open, close]);
  return ref;
}
