import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { env } from './env';

export type TestUser = {
  id: string;
  email: string;
  password: string;
  role: 'member' | 'admin';
};

export function adminClient() {
  return createClient<Database>(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function createTestUser(
  opts: { role?: 'member' | 'admin'; displayName?: string } = {},
): Promise<TestUser> {
  const role = opts.role ?? 'member';
  const admin = adminClient();
  const email = `qa+${randomUUID()}@fretpath.test`;
  const password = `Pw-${randomUUID()}`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: opts.displayName ? { display_name: opts.displayName } : undefined,
  });
  if (error || !data.user) throw new Error(`createTestUser failed: ${error?.message}`);
  const id = data.user.id;

  if (role === 'admin') {
    const { data: updated, error: roleError } = await admin
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select('role')
      .single();
    if (roleError || updated?.role !== 'admin') {
      await admin.auth.admin.deleteUser(id);
      throw new Error(`createTestUser role update failed: ${roleError?.message ?? 'role not applied'}`);
    }
  }
  return { id, email, password, role };
}

export async function deleteTestUser(id: string): Promise<void> {
  const { error } = await adminClient().auth.admin.deleteUser(id);
  if (error) throw new Error(`deleteTestUser failed: ${error.message}`);
}
