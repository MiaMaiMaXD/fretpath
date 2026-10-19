import { test, expect, MEMBER_STATE } from '../fixtures';

test.use({ viewport: { width: 375, height: 812 } });

const PUBLIC_PAGES = ['/', '/login', '/signup'];
const LEARNER_PAGES = [
  '/dashboard',
  '/path',
  '/lessons/guitar-anatomy-tuning',
  '/lessons/guitar-anatomy-tuning/quiz',
  '/practice',
  '/profile',
];

const noHorizontalScroll = () =>
  document.documentElement.scrollWidth <= document.documentElement.clientWidth;

test('TC-MOB-01 no horizontal scroll on every learner page @regression', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: MEMBER_STATE, viewport: { width: 375, height: 812 } });
  try {
    const page = await ctx.newPage();
    for (const url of ['/', ...LEARNER_PAGES]) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      expect(await page.evaluate(noHorizontalScroll), `horizontal overflow on ${url}`).toBe(true);
    }
  } finally {
    await ctx.close();
  }
});

test('TC-MOB-01b no horizontal scroll on public pages when logged out @regression', async ({ page }) => {
  for (const url of PUBLIC_PAGES) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(noHorizontalScroll), `horizontal overflow on ${url}`).toBe(true);
  }
});

test('TC-MOB-02 navigation reachable on 375px @regression', async ({ memberPage }) => {
  await memberPage.setViewportSize({ width: 375, height: 812 });
  const nav = memberPage.getByRole('navigation', { name: 'เมนูหลัก' });
  const links: [string, RegExp][] = [
    ['Dashboard', /\/dashboard$/],
    ['เส้นทางเรียน', /\/path$/],
    ['บันทึกการฝึก', /\/practice$/],
    ['โปรไฟล์', /\/profile$/],
  ];
  for (const [name, url] of links) {
    const link = nav.getByRole('link', { name });
    await expect(link).toBeVisible();
    await link.click();
    await expect(memberPage).toHaveURL(url);
  }
});
