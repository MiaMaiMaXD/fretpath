'use client';

import { useRouter } from 'next/navigation';
import { useRef, useTransition } from 'react';
import { sendMyPasswordReset } from './actions';
import { PencilIcon } from './icons';
import { useToast } from './Toast';

/** Pencil next to the password row: confirm, then email a 6-digit code and go to the OTP page (same flow as "ลืมรหัสผ่าน"). */
export function PasswordReset({ email }: { email: string }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  function send() {
    startTransition(async () => {
      const res = await sendMyPasswordReset();
      dlg.current?.close();
      // Success goes straight to the OTP page (that page says the code was sent); only failures need a toast.
      if (res.ok) router.push('/forgot-password/verify');
      else toast({ message: res.message ?? 'ส่งไม่สำเร็จ', error: true });
    });
  }

  return (
    <>
      <button type="button" className="icon-btn" aria-label="เปลี่ยนรหัสผ่าน" onClick={() => dlg.current?.showModal()}>
        <PencilIcon />
      </button>
      <dialog ref={dlg} className="dlg" aria-labelledby="pass-dlg-h">
        <h3 id="pass-dlg-h">เปลี่ยนรหัสผ่าน</h3>
        <p>
          เราจะส่งรหัส OTP สำหรับตั้งรหัสผ่านใหม่ไปที่ <b>{email}</b>
        </p>
        <div className="dlg-actions">
          <button type="button" className="btn" onClick={() => dlg.current?.close()} disabled={pending}>
            ยกเลิก
          </button>
          <button type="button" className="btn btn-dark" onClick={send} disabled={pending}>
            {pending ? 'กำลังส่ง…' : 'ส่งรหัส'}
          </button>
        </div>
      </dialog>
    </>
  );
}
