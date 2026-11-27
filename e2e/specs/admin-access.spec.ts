import { test, expect, MEMBER_STATE } from '../fixtures';
import { LESSON_COUNT } from '../utils/course';

test.describe('member', () => {
  test.use({ storageState: MEMBER_STATE });

  test('TC-SEC-19 member opening /admin is sent to dashboard @security', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByTestId('user-menu').locator('summary').click();
    await expect(page.getByTestId('menu-admin-lessons')).toHaveCount(0);
  });
});

test('TC-SEC-21 anonymous opening /admin goes to login with next @security', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/);
});

test('TC-ADM-03 admin reaches lesson management from the account menu @smoke', async ({ adminPage }) => {
  await adminPage.getByTestId('user-menu').locator('summary').click();
  await adminPage.getByTestId('menu-admin-lessons').click();
  await expect(adminPage).toHaveURL(/\/admin\/lessons$/);
  await expect(adminPage.getByRole('heading', { name: 'จัดการบทเรียน', level: 1 })).toBeVisible();
});

test('TC-ADM-03b admin sees overview @smoke', async ({ adminPage }) => {
  await adminPage.goto('/admin');
  await expect(adminPage.getByRole('heading', { name: 'ภาพรวมหลังบ้าน' })).toBeVisible();
  await expect(adminPage.getByRole('link', { name: 'จัดการบทเรียน' }).first()).toBeVisible();
  await expect(adminPage.getByRole('link', { name: 'ผู้เรียน' }).first()).toBeVisible();
  const row = adminPage.getByRole('listitem').filter({ hasText: 'กีตาร์พื้นฐาน' });
  await expect(row).toContainText(`เผยแพร่ ${LESSON_COUNT} บท`);
});
