'use client';

import { useActionState } from 'react';
import { SubmitButton } from '@/components/SubmitButton';
import { keepValuesSubmit } from '@/components/useKeepValuesSubmit';
import { confirmToken } from './actions';

export function ConfirmForm({ tokenHash, type, next }: { tokenHash: string; type: string; next: string }) {
  const [, action, pending] = useActionState(async (_prev: null, data: FormData) => {
    await confirmToken(data);
    return null;
  }, null);
  return (
    <form action={action} onSubmit={keepValuesSubmit(action)} className="flex flex-col gap-4">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="next" value={next} />
      <SubmitButton pending={pending}>ยืนยันและเข้าสู่ระบบ</SubmitButton>
    </form>
  );
}
