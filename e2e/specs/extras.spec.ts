import path from 'node:path';
import { test, expect } from '../fixtures';
import { env } from '../utils/env';
import { adminClient } from '../utils/supabaseAdmin';

const PIXEL = path.join(__dirname, '..', 'fixtures', 'files', 'pixel.png');
const UPLOAD_ERROR = 'อัปโหลดรูปไม่สำเร็จ (PNG, JPG, WEBP ไม่เกิน 1 MB)';

async function cleanAvatars(userId: string) {
  const db = adminClient();
  const list = await db.storage.from('avatars').list(userId);
  if (list.data?.length) await db.storage.from('avatars').remove(list.data.map((f) => `${userId}/${f.name}`));
}

test('TC-AUTH-12 member uploads and removes avatar @regression', async ({ memberPage, member }) => {
  try {
    await memberPage.goto('/profile');
    await memberPage.waitForLoadState('networkidle');
    await expect(memberPage.getByRole('img', { name: 'รูปโปรไฟล์' })).toHaveCount(0);

    await memberPage.getByLabel('เปลี่ยนรูปโปรไฟล์').setInputFiles(PIXEL);
    const img = memberPage.getByRole('img', { name: 'รูปโปรไฟล์' }).first();
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute('src', new RegExp(`/storage/v1/object/public/avatars/${member.id}/avatar\\.png`));
    await expect.poll(() => img.evaluate((e: HTMLImageElement) => e.naturalWidth)).toBeGreaterThan(0);

    // persists after reload and shows in the navigation bar
    await memberPage.reload();
    await expect(
      memberPage.getByRole('navigation', { name: 'เมนูหลัก' }).getByRole('img', { name: 'รูปโปรไฟล์' }),
    ).toBeVisible();

    await memberPage.getByRole('button', { name: 'ลบรูป' }).click();
    await expect(memberPage.getByRole('img', { name: 'รูปโปรไฟล์' })).toHaveCount(0);
    await memberPage.reload();
    await expect(memberPage.getByRole('img', { name: 'รูปโปรไฟล์' })).toHaveCount(0);
    const list = await adminClient().storage.from('avatars').list(member.id);
    expect(list.data ?? []).toHaveLength(0);
  } finally {
    await cleanAvatars(member.id);
  }
});

test('TC-AUTH-16 avatar rejects wrong file type @regression', async ({ memberPage, member }) => {
  try {
    await memberPage.goto('/profile');
    await memberPage.waitForLoadState('networkidle');
    await memberPage.getByLabel('เปลี่ยนรูปโปรไฟล์').setInputFiles({
      name: 'a.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello'),
    });
    await expect(memberPage.locator('[role=alert]:not(#__next-route-announcer__)')).toHaveText(UPLOAD_ERROR);
  } finally {
    await cleanAvatars(member.id);
  }
});

test('TC-PRC-09 metronome starts and stops without errors @regression', async ({ memberPage }) => {
  const errors: string[] = [];
  memberPage.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  memberPage.on('pageerror', (e) => errors.push(e.message));

  await memberPage.goto('/practice');
  const bpm = memberPage.getByRole('spinbutton', { name: 'จังหวะ (BPM)' });
  await bpm.fill('300');
  await bpm.blur();
  await expect(bpm).toHaveValue('208');
  await bpm.fill('90');
  await expect(memberPage.getByRole('slider', { name: 'จังหวะ (BPM)' })).toHaveValue('90');

  await memberPage.getByRole('button', { name: 'เริ่มเมโทรนอม' }).click();
  await expect(memberPage.getByRole('button', { name: 'หยุดเมโทรนอม' })).toBeVisible();
  await expect(memberPage.getByRole('button', { name: 'เริ่มเมโทรนอม' })).toHaveCount(0);
  await memberPage.waitForTimeout(1500);
  await memberPage.getByRole('button', { name: 'หยุดเมโทรนอม' }).click();
  await expect(memberPage.getByRole('button', { name: 'เริ่มเมโทรนอม' })).toBeVisible();
  expect(errors).toEqual([]);
});

test("TC-SEC-23 member cannot set avatar_url to another user's path @security", async ({
  memberDb,
  member,
  otherMember,
}) => {
  const base = `${env.supabaseUrl}/storage/v1/object/public/avatars`;
  const other = await memberDb
    .from('profiles')
    .update({ avatar_url: `${base}/${otherMember.id}/avatar.png` })
    .eq('id', member.id);
  expect(other.error?.message).toBe('INVALID_AVATAR');
  const foreign = await memberDb.from('profiles').update({ avatar_url: 'https://evil.example/x.png' }).eq('id', member.id);
  expect(foreign.error?.message).toBe('INVALID_AVATAR');

  const own = await memberDb
    .from('profiles')
    .update({ avatar_url: `${base}/${member.id}/avatar.png` })
    .eq('id', member.id);
  expect(own.error).toBeNull();

  const { data } = await adminClient().from('profiles').select('avatar_url').eq('id', member.id).single();
  expect(data?.avatar_url).toBe(`${base}/${member.id}/avatar.png`);
});
