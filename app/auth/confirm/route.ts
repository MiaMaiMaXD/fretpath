import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { safeNextPath } from '@/lib/safe-next';
import { siteUrl } from '@/lib/site-url';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_TYPES: readonly EmailOtpType[] = ['signup', 'recovery', 'email'];

// token_hash + verifyOtp needs no PKCE verifier cookie, so the link works on any device.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = siteUrl();
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = safeNextPath(searchParams.get('next'));

  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  return NextResponse.redirect(new URL('/login?error=link', origin));
}
