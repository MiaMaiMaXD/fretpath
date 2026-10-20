'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { setUserRole } from '@/app/(admin)/admin/learners/actions';

const BTN = 'rounded border border-neutral-400 px-3 py-2 disabled:opacity-50';

function ConfirmDialog({
  userId,
  name,
  target,
  onClose,
}: {
  userId: string;
  name: string;
  target: 'member' | 'admin';
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (d && !d.open) {
      d.showModal();
      cancelRef.current?.focus();
    }
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`role-title-${userId}`}
      onClose={onClose}
      onCancel={(e) => {
        if (pending) e.preventDefault();
      }}
      className="m-auto w-full max-w-sm rounded bg-white p-4 text-neutral-900 backdrop:bg-black/50 dark:bg-neutral-900 dark:text-neutral-100"
    >
      <div className="flex flex-col gap-3">
        <h2 id={`role-title-${userId}`} className="text-lg font-semibold">
          {target === 'admin' ? `ตั้ง ${name} เป็นผู้ดูแล?` : `ลด ${name} เป็นผู้เรียน?`}
        </h2>
        {message ? (
          <p role="alert" className="text-red-600">
            {message}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            className="rounded bg-neutral-900 px-4 py-2 font-medium text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
            onClick={() =>
              start(async () => {
                const r = await setUserRole(userId, target);
                if (r.ok) {
                  dialogRef.current?.close();
                  router.refresh();
                } else setMessage(r.message ?? null);
              })
            }
          >
            ยืนยัน
          </button>
          <button ref={cancelRef} type="button" disabled={pending} className={BTN} onClick={() => dialogRef.current?.close()}>
            ยกเลิก
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function RoleButton({ userId, name, role }: { userId: string; name: string; role: 'member' | 'admin' }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const target = role === 'admin' ? 'member' : 'admin';
  return (
    <>
      <button ref={btnRef} type="button" className={BTN} onClick={() => setOpen(true)}>
        {role === 'admin' ? 'ลดเป็นผู้เรียน' : 'ตั้งเป็นผู้ดูแล'}
      </button>
      {open ? (
        <ConfirmDialog
          userId={userId}
          name={name}
          target={target}
          onClose={() => {
            setOpen(false);
            btnRef.current?.focus();
          }}
        />
      ) : null}
    </>
  );
}
