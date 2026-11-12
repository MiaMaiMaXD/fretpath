import { test, expect } from '../fixtures';
import { ProfilePage } from '../pages/ProfilePage';
import { latestLinkFor } from '../utils/mailpit';
import { adminClient } from '../utils/supabaseAdmin';

const profileRow = async (id: string) =>
  (await adminClient().from('profiles').select('weekly_goal_minutes, display_name').eq('id', id).single()).data;

test('TC-AUTH-09 member updates display name and weekly goal @smoke @regression', async ({ memberPage, member }) => {
  const profile = new ProfilePage(memberPage);
  await profile.goto();
  await expect(memberPage.getByTestId('profile-email')).toHaveText(member.email);
  await expect(memberPage.getByText(/เริ่มเรียนเมื่อ \d{1,2} \S+ 25\d\d/)).toBeVisible();

  await profile.saveName('มิว');
  await expect(profile.toast()).toHaveText(/บันทึกชื่อแล้ว/);
  await expect(profile.name()).toHaveText('มิว');

  await profile.saveGoal(120);
  await expect(profile.toast()).toHaveText(/บันทึกเป้าหมายแล้ว/);

  await memberPage.reload();
  await expect(profile.name()).toHaveText('มิว');
  await expect(profile.goalInput()).toHaveValue('120');
  // the header menu follows the new name
  await expect(memberPage.getByTestId('user-menu')).toContainText('มิว');
});

test('TC-AUTH-10 weekly goal accepts digits only, 0–5000 @regression', async ({ memberPage, member }) => {
  const profile = new ProfilePage(memberPage);
  await profile.goto();
  const input = profile.goalInput();

  // non-digits never reach the box
  await input.fill('');
  await input.pressSequentially('-1e.5');
  await expect(input).toHaveValue('15');
  await input.fill('2 ชม. 10');
  await expect(input).toHaveValue('210');

  // over the limit or empty: message shown, save blocked
  await input.fill('5001');
  await expect(memberPage.getByText('ใส่ได้ไม่เกิน 5000 นาทีต่อสัปดาห์')).toBeVisible();
  await expect(profile.goalSave()).toBeDisabled();
  await input.fill('');
  await expect(memberPage.getByText(/กรุณาใส่จำนวนนาที/)).toBeVisible();
  await expect(profile.goalSave()).toBeDisabled();

  for (const good of [5000, 0]) {
    await profile.saveGoal(good);
    await expect(profile.toast()).toHaveText(/บันทึกเป้าหมายแล้ว/);
    await expect.poll(async () => (await profileRow(member.id))?.weekly_goal_minutes).toBe(good);
    await memberPage.reload();
    await expect(profile.goalInput()).toHaveValue(String(good));
  }
  // unchanged value: nothing to save
  await expect(profile.goalSave()).toBeDisabled();
});

test('TC-AUTH-19 goal save can be undone; Esc restores the saved value @regression', async ({ memberPage, member }) => {
  const profile = new ProfilePage(memberPage);
  await profile.goto();
  await profile.saveGoal(90);
  await expect(profile.toast()).toHaveText(/บันทึกเป้าหมายแล้ว/);
  await expect.poll(async () => (await profileRow(member.id))?.weekly_goal_minutes).toBe(90);

  await profile.saveGoal(300);
  await expect.poll(async () => (await profileRow(member.id))?.weekly_goal_minutes).toBe(300);
  await expect(profile.toast()).toHaveText(/บันทึกเป้าหมายแล้ว/);
  await profile.toast().getByRole('button', { name: 'เลิกทำ' }).click();
  await expect(profile.goalInput()).toHaveValue('90');
  await expect.poll(async () => (await profileRow(member.id))?.weekly_goal_minutes).toBe(90);

  await profile.goalInput().fill('777');
  await profile.goalInput().press('Escape');
  await expect(profile.goalInput()).toHaveValue('90');
});

test('TC-AUTH-20 display name is limited to 50 characters with a counter @regression', async ({ memberPage, member }) => {
  const profile = new ProfilePage(memberPage);
  await profile.goto();
  const before = (await profileRow(member.id))?.display_name;
  await memberPage.getByRole('button', { name: 'แก้ชื่อที่แสดง' }).click();
  const input = profile.nameInput();
  const counter = memberPage.locator('#name-count');

  await input.fill('ก'.repeat(60));
  await expect(input).toHaveValue('ก'.repeat(50));
  await expect(counter).toHaveText('50/50');

  // Thai vowels and tone marks count as characters (same as the server)
  await input.fill('สมศักดิ์');
  await expect(counter).toHaveText('8/50');

  // an empty name is refused
  await input.fill('   ');
  await memberPage.getByRole('button', { name: 'บันทึกชื่อ' }).click();
  await expect(memberPage.getByText('กรุณาใส่ชื่อ')).toBeVisible();

  // Esc leaves edit mode without saving
  await input.press('Escape');
  await expect(profile.name()).toBeVisible();
  expect((await profileRow(member.id))?.display_name).toBe(before);
});

test('TC-AUTH-21 database rejects names over 50 characters even through the API @regression', async ({ memberDb, member }) => {
  const original = (await profileRow(member.id))?.display_name ?? null;
  try {
    const res = await memberDb.from('profiles').update({ display_name: 'ข'.repeat(51) }).eq('id', member.id);
    expect(res.error?.code).toBe('23514');
    const ok = await memberDb.from('profiles').update({ display_name: 'ข'.repeat(50) }).eq('id', member.id);
    expect(ok.error).toBeNull();
  } finally {
    await adminClient().from('profiles').update({ display_name: original }).eq('id', member.id);
  }
});

test('TC-AUTH-22 password row emails a reset link to the signed-in address @regression', async ({ memberPage, member }) => {
  const profile = new ProfilePage(memberPage);
  await profile.goto();
  await expect(memberPage.getByTestId('profile-google')).toHaveCount(0);
  await memberPage.getByRole('button', { name: 'เปลี่ยนรหัสผ่าน' }).click();
  const dlg = memberPage.getByRole('dialog', { name: 'เปลี่ยนรหัสผ่าน' });
  await expect(dlg).toContainText(member.email);
  await dlg.getByRole('button', { name: 'ส่งลิงก์' }).click();
  await expect(profile.toast()).toHaveText(/ส่งลิงก์แล้ว/);
  expect(await latestLinkFor(member.email, { contains: 'type=recovery' })).toContain('next=/reset-password');
});
