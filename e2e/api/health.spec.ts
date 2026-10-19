import { test, expect } from '../fixtures';

test('health endpoint reports database reachable @smoke', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});

test('new test user gets member profile @smoke', async ({ memberDb, member }) => {
  const { data } = await memberDb.from('profiles').select('role').eq('id', member.id).single();
  expect(data?.role).toBe('member');
});
