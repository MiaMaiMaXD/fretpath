'use client';

import { useActionState, useRef, useState } from 'react';
import { createPracticeLog } from '@/app/(learner)/practice/actions';
import { FormMessage } from '@/components/FormMessage';
import { PracticeFields, type LessonOption } from '@/components/PracticeFields';
import { PracticeTimer } from '@/components/PracticeTimer';
import { SubmitButton } from '@/components/SubmitButton';
import { keepValuesSubmit } from '@/components/useKeepValuesSubmit';
import type { ActionState } from '@/lib/action-state';

export function PracticeForm({ today, lessons }: { today: string; lessons: LessonOption[] }) {
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
    const input = formRef.current?.elements.namedItem('minutes');
    if (input instanceof HTMLInputElement) input.value = String(minutes);
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <PracticeTimer onUse={fillMinutes} />
      <form ref={formRef} onSubmit={keepValuesSubmit(action)} className="flex flex-col gap-4">
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
            note: v.note ?? '',
            lessonId: v.lessonId ?? '',
          }}
        />
        <FormMessage state={state} />
        <SubmitButton pending={pending}>บันทึก</SubmitButton>
      </form>
    </div>
  );
}
