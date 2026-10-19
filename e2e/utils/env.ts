function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  /** Defaults to http://localhost:3000 when BASE_URL is unset. */
  get baseURL(): string {
    return process.env.BASE_URL ?? 'http://localhost:3000';
  },
  get supabaseUrl(): string {
    return required('NEXT_PUBLIC_SUPABASE_URL');
  },
  get anonKey(): string {
    return required('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  },
  get serviceRoleKey(): string {
    return required('SUPABASE_SERVICE_ROLE_KEY');
  },
};
