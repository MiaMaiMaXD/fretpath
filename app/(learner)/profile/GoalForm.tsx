'use client';

import { useState, useTransition } from 'react';
import { goalDigits, goalInputError } from '@/lib/profile-ui';
import { updateWeeklyGoal } from './actions';
import { useToast } from './Toast';

export function GoalForm({ initialGoal }: { initialGoal: number }) {
  const [saved, setSaved] = useState(initialGoal);
  const [value, setValue] = useState(String(initialGoal));
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const error = goalInputError(value) || serverError;
  const canSave = !error && Number(value) !== saved && !pending;

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    const next = Number(value);
    const old = saved;
    toast(null); // an older "เลิกทำ" would undo the wrong value
    startTransition(async () => {
      const res = await updateWeeklyGoal(String(next));
      if (!res.ok) {
        setServerError(res.message ?? 'บันทึกไม่สำเร็จ');
        return;
      }
      setSaved(next);
      toast({
        message: 'บันทึกเป้าหมายแล้ว',
        undo: () =>
          startTransition(async () => {
            const back = await updateWeeklyGoal(String(old));
            if (back.ok) {
              setSaved(old);
              setValue(String(old));
            } else toast({ message: back.message ?? 'เลิกทำไม่สำเร็จ', error: true });
          }),
      });
    });
  }

  return (
    <section id="goal" className="goal" aria-labelledby="goal-h">
      <h2 id="goal-h">เป้าหมายการฝึกต่อสัปดาห์</h2>
      <p className="sec-hint">ใช้คำนวณแถบ &quot;สัปดาห์นี้&quot; ในหน้าภาพรวม</p>
      <form className="goal-field" onSubmit={save} noValidate>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          aria-labelledby="goal-h"
          aria-describedby="goal-err"
          aria-invalid={error ? true : undefined}
          data-testid="goal-input"
          value={value}
          onBeforeInput={(e) => {
            // block a typed non-digit key; longer text (paste, autofill) is cleaned in onChange instead
            const data = (e.nativeEvent as InputEvent).data;
            if (data && data.length === 1 && /\D/.test(data)) e.preventDefault();
          }}
          onChange={(e) => {
            setServerError(null);
            setValue(goalDigits(e.target.value));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setServerError(null);
              setValue(String(saved));
            }
          }}
        />
        <span className="in-right">
          <span className="unit">นาที</span>
          <button className="btn btn-dark" disabled={!canSave} aria-label="บันทึกเป้าหมาย">
            {pending ? 'กำลังบันทึก…' : 'บันทึก'}
          </button>
        </span>
      </form>
      {error ? (
        <p className="field-err" id="goal-err" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
