import { existsSync, readFileSync, rmSync } from 'node:fs';
import { test as teardown } from '@playwright/test';
import { deleteTestUser } from './utils/supabaseAdmin';

teardown('delete shared setup users', async () => {
  const file = 'e2e/.auth/users.json';
  if (existsSync(file)) {
    const { ids } = JSON.parse(readFileSync(file, 'utf8')) as { ids: string[] };
    for (const id of ids) {
      try {
        await deleteTestUser(id);
      } catch (e) {
        console.warn(`teardown: failed to delete test user ${id}`, e);
      }
    }
  }
  rmSync(file, { force: true });
  rmSync('e2e/.auth/member.json', { force: true });
});
