'use client';

import { useActionState, useRef } from 'react';
import { createPracticeLog } from '@/app/(learner)/practice/actions';
import { FormMessage } from '@/components/FormMessage';
import { PracticeFields, type LessonOption } from '@/components/PracticeFields';
import { PracticeTimer } from '@/components/PracticeTimer';
import { SubmitButton } from '@/components/SubmitButton';
import type { ActionState } from '@/lib/action-state';

export function PracticeForm({ today, lessons }: { today: string; lessons: LessonOption[] }) {
  const initial: ActionState = { ok: false };
  const [state, action] = useActionState(createPracticeLog, initial);
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
      <form ref={formRef} action={action} className="flex flex-col gap-4">
        <PracticeFields
          today={today}
          lessons={lessons}
          errors={state.fieldErrors}
          values={{
            practicedOn: v.practicedOn ?? today,
            minutes: v.minutes ?? '',
            activity: v.activity ?? '',
            note: v.note ?? '',
            lessonId: v.lessonId ?? '',
          }}
        />
        <FormMessage state={state} />
        <SubmitButton>บันทึก</SubmitButton>
      </form>
    </div>
  );
}
