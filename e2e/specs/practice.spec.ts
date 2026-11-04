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

  // the note is shown in the full history
  await practice.gotoHistory();
  await expect(practice.historyRows()).toHaveCount(2);
  await expect(practice.historyRows().first()).toContainText('ฝึกคอร์ด C และ G');
});

test('TC-PRC-03 minutes boundaries 0/1/600/601 @regression', async ({ memberPage }) => {
  const practice = new PracticePage(memberPage);
  await practice.goto();

  for (const bad of [0, 601]) {
    await practice.goto(); // fresh page so the previous attempt's error cannot satisfy the assertion
    await practice.fill({ minutes: bad, activity: 'song' });
    await practice.save();
    await expect(memberPage.getByText(MINUTES_ERROR)).toBeVisible();
    await expect(memberPage.getByLabel('ซ้อมไปกี่นาที')).toHaveValue(String(bad));
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

  test('TC-PRC-04 date defaults to Bangkok today in another browser timezone @smoke @regression', async ({ memberPage }) => {
    const practice = new PracticePage(memberPage);
    await practice.goto();
    const date = memberPage.getByLabel('วันที่ซ้อม');
    await expect(date).toHaveValue(bangkokDate(0));
    await expect(date).toHaveAttribute('max', bangkokDate(0));
  });
});

test('TC-PRC-05 future date rejected even if the max attribute is bypassed @regression @security', async ({ memberPage }) => {
  const practice = new PracticePage(memberPage);
  await practice.goto();
  await memberPage.getByLabel('วันที่ซ้อม').evaluate((el) => el.removeAttribute('max'));
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
  await expect(memberPage.getByText('บันทึกช่วยจำต้องไม่เกิน 500 ตัวอักษร')).toBeVisible();
  await expect(practice.rows()).toHaveCount(0);

  await practice.fill({ minutes: 20, activity: 'other', note: 'ก'.repeat(500) });
  await practice.save();
  await expect(practice.rows()).toHaveCount(1);
  await expect(memberPage.getByText('0/500')).toBeVisible();
});

test('TC-PRC-07 timer fills minutes with "จบรอบ แล้วจดบันทึก" @smoke @regression', async ({ memberPage }) => {
  const practice = new PracticePage(memberPage);
  await memberPage.clock.install();
  await practice.goto();

  await memberPage.getByRole('button', { name: 'เริ่มจับเวลา' }).click();
  await memberPage.clock.fastForward('05:20');
  await memberPage.getByRole('button', { name: 'พักเวลา' }).click();
  await expect(memberPage.getByTestId('timer-display')).toHaveText('05:20');
  await memberPage.getByRole('button', { name: 'จบรอบ แล้วจดบันทึก' }).click();
  await expect(practice.minutesInput()).toHaveValue('5');
  await expect(practice.form().getByLabel('วันนี้ฝึกอะไร')).toBeFocused();
});

test('TC-PRC-08 edit and delete own log @regression', async ({ memberPage }) => {
  const practice = new PracticePage(memberPage);
  await practice.goto();
  await practice.fill({ minutes: 30, activity: 'strumming' });
  await practice.save();
  await expect(practice.rows()).toHaveCount(1);

  await practice.gotoHistory();
  const row = practice.historyRows().first();
  await row.getByRole('button', { name: 'แก้ไข', exact: true }).click();
  await row.getByLabel('ซ้อมไปกี่นาที').fill('45');
  await row.getByRole('button', { name: 'บันทึก', exact: true }).click();
  await expect(practice.historyRows().first()).toContainText('45 นาที');

  await practice.historyRows().first().getByRole('button', { name: 'ลบ', exact: true }).click();
  const dialog = memberPage.getByRole('dialog', { name: 'ลบบันทึกนี้?' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'ยกเลิก', exact: true })).toBeFocused();
  await dialog.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(practice.historyRows()).toHaveCount(1);

  const deleteBtn = practice.historyRows().first().getByRole('button', { name: 'ลบ', exact: true });
  await expect(deleteBtn).toBeFocused();
  await deleteBtn.click();
  await expect(dialog).toBeVisible();
  await memberPage.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(deleteBtn).toBeFocused();

  await practice.historyRows().first().getByRole('button', { name: 'ลบ', exact: true }).click();
  await memberPage.getByRole('dialog').getByRole('button', { name: 'ลบ', exact: true }).click();
  await expect(practice.historyRows()).toHaveCount(0);
});

test('TC-PRC-11 topic, category and feeling show in recent; totals and search on the history page @regression', async ({ memberPage, member, memberDb }) => {
  const seed = await memberDb.from('practice_logs').insert([
    { user_id: member.id, practiced_on: bangkokDate(-2), minutes: 20, activity: 'tuning', topic: 'ตั้งสายกีตาร์', note: 'จำชื่อสาย E-A-D-G-B-E ได้แล้ว' },
    { user_id: member.id, practiced_on: bangkokDate(-1), minutes: 35, activity: 'chords', feeling: 'sore' },
  ]);
  expect(seed.error).toBeNull();

  const practice = new PracticePage(memberPage);
  await practice.goto();
  // a log without a topic falls back to the category name
  await expect(practice.rows().filter({ hasText: 'ฝึกคอร์ด' })).toContainText('เจ็บนิ้ว ต้องซ้อมอีก');

  await practice.fill({ minutes: 30, activity: 'chords', topic: 'เปลี่ยนคอร์ด G - Em - C - D', feeling: 'great', note: 'ใช้ Anchor Finger' });
  await practice.save();
  await expect(practice.rows()).toHaveCount(3);
  const first = practice.rows().first();
  await expect(first.getByRole('heading', { name: 'เปลี่ยนคอร์ด G - Em - C - D' })).toBeVisible();
  await expect(first).toContainText('คอร์ด');
  await expect(first).toContainText('คล่องขึ้นมาก');
  await expect(first).toContainText('วันนี้');
  await expect(practice.form().getByLabel('วันนี้ฝึกอะไร')).toHaveValue('');

  await memberPage.getByRole('link', { name: /ดูประวัติทั้งหมด/ }).click();
  await expect(memberPage).toHaveURL(/\/practice\/history$/);
  await expect(memberPage.getByTestId('practice-totals')).toHaveText('ซ้อมมาแล้ว 3 ครั้ง รวม 1 ชม. 25 นาที');
  await expect(practice.historyRows().first()).toContainText('ใช้ Anchor Finger');

  const search = practice.history().getByRole('searchbox', { name: 'ค้นหาบันทึกการซ้อม' });
  await search.fill('สาย');
  await expect(practice.historyRows()).toHaveCount(1);
  await expect(practice.historyRows().first()).toContainText('ตั้งสายกีตาร์');
  await expect(practice.history().getByRole('status')).toHaveText('พบ 1 รายการ');
  await search.fill('ไม่มีคำนี้แน่นอน');
  await expect(practice.historyRows()).toHaveCount(0);
  await expect(practice.history().getByRole('status')).toContainText('ไม่พบบันทึก');
  await search.fill('');
  await expect(practice.historyRows()).toHaveCount(3);
});

test('TC-PRC-12 empty state on both pages, no history link and no search box @regression', async ({ memberPage }) => {
  const practice = new PracticePage(memberPage);
  await practice.goto();
  await expect(memberPage.getByTestId('practice-empty')).toBeVisible();
  await expect(memberPage.getByRole('link', { name: /ดูประวัติทั้งหมด/ })).toHaveCount(0);
  await practice.gotoHistory();
  await expect(memberPage.getByTestId('practice-empty')).toBeVisible();
  await expect(memberPage.getByTestId('practice-totals')).toHaveText('ซ้อมมาแล้ว 0 ครั้ง รวม 0 นาที');
  await expect(memberPage.getByRole('searchbox')).toHaveCount(0);
});

test('TC-PRC-13 timer keeps running across pages and reloads, with a floating mini player @regression', async ({ memberPage }) => {
  const practice = new PracticePage(memberPage);
  await memberPage.clock.install();
  await practice.goto();
  await expect(memberPage.getByTestId('mini-player')).toHaveCount(0);

  await memberPage.getByRole('button', { name: 'เริ่มจับเวลา' }).click();
  await memberPage.clock.fastForward('02:00');
  await memberPage.goto('/dashboard');
  const mini = memberPage.getByTestId('mini-player');
  await expect(mini).toBeVisible();
  await expect(mini).toContainText('02:0');

  await mini.getByRole('button', { name: 'พักเวลา' }).click();
  await expect(mini.getByRole('button', { name: 'จับเวลาต่อ' })).toBeVisible();
  const paused = await mini.getByRole('link').innerText();

  await memberPage.reload();
  await expect(memberPage.getByTestId('mini-player')).toContainText(paused);

  await memberPage.getByTestId('mini-player').getByRole('link').click();
  await expect(memberPage).toHaveURL(/\/practice$/);
  await expect(memberPage.getByTestId('timer-display')).toHaveText(paused);
  await expect(memberPage.getByTestId('mini-player')).toHaveCount(0);

  // saving a session clears the paused timer
  await memberPage.getByRole('button', { name: 'จบรอบ แล้วจดบันทึก' }).click();
  await practice.form().locator('input[name="activity"][value="chords"]').check();
  await practice.save();
  await expect(practice.rows()).toHaveCount(1);
  await expect(memberPage.getByTestId('timer-display')).toHaveText('00:00');
});
