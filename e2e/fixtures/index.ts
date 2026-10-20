import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { env } from '../utils/env';
import { createTestUser, deleteTestUser, type TestUser } from '../utils/supabaseAdmin';

type Db = SupabaseClient<Database>;

/** Storage state of the shared read-only member created by auth.setup.ts. */
export const MEMBER_STATE = 'e2e/.auth/member.json';

type Fixtures = {
  cspGuard: boolean;
  member: TestUser;
  memberPage: Page;
  adminPage: Page;
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

/**
 * Collects Content-Security-Policy violations for every page of a context (current and future).
 * Use it for contexts a test creates itself, then assert the returned array is empty.
 */
export function watchCsp(context: BrowserContext): string[] {
  const violations: string[] = [];
  context.on('console', (msg) => {
    if (msg.text().includes('Content Security Policy')) violations.push(msg.text());
  });
  void context.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      console.error(`Content Security Policy violation: ${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  return violations;
}

// Fixtures are lazy: a user is only created when a test requests it.
export const test = base.extend<Fixtures>({
  cspGuard: [true, { option: true }],
  // Wrap `page` (lazy, so API-only tests never create one): fail on CSP violations.
  page: async ({ page, cspGuard }, use) => {
    const violations = watchCsp(page.context());
    await use(page);
    if (cspGuard) expect(violations, 'CSP violations in console').toEqual([]);
  },
  member: async ({}, use) => {
    const user = await createTestUser({ role: 'member' });
    try {
      await use(user);
    } finally {
      await safeDelete(user.id);
    }
  },
  memberPage: async ({ member, page }, use) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(member.email, member.password);
    await page.waitForURL(/\/dashboard/);
    await use(page);
  },
  adminPage: async ({ admin, page }, use) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(admin.email, admin.password);
    await page.waitForURL(/\/dashboard/);
    await use(page);
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
