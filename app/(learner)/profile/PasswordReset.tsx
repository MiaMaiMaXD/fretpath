'use client';

import { useRef, useTransition } from 'react';
import { sendMyPasswordReset } from './actions';
import { PencilIcon } from './icons';
import { useToast } from './Toast';

/** Pencil next to the password row: confirm, then email a reset link (the existing reset flow). */
export function PasswordReset({ email }: { email: string }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function send() {
    startTransition(async () => {
      const res = await sendMyPasswordReset();
      dlg.current?.close();
      toast({ message: res.message ?? (res.ok ? 'ส่งลิงก์แล้ว' : 'ส่งไม่สำเร็จ'), error: !res.ok });
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
          เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่ <b>{email}</b>
        </p>
        <div className="dlg-actions">
          <button type="button" className="btn" onClick={() => dlg.current?.close()} disabled={pending}>
            ยกเลิก
          </button>
          <button type="button" className="btn btn-dark" onClick={send} disabled={pending}>
            {pending ? 'กำลังส่ง…' : 'ส่งลิงก์'}
          </button>
        </div>
      </dialog>
    </>
  );
}
