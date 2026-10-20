import type { EmailOtpType } from '@supabase/supabase-js';

export const ALLOWED_TYPES: readonly EmailOtpType[] = ['signup', 'recovery', 'email'];
