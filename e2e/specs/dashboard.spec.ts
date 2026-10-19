import { test, expect } from '../fixtures';
import { DashboardPage } from '../pages/DashboardPage';
import { ProfilePage } from '../pages/ProfilePage';
import { PracticePage } from '../pages/PracticePage';
import { buildAnswers, lessonIdBySlug, bangkokDate } from '../utils/quiz';

test('TC-DSH-01 new learner dashboard shows zero state @regression', async ({ memberPage }) => {
  const dash = new DashboardPage(memberPage);
  await dash.goto();
  await expect(memberPage.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(dash.stat('lessons')).toContainText('0 / 5 บท');
  await expect(dash.stat('avg-score')).toContainText('—');
  await expect(dash.stat('week-minutes')).toContainText('0 นาที (ยังไม่ตั้งเป้าหมาย)');
  await expect(memberPage.getByRole('link', { name: 'ไปบทถัดไป' })).toHaveAttribute(
    'href',
    '/lessons/guitar-anatomy-tuning',
  );
  await expect(memberPage.getByText('ยังไม่มีบันทึกการฝึก')).toBeVisible();
});

test('TC-DSH-02 practice log changes weekly minutes and 7-day chart @smoke @regression', async ({ memberPage }) => {
  await new ProfilePage(memberPage).goto();
  await new ProfilePage(memberPage).save({ displayName: 'ผู้เรียน', weeklyGoalMinutes: 120 });
  await expect(memberPage.getByText('บันทึกแล้ว')).toBeVisible();
  const practice = new PracticePage(memberPage);
  await practice.goto();
  await practice.fill({ minutes: 45, activity: 'chords' });
  await practice.save();
  await expect(practice.rows()).toHaveCount(1);
  const dash = new DashboardPage(memberPage);
  await dash.goto();
  await expect(dash.stat('week-minutes')).toContainText('45 / 120 นาที');
  await expect(memberPage.getByRole('img', { name: /นาทีฝึก 7 วันล่าสุด.*45/ })).toBeVisible();
});

test('TC-DSH-03 passing a quiz updates lessons count and average @regression', async ({ memberPage, memberDb, adminDb }) => {
  const l1 = await lessonIdBySlug(adminDb, 'guitar-anatomy-tuning');
  const res = await memberDb.rpc('submit_quiz', { p_lesson_id: l1, p_answers: await buildAnswers(adminDb, l1, 4) });
  expect(res.error).toBeNull();
  const dash = new DashboardPage(memberPage);
  await dash.goto();
  await expect(dash.stat('lessons')).toContainText('1 / 5 บท');
  await expect(dash.stat('avg-score')).toContainText('80%');
  await expect(memberPage.getByRole('link', { name: 'ไปบทถัดไป' })).toHaveAttribute('href', '/lessons/first-chords');
});

test('TC-DSH-04 recent history shows latest five logs @regression', async ({ memberPage, member, memberDb }) => {
  const rows = [0, -1, -2, -3, -4, -5].map((d, i) => ({
    user_id: member.id,
    practiced_on: bangkokDate(d),
    minutes: 10 + i,
    activity: 'chords',
  }));
  const ins = await memberDb.from('practice_logs').insert(rows);
  expect(ins.error).toBeNull();
  const dash = new DashboardPage(memberPage);
  await dash.goto();
  const list = memberPage.getByRole('list', { name: 'ประวัติการฝึกล่าสุด' });
  const items = list.getByRole('listitem');
  await expect(items).toHaveCount(5);
  await expect(items.first()).toContainText('10 นาที');
  await expect(items.last()).toContainText('14 นาที');
});
