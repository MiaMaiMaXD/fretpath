import type { EmailOtpType } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { safeNextPath } from '@/lib/safe-next';
import { ConfirmForm } from './ConfirmForm';
import { ALLOWED_TYPES } from './types';

// Renders only; the token is verified by the confirmToken Server Action on submit.
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const { token_hash: tokenHash, type, next } = await searchParams;
  if (!tokenHash || !type || !ALLOWED_TYPES.includes(type as EmailOtpType)) redirect('/login?error=link');

  const isRecovery = type === 'recovery';
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-4">
      <h1 className="text-2xl font-semibold">{isRecovery ? 'ตั้งรหัสผ่านใหม่' : 'ยืนยันอีเมล'}</h1>
      <p>{isRecovery ? 'กดปุ่มด้านล่างเพื่อไปตั้งรหัสผ่านใหม่' : 'กดปุ่มด้านล่างเพื่อยืนยันอีเมลและเข้าสู่ระบบ'}</p>
      <ConfirmForm tokenHash={tokenHash} type={type} next={safeNextPath(next ?? null)} />
    </main>
  );
}
