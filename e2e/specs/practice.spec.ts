import { test, expect } from '../fixtures';
import { PracticePage } from '../pages/PracticePage';
import { bangkokDate } from '../utils/quiz';

const MINUTES_ERROR = 'จำนวนนาทีต้องเป็นจำนวนเต็ม 1–600';

test('TC-PRC-02 save a practice log and see it in the list @smoke @regression', async ({ memberPage, member, memberDb }) => {
  const seed = await memberDb
    .from('practice_logs')
    .insert({ user_id: member.id, practiced_on: bangkokDate(0), minutes: 10, activity: 'tuning' });
  expect(seed.error).toBeNull();

  const practice = new PracticePage(memberPage);
  await practice.goto();
  await expect(practice.rows()).toHaveCount(1);

  await practice.fill({ minutes: 30, activity: 'chords', note: 'ฝึกคอร์ด C และ G' });
  await practice.save();

  await expect(practice.rows()).toHaveCount(2);
  const first = practice.rows().first();
  await expect(first).toContainText('30 นาที');
  await expect(first).toContainText('คอร์ด');
  await expect(first).toContainText('ฝึกคอร์ด C และ G');
});

test('TC-PRC-03 minutes boundaries 0/1/600/601 @regression', async ({ memberPage }) => {
  const practice = new PracticePage(memberPage);
  await practice.goto();

  for (const bad of [0, 601]) {
    await practice.fill({ minutes: bad, activity: 'song' });
    await practice.save();
    await expect(memberPage.getByText(MINUTES_ERROR)).toBeVisible();
    await expect(memberPage.getByLabel('จำนวนนาที')).toHaveValue(String(bad));
  }
  for (const [i, good] of [1, 600].entries()) {
    await practice.fill({ minutes: good, activity: 'song' });
    await practice.save();
    await expect(practice.rows()).toHaveCount(i + 1);
    await expect(memberPage.getByText(MINUTES_ERROR)).toHaveCount(0);
  }
});

test.describe('another browser timezone', () => {
  test.use({ timezoneId: 'America/Los_Angeles' });

  test('TC-PRC-04 date defaults to Bangkok today in another browser timezone @regression', async ({ memberPage }) => {
    const practice = new PracticePage(memberPage);
    await practice.goto();
    const date = memberPage.getByLabel('วันที่');
    await expect(date).toHaveValue(bangkokDate(0));
    await expect(date).toHaveAttribute('max', bangkokDate(0));
  });
});

test('TC-PRC-05 future date rejected even if the max attribute is bypassed @regression @security', async ({ memberPage }) => {
  const practice = new PracticePage(memberPage);
  await practice.goto();
  await memberPage.getByLabel('วันที่').evaluate((el) => el.removeAttribute('max'));
  await practice.fill({ date: bangkokDate(1), minutes: 20, activity: 'other' });
  await practice.save();
  await expect(memberPage.getByText('วันที่ต้องไม่เป็นวันในอนาคต')).toBeVisible();
  await expect(practice.rows()).toHaveCount(0);
});

test('TC-PRC-06 note longer than 500 characters is rejected @regression', async ({ memberPage }) => {
  const practice = new PracticePage(memberPage);
  await practice.goto();
  await practice.fill({ minutes: 20, activity: 'other', note: 'ก'.repeat(501) });
  await expect(memberPage.getByText('501/500')).toBeVisible();
  await practice.save();
  await expect(memberPage.getByText('บันทึกสั้นต้องไม่เกิน 500 ตัวอักษร')).toBeVisible();
  await expect(practice.rows()).toHaveCount(0);

  await practice.fill({ minutes: 20, activity: 'other', note: 'ก'.repeat(500) });
  await practice.save();
  await expect(practice.rows()).toHaveCount(1);
});

test('TC-PRC-07 timer fills minutes with "ใช้เวลานี้" @regression', async ({ memberPage }) => {
  const practice = new PracticePage(memberPage);
  await memberPage.clock.install();
  await practice.goto();

  await memberPage.getByRole('button', { name: 'เริ่ม', exact: true }).click();
  await memberPage.clock.fastForward('05:20');
  await memberPage.getByRole('button', { name: 'หยุด', exact: true }).click();
  await expect(memberPage.getByText('05:20')).toBeVisible();
  await memberPage.getByRole('button', { name: 'ใช้เวลานี้', exact: true }).click();
  await expect(memberPage.getByLabel('จำนวนนาที')).toHaveValue('5');
});

test('TC-PRC-08 edit and delete own log @regression', async ({ memberPage }) => {
  const practice = new PracticePage(memberPage);
  await practice.goto();
  await practice.fill({ minutes: 30, activity: 'strumming' });
  await practice.save();
  await expect(practice.rows()).toHaveCount(1);

  const row = practice.rows().first();
  await row.getByRole('button', { name: 'แก้ไข', exact: true }).click();
  await row.getByLabel('จำนวนนาที').fill('45');
  await row.getByRole('button', { name: 'บันทึก', exact: true }).click();
  await expect(practice.rows().first()).toContainText('45 นาที');

  await practice.rows().first().getByRole('button', { name: 'ลบ', exact: true }).click();
  const dialog = memberPage.getByRole('dialog', { name: 'ลบบันทึกนี้?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(practice.rows()).toHaveCount(1);

  await practice.rows().first().getByRole('button', { name: 'ลบ', exact: true }).click();
  await memberPage.getByRole('dialog').getByRole('button', { name: 'ลบ', exact: true }).click();
  await expect(practice.rows()).toHaveCount(0);
});
