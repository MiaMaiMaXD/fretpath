import { test, expect } from '../fixtures';
import { QuizPage } from '../pages/QuizPage';
import { PathPage } from '../pages/PathPage';
import { buildAnswers, choiceTexts, lessonIdBySlug } from '../utils/quiz';

const L1 = 'guitar-anatomy-tuning';
const LESSON_SLUGS = [L1, 'first-chords', 'open-chords-changes', 'strumming-4-4', 'f-chord-first-song'];

test('TC-QZ-19 unanswered questions are highlighted and nothing is submitted @regression', async ({
  memberPage,
  member,
  adminDb,
}) => {
  const quiz = new QuizPage(memberPage);
  const answers = await buildAnswers(adminDb, await lessonIdBySlug(adminDb, L1), 5);
  const texts = await choiceTexts(adminDb, answers);
  await quiz.goto(L1);
  await quiz.answerByText([...texts.slice(0, 4), null]);
  await quiz.submit();
  await expect(memberPage.getByText('ยังไม่ได้ตอบ 1 ข้อ')).toBeVisible();
  await expect(memberPage.getByRole('radiogroup', { name: 'ข้อ 5', exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  const { count } = await adminDb
    .from('quiz_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', member.id);
  expect(count).toBe(0);
});

test('TC-QZ-25 failing score shows review and retry, next lesson stays locked @smoke @regression', async ({
  memberPage,
  adminDb,
}) => {
  const quiz = new QuizPage(memberPage);
  const answers = await buildAnswers(adminDb, await lessonIdBySlug(adminDb, L1), 2);
  await quiz.goto(L1);
  await quiz.answerByText(await choiceTexts(adminDb, answers));
  await quiz.submit();
  await expect(memberPage.getByTestId('quiz-score')).toHaveText('40%');
  expect(await quiz.score()).toBe(40);
  await expect(memberPage.getByText('ไม่ผ่าน', { exact: true })).toBeVisible();
  await expect(memberPage.getByRole('link', { name: 'ทบทวนบทเรียน' })).toHaveAttribute('href', `/lessons/${L1}`);
  await expect(memberPage.getByRole('button', { name: 'สอบใหม่' })).toBeVisible();
  const path = new PathPage(memberPage);
  await path.goto();
  expect(await path.lessonState('first-chords')).toBe('locked');
});

test('TC-QZ-21 passing score shows explanations and unlocks next lesson @smoke @regression', async ({
  memberPage,
  adminDb,
}) => {
  const quiz = new QuizPage(memberPage);
  const answers = await buildAnswers(adminDb, await lessonIdBySlug(adminDb, L1), 3);
  await quiz.goto(L1);
  await quiz.answerByText(await choiceTexts(adminDb, answers));
  await quiz.submit();
  await expect(memberPage.getByTestId('quiz-score')).toHaveText('60%');
  await expect(memberPage.getByText('ผ่าน', { exact: true })).toBeVisible();
  const items = memberPage.getByRole('list', { name: 'ผลรายข้อ' }).getByRole('listitem');
  await expect(items).toHaveCount(5);
  for (let i = 0; i < 5; i++) {
    await expect(items.nth(i).getByText('คำอธิบาย')).toBeVisible();
  }
  await memberPage.getByRole('link', { name: 'ไปบทถัดไป' }).click();
  await expect(memberPage).toHaveURL(/\/lessons\/first-chords$/);
});

test('TC-QZ-26 retake keeps best score on the path @regression', async ({ memberPage, memberDb, adminDb }) => {
  const id = await lessonIdBySlug(adminDb, L1);
  const first = await memberDb.rpc('submit_quiz', {
    p_lesson_id: id,
    p_answers: await buildAnswers(adminDb, id, 5),
  });
  expect(first.error).toBeNull();
  const quiz = new QuizPage(memberPage);
  await quiz.goto(L1);
  await quiz.answerByText(await choiceTexts(adminDb, await buildAnswers(adminDb, id, 1)));
  await quiz.submit();
  await expect(memberPage.getByTestId('quiz-score')).toHaveText('20%');
  const path = new PathPage(memberPage);
  await path.goto();
  await expect(path.card(L1)).toContainText('100');
  expect(await path.lessonState(L1)).toBe('completed');
});

test('TC-QZ-27 last lesson shows course finished @regression', async ({ memberPage, memberDb, adminDb }) => {
  for (const slug of LESSON_SLUGS.slice(0, 4)) {
    const id = await lessonIdBySlug(adminDb, slug);
    const r = await memberDb.rpc('submit_quiz', {
      p_lesson_id: id,
      p_answers: await buildAnswers(adminDb, id, 5),
    });
    expect(r.error).toBeNull();
  }
  const last = LESSON_SLUGS[4];
  const quiz = new QuizPage(memberPage);
  const answers = await buildAnswers(adminDb, await lessonIdBySlug(adminDb, last), 5);
  await quiz.goto(last);
  await quiz.answerByText(await choiceTexts(adminDb, answers));
  await quiz.submit();
  await expect(memberPage.getByTestId('quiz-score')).toHaveText('100%');
  await expect(memberPage.getByText('จบคอร์สแล้ว')).toBeVisible();
  await expect(memberPage.getByRole('link', { name: 'ไปบทถัดไป' })).toHaveCount(0);
});

test('TC-QZ-23 network failure keeps answers and offers resend @regression', async ({ memberPage, adminDb }) => {
  const quiz = new QuizPage(memberPage);
  const answers = await buildAnswers(adminDb, await lessonIdBySlug(adminDb, L1), 5);
  const texts = await choiceTexts(adminDb, answers);
  await quiz.goto(L1);
  await quiz.answerByText(texts);
  let aborted = false;
  await memberPage.route('**/*', async (route) => {
    const req = route.request();
    if (!aborted && req.method() === 'POST' && req.headers()['next-action']) {
      aborted = true;
      await route.abort();
      return;
    }
    await route.continue();
  });
  await quiz.submit();
  await expect(memberPage.getByRole('button', { name: 'ส่งอีกครั้ง' })).toBeVisible();
  await expect(memberPage.getByText('เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่')).toBeVisible();
  await expect(
    memberPage
      .getByRole('radiogroup', { name: 'ข้อ 1', exact: true })
      .getByRole('radio', { name: texts[0], exact: true }),
  ).toBeChecked();
  await memberPage.getByRole('button', { name: 'ส่งอีกครั้ง' }).click();
  await expect(memberPage.getByTestId('quiz-score')).toHaveText('100%');
});

test('TC-QZ-22 double click submits once @regression', async ({ memberPage, member, adminDb }) => {
  const quiz = new QuizPage(memberPage);
  const answers = await buildAnswers(adminDb, await lessonIdBySlug(adminDb, L1), 5);
  await quiz.goto(L1);
  await quiz.answerByText(await choiceTexts(adminDb, answers));
  await memberPage.getByRole('button', { name: 'ส่งคำตอบ' }).dblclick();
  await expect(memberPage.getByTestId('quiz-score')).toBeVisible();
  const { count } = await adminDb
    .from('quiz_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', member.id);
  expect(count).toBe(1);
});

test('TC-QZ-28 locked quiz URL redirects to path @regression', async ({ memberPage }) => {
  await memberPage.goto('/lessons/first-chords/quiz');
  await expect(memberPage).toHaveURL(/\/path\?locked=first-chords$/);
});
