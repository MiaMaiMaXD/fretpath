'use client';

import { startTransition, useActionState } from 'react';
import { Field } from '@/components/Field';
import { FormMessage } from '@/components/FormMessage';
import { SubmitButton } from '@/components/SubmitButton';
import { keepValuesSubmit } from '@/components/useKeepValuesSubmit';
import type { ActionState } from '@/lib/action-state';
import { requestPasswordReset, resendConfirmation, signIn, signUp, updatePassword } from './actions';

const initial: ActionState = { ok: false };

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, initial);
  return (
    <form onSubmit={keepValuesSubmit(action)} className="flex flex-col gap-4">
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
      <SubmitButton pending={pending}>เข้าสู่ระบบ</SubmitButton>
      {state.code === 'EMAIL_NOT_CONFIRMED' && state.values?.email ? (
        <ResendConfirmation email={state.values.email} />
      ) : null}
    </form>
  );
}

function ResendConfirmation({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendConfirmation, initial);
  // A button inside the login form cannot nest a <form>; submit the action directly.
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        className="rounded border border-neutral-400 px-4 py-2 disabled:opacity-60"
        onClick={() => {
          const data = new FormData();
          data.set('email', email);
          startTransition(() => action(data));
        }}
      >
        ส่งลิงก์ยืนยันอีกครั้ง
      </button>
      <FormMessage state={state} />
    </div>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, initial);
  return (
    <form onSubmit={keepValuesSubmit(action)} className="flex flex-col gap-4">
      <Field name="email" label="อีเมล" type="email" autoComplete="email" error={state.fieldErrors?.email} defaultValue={state.values?.email} />
      <Field
        name="password"
        label="รหัสผ่าน"
        type="password"
        autoComplete="new-password"
        error={state.fieldErrors?.password}
      />
      <FormMessage state={state} />
      <SubmitButton pending={pending}>สมัครสมาชิก</SubmitButton>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);
  return (
    <form onSubmit={keepValuesSubmit(action)} className="flex flex-col gap-4">
      <Field name="email" label="อีเมล" type="email" autoComplete="email" error={state.fieldErrors?.email} defaultValue={state.values?.email} />
      <FormMessage state={state} />
      <SubmitButton pending={pending}>ส่งลิงก์ตั้งรหัสผ่านใหม่</SubmitButton>
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState(updatePassword, initial);
  return (
    <form onSubmit={keepValuesSubmit(action)} className="flex flex-col gap-4">
      <Field
        name="password"
        label="รหัสผ่านใหม่"
        type="password"
        autoComplete="new-password"
        error={state.fieldErrors?.password}
      />
      <FormMessage state={state} />
      <SubmitButton pending={pending}>ตั้งรหัสผ่านใหม่</SubmitButton>
    </form>
  );
}
