'use client';

import Link from 'next/link';
import { useActionState, useState, useTransition } from 'react';
import { Field } from '@/components/Field';
import { FormMessage } from '@/components/FormMessage';
import { SubmitButton } from '@/components/SubmitButton';
import { keepValuesSubmit } from '@/components/useKeepValuesSubmit';
import type { ActionState } from '@/lib/action-state';
import {
  EMAIL_INVALID,
  EMAIL_REQUIRED,
  PASSWORD_MISMATCH,
  PASSWORD_REQUIRED,
  isValidEmail,
  newPasswordError,
} from '@/lib/validation';
import { confirmPendingSignup, requestPasswordReset, signIn, signUp, updatePassword } from './actions';

const initial: ActionState = { ok: false };

type Creds = { email: string; password: string };

const EMAIL_ERROR = EMAIL_INVALID;

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, initial);
  // What is in the two inputs right now; read from the form on input/change/focus so browser autofill counts too.
  const [creds, setCreds] = useState<Creds>({ email: state.values?.email ?? '', password: '' });
  // A malformed email caught when the user pressed "เข้าสู่ระบบ" (checked in the browser, never sent).
  const [rejectedEmail, setRejectedEmail] = useState<string | null>(null);
  // What was sent on the last submit, to tie a wrong-credentials reply to exactly those values.
  const [submitted, setSubmitted] = useState<Creds | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const read = (f: HTMLFormElement): Creds => ({
    email: (f.elements.namedItem('email') as HTMLInputElement | null)?.value ?? '',
    password: (f.elements.namedItem('password') as HTMLInputElement | null)?.value ?? '',
  });
  const sync = (e: React.SyntheticEvent<HTMLFormElement>) => setCreds(read(e.currentTarget));

  // The format is checked only on submit; the message stays until the user edits the email.
  const emailError = rejectedEmail !== null && rejectedEmail === creds.email ? EMAIL_ERROR : undefined;

  // Unknown email and wrong password get the same message on purpose (no account enumeration).
  // It sits under the password field and stays until the user changes what they sent.
  const credsRejected =
    !pending &&
    state.code === 'INVALID_CREDENTIALS' &&
    submitted !== null &&
    submitted.email === creds.email &&
    submitted.password === creds.password;
  const passwordError = credsRejected ? state.message : undefined;
  const canSubmit = creds.email.trim() !== '' && creds.password !== '' && !emailError && !credsRejected;

  return (
    <form
      onSubmit={(e) => {
        const sent = read(e.currentTarget);
        if (!isValidEmail(sent.email)) {
          e.preventDefault();
          setRejectedEmail(sent.email);
          (e.currentTarget.elements.namedItem('email') as HTMLInputElement | null)?.focus();
          return;
        }
        setSubmitted(sent);
        keepValuesSubmit(action)(e);
      }}
      onInput={sync}
      onChange={sync}
      onFocus={sync}
      noValidate
      className="login-form"
    >
      <input type="hidden" name="next" value={next} />
      <Field
        name="email"
        label="อีเมล"
        type="email"
        autoComplete="email"
        placeholder="กรอกอีเมล"
        hideLabel
        error={emailError}
        defaultValue={state.values?.email}
      />
      <Field
        name="password"
        label="รหัสผ่าน"
        type={showPassword ? 'text' : 'password'}
        autoComplete="current-password"
        placeholder="กรอกรหัสผ่าน"
        hideLabel
        error={passwordError}
        adornment={<PasswordToggle controls="password" shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
        footer={
          <Link href="/forgot-password" className="forgot-link">
            ลืมรหัสผ่าน
          </Link>
        }
      />
      <FormMessage state={state.code === 'INVALID_CREDENTIALS' ? { ok: false } : state} />
      <SubmitButton pending={pending} disabled={!canSubmit}>
        เข้าสู่ระบบ
      </SubmitButton>
      {state.code === 'EMAIL_NOT_CONFIRMED' && state.values?.email ? (
        <ResendConfirmation email={state.values.email} />
      ) : null}
    </form>
  );
}

/** Lock button inside a password input: shows/hides the password; amber while shown. */
function PasswordToggle({
  controls,
  shown,
  onToggle,
  label = 'แสดงรหัสผ่าน',
}: {
  controls: string;
  shown: boolean;
  onToggle: () => void;
  label?: string;
}) {
  return (
    <button type="button" className="pw-toggle" aria-label={label} aria-pressed={shown} aria-controls={controls} onClick={onToggle}>
      <LockIcon />
    </button>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

/** Login with an unconfirmed account: email a fresh code and go to the signup code page. */
function ResendConfirmation({ email }: { email: string }) {
  const [pending, start] = useTransition();
  // A button inside the login form cannot nest a <form>; call the action directly.
  return (
    <button type="button" disabled={pending} className="btn-resend" onClick={() => start(() => confirmPendingSignup(email))}>
      ส่งรหัสยืนยันอีเมล
    </button>
  );
}

/**
 * Email, password and confirmation (the server checks again):
 * - email format only when "สมัครสมาชิก" is pressed, like the login page; the message stays until the email is edited.
 *   "กรุณากรอกอีเมล" shows while typing once both passwords are in but the email is empty.
 * - password rules and the confirmation are checked while typing, exactly as on the new-password page
 * An address that already has an account is never flagged here or on the server: every valid signup goes on to the code page.
 */
export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, initial);
  const [values, setValues] = useState({ email: state.values?.email ?? '', password: '', confirm: '' });
  const [show, setShow] = useState({ password: false, confirm: false });
  // A malformed email caught when "สมัครสมาชิก" was pressed (checked in the browser, never sent).
  const [rejectedEmail, setRejectedEmail] = useState<string | null>(null);

  const sync = (e: React.SyntheticEvent<HTMLFormElement>) => {
    const f = e.currentTarget;
    const get = (name: string) => (f.elements.namedItem(name) as HTMLInputElement | null)?.value ?? '';
    setValues({ email: get('email'), password: get('password'), confirm: get('confirm') });
  };

  const email = values.email.trim();
  const emailFormatError = rejectedEmail !== null && rejectedEmail === values.email ? EMAIL_INVALID : undefined;
  const emailMissing = email === '' && values.password !== '' && values.confirm !== '' ? EMAIL_REQUIRED : undefined;
  const serverEmailError = values.email === state.values?.email ? state.fieldErrors?.email : undefined;
  const emailError = emailFormatError ?? emailMissing ?? serverEmailError;

  const rule = newPasswordError(values.password);
  const passwordError = values.password === '' ? (values.confirm !== '' ? PASSWORD_REQUIRED : undefined) : rule;
  const confirmError = values.confirm !== '' && values.confirm !== values.password ? PASSWORD_MISMATCH : undefined;
  const canSubmit = email !== '' && !emailFormatError && !rule && values.confirm === values.password;

  return (
    <form
      onSubmit={(e) => {
        const input = e.currentTarget.elements.namedItem('email') as HTMLInputElement | null;
        if (!isValidEmail(input?.value ?? '')) {
          e.preventDefault();
          setRejectedEmail(input?.value ?? '');
          input?.focus();
          return;
        }
        keepValuesSubmit(action)(e);
      }}
      onInput={sync}
      onChange={sync}
      noValidate
      className="signup-form"
    >
      <Field
        name="email"
        label="อีเมล"
        type="email"
        autoComplete="email"
        placeholder="กรอกอีเมล"
        hideLabel
        error={emailError}
        defaultValue={state.values?.email}
      />
      <Field
        name="password"
        label="รหัสผ่าน"
        type={show.password ? 'text' : 'password'}
        autoComplete="new-password"
        placeholder="กรอกรหัสผ่าน"
        hideLabel
        error={passwordError ?? state.fieldErrors?.password}
        adornment={
          <PasswordToggle controls="password" shown={show.password} onToggle={() => setShow((s) => ({ ...s, password: !s.password }))} />
        }
      />
      <Field
        name="confirm"
        label="ยืนยันรหัสผ่าน"
        type={show.confirm ? 'text' : 'password'}
        autoComplete="new-password"
        placeholder="ยืนยันรหัสผ่าน"
        hideLabel
        error={confirmError ?? state.fieldErrors?.confirm}
        adornment={
          <PasswordToggle
            controls="confirm"
            label="แสดงยืนยันรหัสผ่าน"
            shown={show.confirm}
            onToggle={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
          />
        }
      />
      <FormMessage state={state.fieldErrors ? { ok: false } : state} />
      <SubmitButton pending={pending} disabled={!canSubmit}>
        สมัครสมาชิก
      </SubmitButton>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);
  const [email, setEmail] = useState(state.values?.email ?? '');
  // Same rule as the login page: the email format is checked only when "ถัดไป" is pressed, and the
  // message stays until the email is edited. The server checks again, then every valid address goes to the OTP page.
  const [rejectedEmail, setRejectedEmail] = useState<string | null>(null);
  const emailError =
    rejectedEmail !== null && rejectedEmail === email ? EMAIL_ERROR : email === state.values?.email ? state.fieldErrors?.email : undefined;
  const sync = (e: React.SyntheticEvent<HTMLFormElement>) =>
    setEmail((e.currentTarget.elements.namedItem('email') as HTMLInputElement | null)?.value ?? '');
  return (
    <form
      onSubmit={(e) => {
        const input = e.currentTarget.elements.namedItem('email') as HTMLInputElement | null;
        if (!isValidEmail(input?.value ?? '')) {
          e.preventDefault();
          setRejectedEmail(input?.value ?? '');
          input?.focus();
          return;
        }
        keepValuesSubmit(action)(e);
      }}
      onInput={sync}
      onChange={sync}
      onFocus={sync}
      noValidate
      className="forgot-form"
    >
      <Field
        name="email"
        label="อีเมล"
        type="email"
        autoComplete="email"
        placeholder="กรอกอีเมล"
        hideLabel
        error={emailError}
        defaultValue={state.values?.email}
      />
      <SubmitButton pending={pending} disabled={email.trim() === '' || Boolean(emailError)}>
        ถัดไป
      </SubmitButton>
    </form>
  );
}

/**
 * New password + confirmation, checked while typing (rules in lib/validation newPasswordError; the server checks again).
 * An empty password only complains once the confirmation has something in it; the confirmation only
 * complains once it has something in it and differs.
 */
export function ResetForm() {
  const [state, action, pending] = useActionState(updatePassword, initial);
  const [values, setValues] = useState({ password: '', confirm: '' });
  const [show, setShow] = useState({ password: false, confirm: false });
  const sync = (e: React.SyntheticEvent<HTMLFormElement>) => {
    const f = e.currentTarget;
    const get = (name: string) => (f.elements.namedItem(name) as HTMLInputElement | null)?.value ?? '';
    setValues({ password: get('password'), confirm: get('confirm') });
  };

  const rule = newPasswordError(values.password);
  const passwordError = values.password === '' ? (values.confirm !== '' ? PASSWORD_REQUIRED : undefined) : rule;
  const confirmError = values.confirm !== '' && values.confirm !== values.password ? PASSWORD_MISMATCH : undefined;
  const canSubmit = !rule && values.confirm === values.password;

  return (
    <form onSubmit={keepValuesSubmit(action)} onInput={sync} onChange={sync} onFocus={sync} noValidate className="reset-form">
      <Field
        name="password"
        label="รหัสผ่านใหม่"
        type={show.password ? 'text' : 'password'}
        autoComplete="new-password"
        placeholder="กรอกรหัสผ่าน"
        hideLabel
        error={passwordError ?? state.fieldErrors?.password}
        adornment={
          <PasswordToggle controls="password" shown={show.password} onToggle={() => setShow((s) => ({ ...s, password: !s.password }))} />
        }
      />
      <Field
        name="confirm"
        label="ยืนยันรหัสผ่าน"
        type={show.confirm ? 'text' : 'password'}
        autoComplete="new-password"
        placeholder="ยืนยันรหัสผ่าน"
        hideLabel
        error={confirmError ?? state.fieldErrors?.confirm}
        adornment={
          <PasswordToggle
            controls="confirm"
            label="แสดงยืนยันรหัสผ่าน"
            shown={show.confirm}
            onToggle={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
          />
        }
      />
      <FormMessage state={state} />
      <SubmitButton pending={pending} disabled={!canSubmit}>
        ยืนยัน
      </SubmitButton>
    </form>
  );
}
