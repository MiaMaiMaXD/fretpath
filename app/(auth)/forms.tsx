'use client';

import { useActionState } from 'react';
import { Field } from '@/components/Field';
import { FormMessage } from '@/components/FormMessage';
import { SubmitButton } from '@/components/SubmitButton';
import type { ActionState } from '@/lib/action-state';
import { requestPasswordReset, signIn, signUp, updatePassword } from './actions';

const initial: ActionState = { ok: false };

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, initial);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <Field name="email" label="อีเมล" type="email" autoComplete="email" error={state.fieldErrors?.email} defaultValue={state.values?.email} />
      <Field
        name="password"
        label="รหัสผ่าน"
        type="password"
        autoComplete="current-password"
        error={state.fieldErrors?.password}
      />
      <FormMessage state={state} />
      <SubmitButton>เข้าสู่ระบบ</SubmitButton>
    </form>
  );
}

export function SignupForm() {
  const [state, action] = useActionState(signUp, initial);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field name="email" label="อีเมล" type="email" autoComplete="email" error={state.fieldErrors?.email} defaultValue={state.values?.email} />
      <Field
        name="password"
        label="รหัสผ่าน"
        type="password"
        autoComplete="new-password"
        error={state.fieldErrors?.password}
      />
      <FormMessage state={state} />
      <SubmitButton>สมัครสมาชิก</SubmitButton>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(requestPasswordReset, initial);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field name="email" label="อีเมล" type="email" autoComplete="email" error={state.fieldErrors?.email} defaultValue={state.values?.email} />
      <FormMessage state={state} />
      <SubmitButton>ส่งลิงก์ตั้งรหัสผ่านใหม่</SubmitButton>
    </form>
  );
}

export function ResetForm() {
  const [state, action] = useActionState(updatePassword, initial);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field
        name="password"
        label="รหัสผ่านใหม่"
        type="password"
        autoComplete="new-password"
        error={state.fieldErrors?.password}
      />
      <FormMessage state={state} />
      <SubmitButton>ตั้งรหัสผ่านใหม่</SubmitButton>
    </form>
  );
}
