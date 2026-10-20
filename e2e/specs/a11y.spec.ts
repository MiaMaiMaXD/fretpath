import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { createCompleteLesson, createCourse, deleteCourse } from '../utils/adminCourse';

async function serious(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(' ')) }));
}

test('TC-SEC-18 home, login and path have no serious axe violations @regression', async ({ page, memberPage }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(await serious(page), 'home').toEqual([]);
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  expect(await serious(page), 'login').toEqual([]);

  await memberPage.goto('/path');
  await memberPage.waitForLoadState('networkidle');
  expect(await serious(memberPage), 'path').toEqual([]);
});

test('TC-SEC-18b admin lesson editor has no serious axe violations @regression', async ({ adminPage }) => {
  const courseId = await createCourse();
  try {
    const lessonId = await createCompleteLesson(courseId, 'a11y', 'บทเอซิบิลิตี', false);
    await adminPage.goto(`/admin/lessons/${lessonId}`);
    await adminPage.waitForLoadState('networkidle');
    expect(await serious(adminPage), 'admin lesson editor').toEqual([]);
  } finally {
    await deleteCourse(courseId);
  }
});
