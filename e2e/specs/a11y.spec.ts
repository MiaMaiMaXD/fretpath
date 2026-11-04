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

test('TC-SEC-18c practice page (empty and with logs) has no serious axe violations @regression', async ({ memberPage, member, memberDb }) => {
  await memberPage.goto('/practice');
  await memberPage.waitForLoadState('networkidle');
  expect(await serious(memberPage), 'practice empty').toEqual([]);

  const seed = await memberDb.from('practice_logs').insert({
    user_id: member.id,
    practiced_on: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date()),
    minutes: 30,
    activity: 'chords',
    topic: 'เปลี่ยนคอร์ด G - C',
    feeling: 'great',
    note: 'ใช้ Anchor Finger',
  });
  expect(seed.error).toBeNull();
  await memberPage.reload();
  await memberPage.waitForLoadState('networkidle');
  expect(await serious(memberPage), 'practice with logs').toEqual([]);
  await memberPage.goto('/practice/history');
  await memberPage.waitForLoadState('networkidle');
  expect(await serious(memberPage), 'practice history').toEqual([]);
});
