import { test, expect } from '../fixtures';
import { adminClient } from '../utils/supabaseAdmin';
import { bangkokDate, lessonIdBySlug } from '../utils/quiz';

let l1: string;
let l2: string;

test.beforeAll(async () => {
  const db = adminClient();
  l1 = await lessonIdBySlug(db, 'guitar-anatomy-tuning');
  l2 = await lessonIdBySlug(db, 'first-chords');
});

test('TC-SEC-01 member cannot read answer keys @security', async ({ memberDb, adminDb }) => {
  // Positive control: the table has rows, admin can read them.
  const control = await adminDb.from('quiz_answer_keys').select('*');
  expect(control.data?.length).toBeGreaterThan(0);
  const { data } = await memberDb.from('quiz_answer_keys').select('*');
  expect(data).toEqual([]);
});

test('TC-SEC-02 member cannot write progress or attempts directly @security', async ({
  memberDb,
  member,
}) => {
  const a = await memberDb
    .from('quiz_attempts')
    .insert({ user_id: member.id, lesson_id: l1, score_pct: 100, passed: true });
  expect(a.error?.code).toBe('42501');
  const p = await memberDb
    .from('lesson_progress')
    .insert({ user_id: member.id, lesson_id: l2, status: 'unlocked' });
  expect(p.error?.code).toBe('42501');
});

test('TC-SEC-03 member cannot promote self to admin @security', async ({ memberDb, member }) => {
  const r = await memberDb.from('profiles').update({ role: 'admin' }).eq('id', member.id);
  expect(r.error?.code).toBe('42501');
  const after = await adminClient().from('profiles').select('role').eq('id', member.id).single();
  expect(after.data?.role).toBe('member');
  const rpc = await memberDb.rpc('set_user_role', { p_user: member.id, p_role: 'admin' });
  expect(rpc.error?.message).toContain('NOT_ADMIN');
});

test('TC-SEC-04 member cannot read another member practice logs @security', async ({
  memberDb,
  otherMemberDb,
  otherMember,
}) => {
  const ins = await otherMemberDb.from('practice_logs').insert({
    user_id: otherMember.id,
    practiced_on: bangkokDate(-1),
    minutes: 15,
    activity: 'chords',
  });
  expect(ins.error).toBeNull();
  const own = await otherMemberDb.from('practice_logs').select('*').eq('user_id', otherMember.id);
  expect(own.data).toHaveLength(1);
  const { data } = await memberDb.from('practice_logs').select('*').eq('user_id', otherMember.id);
  expect(data).toEqual([]);
});

test('TC-SEC-05 anonymous cannot read lessons @security', async ({ anonDb, memberDb }) => {
  // Positive control: an authenticated member sees lessons, so [] is not an empty table.
  const control = await memberDb.from('lessons').select('*');
  expect(control.data?.length).toBeGreaterThan(0);
  expect((await anonDb.from('lessons').select('*')).data).toEqual([]);
});

test('TC-SEC-06 locked lesson shows title but hides content and questions @security', async ({
  memberDb,
}) => {
  // Lesson 2 of the seed is still locked for a brand new user.
  expect((await memberDb.from('lessons').select('title').eq('id', l2)).data).toHaveLength(1);
  expect((await memberDb.from('lesson_contents').select('*').eq('lesson_id', l2)).data).toEqual([]);
  expect((await memberDb.from('quiz_questions').select('*').eq('lesson_id', l2)).data).toEqual([]);
  // Lesson 1 is unlocked: content is visible.
  const open = await memberDb.from('lesson_contents').select('*').eq('lesson_id', l1);
  expect(open.data?.length).toBeGreaterThan(0);
});
