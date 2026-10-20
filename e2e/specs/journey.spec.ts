import { randomUUID } from 'node:crypto';
import { test, expect } from '../fixtures';
import { SignupPage } from '../pages/SignupPage';
import { PathPage } from '../pages/PathPage';
import { QuizPage } from '../pages/QuizPage';
import { PracticePage } from '../pages/PracticePage';
import { DashboardPage } from '../pages/DashboardPage';
import { latestLinkFor } from '../utils/mailpit';
import { deleteUserByEmail } from '../utils/supabaseAdmin';
import { buildAnswers, choiceTexts, lessonIdBySlug } from '../utils/quiz';

const L1 = 'guitar-anatomy-tuning';
const L2 = 'first-chords';

test('TC-PATH-17 signup → lesson 1 unlocked → fail → lesson 2 locked → pass → lesson 2 unlocked @smoke @regression', async ({
  page,
  adminDb,
}) => {
  const email = `qa+${randomUUID()}@fretpath.test`;
  try {
    const signup = new SignupPage(page);
    await signup.goto();
    await signup.signup(email, 'Passw0rd!');
    await expect(signup.successMessage()).toBeVisible();
    await page.goto(await latestLinkFor(email));
    await page.getByRole('button', { name: 'ยืนยันและเข้าสู่ระบบ' }).click();
    await expect(page).toHaveURL((u) => u.pathname === '/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible(); // the confirm URL itself carries next=/dashboard; wait for the action to land before navigating away

    const path = new PathPage(page);
    await path.goto();
    expect(await path.lessonState(L1)).toBe('unlocked');
    expect(await path.lessonState(L2)).toBe('locked');

    const id = await lessonIdBySlug(adminDb, L1);
    const quiz = new QuizPage(page);

    await quiz.goto(L1);
    await quiz.answerByText(await choiceTexts(adminDb, await buildAnswers(adminDb, id, 2)));
    await quiz.submit();
    await expect(page.getByTestId('quiz-score')).toHaveText('40%');
    await path.goto();
    expect(await path.lessonState(L2)).toBe('locked');

    await quiz.goto(L1);
    await quiz.answerByText(await choiceTexts(adminDb, await buildAnswers(adminDb, id, 5)));
    await quiz.submit();
    await expect(page.getByTestId('quiz-score')).toHaveText('100%');
    await path.goto();
    expect(await path.lessonState(L1)).toBe('completed');
    expect(await path.lessonState(L2)).toBe('unlocked');
  } finally {
    await deleteUserByEmail(email);
  }
});

test('TC-DSH-05 practice log → dashboard numbers change @smoke @regression', async ({ memberPage }) => {
  const dash = new DashboardPage(memberPage);
  await dash.goto();
  await expect(dash.stat('week-minutes')).toContainText('0 นาที');

  const practice = new PracticePage(memberPage);
  await practice.goto();
  await practice.fill({ minutes: 25, activity: 'strumming' });
  await practice.save();
  await expect(practice.rows()).toHaveCount(1);

  await dash.goto();
  await expect(dash.stat('week-minutes')).toContainText('25 นาที');
  await expect(memberPage.getByRole('img', { name: /นาทีฝึก 7 วันล่าสุด.*25/ })).toBeVisible();
});
