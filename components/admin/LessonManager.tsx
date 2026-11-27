'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import {
  addLessonToSection,
  addSection,
  deleteLesson,
  deleteSection,
  renameSection,
  reorderLessons,
} from '@/app/(admin)/admin/lessons/actions';
import { ConfirmDialog } from './ConfirmDialog';

export type ManagerLesson = { id: string; no: number; title: string; status: 'draft' | 'published' };
/** A section ("ช่วง"); `n` is its position (ช่วงที่ n), `title` its editable name. */
export type ManagerUnit = { id: string; n: number; title: string; published: boolean; lessons: ManagerLesson[] };

type Pending = { kind: 'lesson'; lesson: ManagerLesson } | { kind: 'section'; unit: ManagerUnit } | null;

const label = (u: ManagerUnit) => `ช่วงที่ ${u.n} :${u.title ? ` ${u.title}` : ''}`;

/** Sections with their lessons: drag lessons inside a section, ⋯ menus for แก้ไข / ลบ, add lesson per section. */
export function LessonManager({ courseId, units, order }: { courseId: string; units: ManagerUnit[]; order: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  // Optimistic copy of the lessons per section while a reorder is saving.
  const [optimistic, setOptimistic] = useState<ManagerUnit[] | null>(null);
  const view = optimistic ?? units;
  const [dragging, setDragging] = useState<{ unit: string; id: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Pending>(null);

  function run(task: () => Promise<{ ok: boolean; message?: string }>, okText?: string, after?: () => void) {
    start(async () => {
      const res = await task();
      setMessage(res.ok ? (okText ? { ok: true, text: okText } : null) : { ok: false, text: res.message ?? 'ทำรายการไม่สำเร็จ' });
      if (res.ok) after?.();
      router.refresh();
      setOptimistic(null);
    });
  }

  function saveOrder(next: ManagerUnit[]) {
    // Each section keeps the same course positions; only the lessons inside it swap places.
    const slots = new Map<string, string>();
    units.forEach((u, ui) => u.lessons.forEach((l, li) => slots.set(l.id, next[ui].lessons[li].id)));
    const fd = new FormData();
    order.map((id) => slots.get(id) ?? id).forEach((id, i) => fd.set(`order-${id}`, String(i + 1)));
    run(() => reorderLessons(courseId, { ok: false }, fd), 'บันทึกลำดับแล้ว');
  }

  function move(unitId: string, fromId: string, toId: string) {
    if (fromId === toId) return;
    const next = view.map((u) => {
      if (u.id !== unitId) return u;
      const list = [...u.lessons];
      const to = list.findIndex((l) => l.id === toId);
      const [item] = list.splice(list.findIndex((l) => l.id === fromId), 1);
      list.splice(to, 0, item); // takes the target's place
      // numbers stay with the position, not the lesson
      return { ...u, lessons: list.map((l, i) => ({ ...l, no: u.lessons[i].no })) };
    });
    setOptimistic(next);
    saveOrder(next);
  }

  function onConfirm() {
    if (!confirm) return;
    if (confirm.kind === 'lesson') {
      const l = confirm.lesson;
      run(() => deleteLesson(l.id), `ลบ "${l.title}" แล้ว`, () => setConfirm(null));
    } else {
      const u = confirm.unit;
      run(() => deleteSection(u.id), `ลบช่วงที่ ${u.n} แล้ว`, () => setConfirm(null));
    }
  }

  return (
    <>
      <p className={`status-msg ${message?.ok === false ? 'err' : ''}`} role="status" aria-live="polite">
        {pending ? 'กำลังบันทึก…' : message?.text}
      </p>
      {view.length === 0 ? <p className="empty">ยังไม่มีช่วงบทเรียน กด “เพิ่มช่วงบทเรียน” เพื่อเริ่ม</p> : null}
      {view.map((u) => (
        <section key={u.id} className="unit" aria-label={label(u)} data-testid="lm-section">
          <div className="unit-head">
            <span className={`badge ${u.published ? 'pub' : 'draft'}`}>{u.published ? 'เผยแพร่' : 'แบบร่าง'}</span>
            {editing === u.id ? (
              <RenameForm
                unit={u}
                pending={pending}
                onCancel={() => setEditing(null)}
                onSave={(title) => run(() => renameSection(u.id, title), 'บันทึกชื่อช่วงแล้ว', () => setEditing(null))}
              />
            ) : (
              <h2>{label(u)}</h2>
            )}
            <Kebab label={`ตัวเลือกของช่วงที่ ${u.n}`} tone="amber">
              <li>
                <button type="button" onClick={() => setEditing(u.id)}>
                  <EditIcon />
                  แก้ไข
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setConfirm({ kind: 'section', unit: u })}>
                  <TrashIcon />
                  ลบ
                </button>
              </li>
            </Kebab>
          </div>

          {u.lessons.length === 0 ? (
            <p className="empty">ยังไม่มีบทเรียน</p>
          ) : (
            <ol className="lessons">
              {u.lessons.map((l) => (
                <li
                  key={l.id}
                  className={`lesson ${dragging?.id === l.id ? 'is-dragging' : ''}`}
                  data-testid="lm-lesson"
                  draggable={!pending}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    setDragging({ unit: u.id, id: l.id });
                  }}
                  onDragEnd={() => setDragging(null)}
                  onDragOver={(e) => {
                    if (dragging?.unit === u.id) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragging?.unit === u.id) move(u.id, dragging.id, l.id);
                    setDragging(null);
                  }}
                >
                  <span className="grip" aria-hidden="true" title="ลากเพื่อเรียงลำดับ">
                    <svg viewBox="0 0 10 16" fill="currentColor">
                      <circle cx="2" cy="2" r="1.6" /><circle cx="8" cy="2" r="1.6" />
                      <circle cx="2" cy="8" r="1.6" /><circle cx="8" cy="8" r="1.6" />
                      <circle cx="2" cy="14" r="1.6" /><circle cx="8" cy="14" r="1.6" />
                    </svg>
                  </span>
                  <span className={`dot ${l.status === 'published' ? 'pub' : 'draft'}`} />
                  <span className="sr-only">{l.status === 'published' ? 'เผยแพร่' : 'แบบร่าง'}</span>
                  <span className="no">{l.no}</span>
                  <Link href={`/admin/lessons/${l.id}`} className="title">
                    {l.title}
                  </Link>
                  <Kebab label={`ตัวเลือกของ ${l.title}`}>
                    <li>
                      <Link href={`/admin/lessons/${l.id}`}>
                        <EditIcon />
                        แก้ไข
                      </Link>
                    </li>
                    <li>
                      <button type="button" onClick={() => setConfirm({ kind: 'lesson', lesson: l })}>
                        <TrashIcon />
                        ลบ
                      </button>
                    </li>
                  </Kebab>
                </li>
              ))}
            </ol>
          )}

          <button
            type="button"
            className="btn btn-primary btn-wide"
            disabled={pending}
            onClick={() => run(() => addLessonToSection(u.id), 'เพิ่มบทเรียนใหม่แล้ว')}
          >
            <span aria-hidden="true">+</span> เพิ่มบทเรียน
          </button>
        </section>
      ))}

      <ConfirmDialog
        open={confirm !== null}
        title="คุณต้องการจะลบหรือไม่?"
        detail={
          confirm?.kind === 'lesson'
            ? `“${confirm.lesson.title}” จะหายไปถาวร`
            : confirm?.kind === 'section'
              ? `${label(confirm.unit)} จะหายไปถาวร`
              : undefined
        }
        pending={pending}
        onConfirm={onConfirm}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

/** "+ เพิ่มช่วงบทเรียน" in the page header: appends an empty draft section. */
export function AddSectionButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="add-section">
      <button
        type="button"
        className="btn btn-primary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await addSection(courseId);
            setError(res.ok ? null : (res.message ?? 'เพิ่มช่วงไม่สำเร็จ'));
            router.refresh();
          })
        }
      >
        <span aria-hidden="true">+</span> เพิ่มช่วงบทเรียน
      </button>
      {error ? (
        <p className="err" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function RenameForm({
  unit,
  pending,
  onSave,
  onCancel,
}: {
  unit: ManagerUnit;
  pending: boolean;
  onSave: (title: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(unit.title);
  return (
    <form
      className="rename"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(title);
      }}
    >
      <span className="rename-n">ช่วงที่ {unit.n} :</span>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
        }}
        maxLength={120}
        placeholder="ชื่อช่วง"
        aria-label={`ชื่อของช่วงที่ ${unit.n}`}
        autoFocus
      />
      <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
        บันทึก
      </button>
      <button type="button" className="btn btn-slate btn-sm" onClick={onCancel} disabled={pending}>
        ยกเลิก
      </button>
    </form>
  );
}

/** "⋯" button with a small navy menu; closes on outside click or Escape. */
function Kebab({ label, tone, children }: { label: string; tone?: 'amber'; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: Event) => {
      const el = ref.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, []);
  return (
    <details className={`kebab ${tone ?? ''}`} ref={ref}>
      <summary aria-label={label}>
        <svg viewBox="0 0 24 6" fill="currentColor" aria-hidden="true">
          <circle cx="3" cy="3" r="2.6" /><circle cx="12" cy="3" r="2.6" /><circle cx="21" cy="3" r="2.6" />
        </svg>
      </summary>
      <ul className="kebab-menu" onClick={() => ref.current && (ref.current.open = false)}>
        {children}
      </ul>
    </details>
  );
}

const icon = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;
const EditIcon = () => (
  <svg {...icon} className="ic-edit">
    <path d="M4 21h16M14.5 4.5l3 3L8 17H5v-3z" />
  </svg>
);
const TrashIcon = () => (
  <svg {...icon} className="ic-trash">
    <path d="M4 7h16M10 3h4M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6" />
  </svg>
);
