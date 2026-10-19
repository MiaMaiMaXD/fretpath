import { test, expect } from '../fixtures';
import { ProfilePage } from '../pages/ProfilePage';

const GOAL_ERROR = 'เป้าหมายต้องเป็นจำนวนเต็ม 0–5000 นาที';

test('TC-AUTH-09 member updates display name and weekly goal @smoke @regression', async ({ memberPage, member }) => {
  const profile = new ProfilePage(memberPage);
  await profile.goto();
  await expect(memberPage.getByText(member.email)).toBeVisible();

  await profile.save({ displayName: 'มิว', weeklyGoalMinutes: 120 });
  await expect(memberPage.getByText('บันทึกแล้ว')).toBeVisible();

  await memberPage.reload();
  await expect(memberPage.getByLabel('ชื่อที่แสดง')).toHaveValue('มิว');
  await expect(memberPage.getByLabel('เป้าหมายนาทีฝึกต่อสัปดาห์')).toHaveValue('120');
});

test('TC-AUTH-10 weekly goal boundaries @regression', async ({ memberPage }) => {
  const profile = new ProfilePage(memberPage);
  await profile.goto();

  for (const bad of [5001, -1]) {
    await profile.save({ displayName: 'มิว', weeklyGoalMinutes: bad });
    await expect(memberPage.getByText(GOAL_ERROR)).toBeVisible();
    await expect(memberPage.getByLabel('เป้าหมายนาทีฝึกต่อสัปดาห์')).toHaveValue(String(bad));
  }
  for (const good of [0, 5000]) {
    await profile.save({ displayName: 'มิว', weeklyGoalMinutes: good });
    await expect(memberPage.getByText('บันทึกแล้ว')).toBeVisible();
    await expect(memberPage.getByText(GOAL_ERROR)).toHaveCount(0);
    await memberPage.reload();
    await expect(memberPage.getByLabel('เป้าหมายนาทีฝึกต่อสัปดาห์')).toHaveValue(String(good));
  }
});
