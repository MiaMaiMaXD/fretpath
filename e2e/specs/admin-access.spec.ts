import { test, expect, MEMBER_STATE } from '../fixtures';

test.describe('member', () => {
  test.use({ storageState: MEMBER_STATE });

  test('TC-SEC-19 member opening /admin is sent to dashboard @security', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('link', { name: 'หลังบ้าน' })).toHaveCount(0);
  });
});

test('TC-SEC-21 anonymous opening /admin goes to login with next @security', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/);
});

test('TC-ADM-03 admin sees overview and admin link @smoke', async ({ adminPage }) => {
  await adminPage.getByRole('link', { name: 'หลังบ้าน' }).click();
  await expect(adminPage).toHaveURL(/\/admin$/);
  await expect(adminPage.getByRole('heading', { name: 'ภาพรวมหลังบ้าน' })).toBeVisible();
  await expect(adminPage.getByRole('link', { name: 'จัดการบทเรียน' }).first()).toBeVisible();
  await expect(adminPage.getByRole('link', { name: 'ผู้เรียน' }).first()).toBeVisible();
  const row = adminPage.getByRole('listitem').filter({ hasText: 'กีตาร์พื้นฐาน' });
  await expect(row).toContainText('เผยแพร่ 5 บท');
});
