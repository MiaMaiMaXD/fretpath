'use client';

import { useActionState, useRef, useState } from 'react';
import { createPracticeLog } from '@/app/(learner)/practice/actions';
import { FormMessage } from '@/components/FormMessage';
import { Metronome } from '@/components/Metronome';
import { PracticeFields, type LessonOption } from '@/components/PracticeFields';
import { PracticeTimer } from '@/components/PracticeTimer';
import { keepValuesSubmit } from '@/components/useKeepValuesSubmit';
import type { ActionState } from '@/lib/action-state';

export function PracticeForm({ today, lessons, week }: { today: string; lessons: LessonOption[]; week: React.ReactNode }) {
  const initial: ActionState = { ok: false };
  const [saves, setSaves] = useState(0);
  const [state, action, pending] = useActionState(createPracticeLog, initial);
  // Remount the fields when a save succeeds, in the same render that receives the new state
  // (no automatic form reset any more, and the fields must pick up the cleared defaults).
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.ok) setSaves((n) => n + 1);
  }
  const formRef = useRef<HTMLFormElement>(null);
  const v = state.values ?? {};

  // Writes straight into the uncontrolled input; its defaultValue (and key) are unchanged, so it is not remounted.
  function fillMinutes(minutes: number) {
    const form = formRef.current;
    const input = form?.elements.namedItem('minutes');
    if (!(input instanceof HTMLInputElement)) return;
    input.value = String(minutes);
    input.classList.remove('flash');
    void input.offsetWidth; // restart the highlight animation
    input.classList.add('flash');
    // Bring the sheet into view and put the cursor where the learner types next.
    form?.closest('section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const topic = form?.elements.namedItem('topic');
    if (topic instanceof HTMLInputElement) topic.focus({ preventScroll: true });
  }

  return (
    <>
      <div className="stage" role="group" aria-label="เครื่องมือระหว่างซ้อม">
        <PracticeTimer onFinish={fillMinutes} week={week} />
        <Metronome />
      </div>

      <section className="sheet" aria-labelledby="form-title">
        <h2 id="form-title">จดบันทึกรอบนี้</h2>
        <p className="hint">กด “จบรอบ แล้วจดบันทึก” เวลาจะถูกกรอกให้ แก้ได้ถ้าไม่ตรง</p>
        <form ref={formRef} onSubmit={keepValuesSubmit(action)}>
          <PracticeFields
            // No automatic form reset any more: remount to clear the fields after a successful save.
            key={saves}
            today={today}
            lessons={lessons}
            errors={state.fieldErrors}
            noteResetKey={saves}
            values={{
              practicedOn: v.practicedOn ?? today,
              minutes: v.minutes ?? '',
              activity: v.activity ?? '',
              topic: v.topic ?? '',
              feeling: v.feeling ?? '',
              note: v.note ?? '',
              lessonId: v.lessonId ?? '',
            }}
          />
          <FormMessage state={state} />
          <button type="submit" className="btn btn-amber save-btn" disabled={pending}>
            {pending ? 'กำลังบันทึก…' : 'บันทึกการซ้อม'}
          </button>
        </form>
      </section>
    </>
  );
}
