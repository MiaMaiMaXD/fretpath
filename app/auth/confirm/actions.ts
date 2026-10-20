'use server';

import type { EmailOtpType } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { safeNextPath } from '@/lib/safe-next';
import { createClient } from '@/lib/supabase/server';
import { ALLOWED_TYPES } from './types';

const str = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return typeof v === 'string' ? v : '';
};

// token_hash + verifyOtp needs no PKCE verifier cookie, so the link works on any device.
// Runs only on form submit (POST), never on GET, so email scanners cannot consume the token.
export async function confirmToken(formData: FormData): Promise<void> {
  const tokenHash = str(formData, 'token_hash');
  const type = str(formData, 'type') as EmailOtpType;
  const next = safeNextPath(str(formData, 'next'));

  if (tokenHash && ALLOWED_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) redirect(next);
  }
  redirect('/login?error=link');
}
