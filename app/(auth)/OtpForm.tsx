'use client';

import { startTransition, useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { SubmitButton } from '@/components/SubmitButton';
import type { ActionState } from '@/lib/action-state';
import {
  OTP_EXPIRED_MESSAGE,
  OTP_LENGTH,
  OTP_RESEND_SECONDS,
  OTP_TTL_SECONDS,
  formatClock,
  otpDigits,
} from '@/lib/otp';

const initial: ActionState = { ok: false };
const EMPTY = Array.from({ length: OTP_LENGTH }, () => '');

/**
 * Six one-digit boxes. Focus starts in the first box; typing moves right, Backspace on an empty box moves left,
 * pasting or one-time-code autofill spreads the digits. The code is checked only when the user presses "ถัดไป".
 */
export function OtpForm({
  expiresIn,
  resendIn,
  verify,
  resend: resendAction,
}: {
  expiresIn: number;
  resendIn: number;
  /** Server action that checks the code and redirects on success (password reset or signup). */
  verify: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  resend: () => Promise<{ ok: boolean; message?: string }>;
}) {
  const [state, action, pending] = useActionState(verify, initial);
  const [digits, setDigits] = useState<string[]>(EMPTY);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown: seconds since mount, and the window values (reset by "ส่งอีกครั้ง").
  const [elapsed, setElapsed] = useState(0);
  const [clock, setClock] = useState({ expiresIn, resendIn, since: 0 });
  const mountedAt = useRef<number | null>(null);
  useEffect(() => {
    mountedAt.current = Date.now();
    const id = setInterval(() => {
      if (mountedAt.current !== null) setElapsed(Math.floor((Date.now() - mountedAt.current) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, []);
  const expiryLeft = Math.max(0, clock.expiresIn - (elapsed - clock.since));
  const resendLeft = Math.max(0, clock.resendIn - (elapsed - clock.since));
  const expired = expiryLeft === 0;

  const [resending, startResend] = useTransition();
  const [notice, setNotice] = useState('');

  const code = digits.join('');
  const complete = code.length === OTP_LENGTH;
  // A rejected code stays marked until the user changes a digit.
  const rejected = !pending && state.code === 'OTP_INVALID' && submitted === code;
  const serverExpired = !pending && state.code === 'OTP_EXPIRED' && submitted === code;
  const otherError = !pending && submitted === code && state.message && !rejected && !serverExpired ? state.message : '';
  const error = expired || serverExpired ? OTP_EXPIRED_MESSAGE : rejected ? state.message : otherError;
  const canSubmit = complete && !expired && !rejected && !serverExpired;

  function submit(value: string) {
    setSubmitted(value);
    const data = new FormData();
    data.set('token', value);
    startTransition(() => action(data));
  }

  function update(next: string[], focusIndex: number) {
    setDigits(next);
    setNotice('');
    boxes.current[Math.min(focusIndex, OTP_LENGTH - 1)]?.focus();
  }

  function fill(from: number, text: string) {
    const incoming = otpDigits(text);
    if (incoming.length === 0) return;
    const next = [...digits];
    incoming.forEach((d, k) => {
      if (from + k < OTP_LENGTH) next[from + k] = d;
    });
    update(next, from + incoming.length);
  }

  function onChange(i: number, raw: string, inserted: string | null) {
    const typed = raw.replace(/\D/g, '');
    if (typed.length === 0) {
      const next = [...digits];
      next[i] = '';
      setDigits(next);
      return;
    }
    // A full code (one-time-code autofill) fills from the start; otherwise keep the newest digit typed.
    if (typed.length === OTP_LENGTH) return fill(0, typed);
    // One key typed into a box that already holds a digit: take exactly that key. Going by the value alone
    // breaks when the caret sits before the old digit ("10"), which would push the old digit into the next box.
    if (typed.length > 1 && inserted !== null && /^\d$/.test(inserted)) return fill(i, inserted);
    if (typed.length > 1) {
      const previous = digits[i];
      const fresh = typed.startsWith(previous) ? typed.slice(previous.length) : typed;
      return fill(i, fresh);
    }
    fill(i, typed);
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    // A digit key always replaces this box and moves on. Left to the browser, typing the digit the box already
    // holds changes nothing, fires no change event, and the next digit would land in the same box.
    if (/^\d$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      fill(i, e.key);
      return;
    }
    if (e.key === 'Backspace' && digits[i] === '' && i > 0) {
      e.preventDefault();
      const next = [...digits];
      next[i - 1] = '';
      setDigits(next);
      boxes.current[i - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault();
      boxes.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < OTP_LENGTH - 1) {
      e.preventDefault();
      boxes.current[i + 1]?.focus();
    }
  }

  function resend() {
    startResend(async () => {
      const res = await resendAction();
      if (res.ok) {
        setClock({ expiresIn: OTP_TTL_SECONDS, resendIn: OTP_RESEND_SECONDS, since: elapsed });
        setDigits(EMPTY);
        setSubmitted(null);
        boxes.current[0]?.focus();
      }
      setNotice(res.message ?? '');
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) submit(code);
      }}
      className="otp-form"
      noValidate
    >
      <p className="otp-expiry" aria-live="off">
        หมดอายุภายใน ({formatClock(expiryLeft)})
      </p>
      <div className={`otp-boxes${error ? ' is-invalid' : ''}`} role="group" aria-labelledby="otp-heading">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              boxes.current[i] = el;
            }}
            value={d}
            onChange={(e) => onChange(i, e.target.value, (e.nativeEvent as InputEvent).data ?? null)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={(e) => {
              e.preventDefault();
              fill(i, e.clipboardData.getData('text'));
            }}
            onFocus={(e) => e.target.select()}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            pattern="[0-9]*"
            autoFocus={i === 0}
            aria-label={`รหัส OTP หลักที่ ${i + 1} จาก ${OTP_LENGTH}`}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'otp-error' : undefined}
            className="otp-box"
          />
        ))}
      </div>
      {error ? (
        <p id="otp-error" role="alert" className="otp-error">
          {error}
        </p>
      ) : null}
      <p className="otp-resend">
        ไม่ได้รับข้อความ?{' '}
        <button type="button" className="link-btn" onClick={resend} disabled={resendLeft > 0 || resending}>
          ส่งอีกครั้ง
        </button>{' '}
        ({resendLeft} วินาที)
      </p>
      <p className="otp-notice" role="status">
        {notice}
      </p>
      <SubmitButton pending={pending} disabled={!canSubmit}>
        ถัดไป
      </SubmitButton>
    </form>
  );
}
