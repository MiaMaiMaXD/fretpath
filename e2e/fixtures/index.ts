import { test as base, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { env } from '../utils/env';
import { createTestUser, deleteTestUser, type TestUser } from '../utils/supabaseAdmin';

type Db = SupabaseClient<Database>;

type Fixtures = {
  member: TestUser;
  otherMember: TestUser;
  admin: TestUser;
  memberDb: Db;
  otherMemberDb: Db;
  adminDb: Db;
  anonDb: Db;
};

function newClient(): Db {
  return createClient<Database>(env.supabaseUrl, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signedInClient(user: TestUser): Promise<Db> {
  const db = newClient();
  const { error } = await db.auth.signInWithPassword({ email: user.email, password: user.password });
  if (error) throw new Error(`signIn failed for ${user.email}: ${error.message}`);
  return db;
}

// Teardown must not mask the test's own error: log cleanup failures instead of throwing.
async function safeDelete(id: string): Promise<void> {
  try {
    await deleteTestUser(id);
  } catch (e) {
    console.warn(`teardown: failed to delete test user ${id}`, e);
  }
}

// Fixtures are lazy: a user is only created when a test requests it.
export const test = base.extend<Fixtures>({
  member: async ({}, use) => {
    const user = await createTestUser({ role: 'member' });
    try {
      await use(user);
    } finally {
      await safeDelete(user.id);
    }
  },
  otherMember: async ({}, use) => {
    const user = await createTestUser({ role: 'member' });
    try {
      await use(user);
    } finally {
      await safeDelete(user.id);
    }
  },
  admin: async ({}, use) => {
    const user = await createTestUser({ role: 'admin' });
    try {
      await use(user);
    } finally {
      await safeDelete(user.id);
    }
  },
  memberDb: async ({ member }, use) => {
    await use(await signedInClient(member));
  },
  otherMemberDb: async ({ otherMember }, use) => {
    await use(await signedInClient(otherMember));
  },
  adminDb: async ({ admin }, use) => {
    await use(await signedInClient(admin));
  },
  anonDb: async ({}, use) => {
    await use(newClient());
  },
});

export { expect };
