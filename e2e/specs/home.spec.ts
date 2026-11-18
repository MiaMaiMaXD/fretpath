import { test, expect } from '../fixtures';

const atHome = (u: URL) => u.pathname === '/' && u.hash === '';

test('TC-MOB-04 home menu jumps to its section without adding #path/#how/#faq to the URL; footer has no section links @regression', async ({
  page,
}) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'เมนูหลัก' });

  // The header menu is hidden on narrow screens; the hero button is always there.
  if (await nav.isVisible()) {
    for (const [name, heading] of [
      ['เส้นทางการเรียน', 'path-title'],
      ['เรียนยังไง', 'how-title'],
      ['คำถามที่พบบ่อย', 'faq-title'],
    ] as const) {
      await nav.getByRole('link', { name, exact: true }).click();
      await expect(page.locator(`#${heading}`)).toBeInViewport();
      await expect(page).toHaveURL(atHome);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  await page.getByTestId('hero-see-path').click();
  await expect(page.locator('#path-title')).toBeInViewport();
  await expect(page).toHaveURL(atHome);

  const footer = page.locator('footer');
  await expect(footer.getByRole('link', { name: 'เส้นทางการเรียน' })).toHaveCount(0);
  await expect(footer.getByRole('link', { name: 'คำถามที่พบบ่อย' })).toHaveCount(0);
});
