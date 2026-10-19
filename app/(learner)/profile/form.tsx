'use client';

import { useActionState } from 'react';
import { Field } from '@/components/Field';
import { FormMessage } from '@/components/FormMessage';
import { SubmitButton } from '@/components/SubmitButton';
import { keepValuesSubmit } from '@/components/useKeepValuesSubmit';
import type { ActionState } from '@/lib/action-state';
import { updateProfile } from './actions';

type Props = { displayName: string; weeklyGoalMinutes: number };

export function ProfileForm({ displayName, weeklyGoalMinutes }: Props) {
  const initial: ActionState = { ok: false };
  const [state, action, pending] = useActionState(updateProfile, initial);
  return (
    <form onSubmit={keepValuesSubmit(action)} className="flex max-w-md flex-col gap-4">
      <Field
        name="displayName"
        label="ชื่อที่แสดง"
        error={state.fieldErrors?.displayName}
        defaultValue={state.values?.displayName ?? displayName}
      />
      <Field
        name="weeklyGoalMinutes"
        label="เป้าหมายนาทีฝึกต่อสัปดาห์"
        error={state.fieldErrors?.weeklyGoalMinutes}
        defaultValue={state.values?.weeklyGoalMinutes ?? String(weeklyGoalMinutes)}
      />
      <FormMessage state={state} />
      <SubmitButton pending={pending}>บันทึก</SubmitButton>
    </form>
  );
}
