'use client';

import { useRef, useState, useTransition } from 'react';
import { clampName } from '@/lib/profile-ui';
import { DISPLAY_NAME_MAX, nameLength } from '@/lib/validation';
import { updateDisplayName } from './actions';
import { PencilIcon } from './icons';
import { useToast } from './Toast';

export function NameEditor({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editBtn = useRef<HTMLButtonElement>(null);
  const toast = useToast();

  // Server actions revalidate the layout, so the header menu and avatar initial follow on their own.
  const apply = setName;

  function open() {
    setDraft(name);
    setError(null);
    setEditing(true);
  }
  function close() {
    setEditing(false);
    setError(null);
    // wait for the button to come back, then return focus to it
    requestAnimationFrame(() => editBtn.current?.focus());
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const next = draft.trim();
    if (!next) {
      setError('กรุณาใส่ชื่อ');
      return;
    }
    if (next === name) {
      close();
      return;
    }
    const old = name;
    toast(null); // an older "เลิกทำ" would undo the wrong value
    startTransition(async () => {
      const res = await updateDisplayName(next);
      if (!res.ok) {
        setError(res.message ?? 'บันทึกไม่สำเร็จ');
        return;
      }
      apply(next);
      close();
      toast({
        message: 'บันทึกชื่อแล้ว',
        undo: () =>
          startTransition(async () => {
            const back = await updateDisplayName(old);
            if (back.ok) apply(old);
            else toast({ message: back.message ?? 'เลิกทำไม่สำเร็จ', error: true });
          }),
      });
    });
  }

  const count = nameLength(draft);
  const countClass = count >= DISPLAY_NAME_MAX ? 'count full' : count >= DISPLAY_NAME_MAX - 5 ? 'count near' : 'count';

  if (!editing) {
    return (
      <div className="name-row">
        <span className="name" data-testid="profile-name">
          {name}
        </span>
        <button type="button" className="icon-btn" aria-label="แก้ชื่อที่แสดง" onClick={open} ref={editBtn}>
          <PencilIcon />
        </button>
      </div>
    );
  }

  return (
    <form className="name-edit" onSubmit={save} noValidate>
      <span className="name-box">
        <input
          className="input"
          aria-label="ชื่อที่แสดง"
          aria-describedby="name-count"
          aria-invalid={error ? true : undefined}
          autoComplete="nickname"
          autoFocus
          value={draft}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            setError(null);
            setDraft(clampName(e.target.value));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              close();
            }
          }}
        />
        <span className={countClass} id="name-count">
          {count}/{DISPLAY_NAME_MAX}
        </span>
      </span>
      <button className="btn btn-dark" disabled={pending} aria-label="บันทึกชื่อ">
        {pending ? 'กำลังบันทึก…' : 'บันทึก'}
      </button>
      <button type="button" className="btn" onClick={close} disabled={pending}>
        ยกเลิก
      </button>
      {error ? (
        <p className="field-err" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
