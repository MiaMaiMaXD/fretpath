import { randomUUID } from 'node:crypto';
import { test, expect, watchCsp } from '../fixtures';
import { LoginPage } from '../pages/LoginPage';
import { AdminLessonsPage } from '../pages/admin/AdminLessonsPage';
import { LessonEditorPage } from '../pages/admin/LessonEditorPage';
import { PathPage } from '../pages/PathPage';
import { createCompleteLesson, createCourse, deleteCourse } from '../utils/adminCourse';
import { adminClient } from '../utils/supabaseAdmin';

// Spec 6.3 main path 3.
test('TC-ADM-18 admin creates draft → learner cannot see → publish → learner sees @smoke', async ({
  browser,
  adminPage,
  member,
}) => {
  const courseId = await createCourse();
  const ctx = await browser.newContext();
  const csp = watchCsp(ctx);
  try {
    const db = adminClient();
    // The member's /path shows the first enrolled course: leave only the test course.
    const drop = await db.from('enrollments').delete().eq('user_id', member.id);
    expect(drop.error).toBeNull();
    const enrol = await db.from('enrollments').insert({ user_id: member.id, course_id: courseId, source: 'purchase' });
    expect(enrol.error).toBeNull();
    // Control lesson proves the member's /path renders this course (so the draft's absence is meaningful).
    const controlSlug = `control-${randomUUID().slice(0, 8)}`;
    await createCompleteLesson(courseId, controlSlug, 'บทควบคุม', true);

    // Admin creates the lesson from the list, names it and adds a question in the editor.
    const title = `บทเดินทาง ${randomUUID().slice(0, 8)}`;
    const list = new AdminLessonsPage(adminPage);
    await list.goto(courseId);
    await list.sections().first().getByRole('button', { name: 'เพิ่มบทเรียน' }).click();
    await list.lessonMenu('บทเรียนใหม่!', 'แก้ไข');
    await expect(adminPage).toHaveURL(/\/admin\/lessons\/[0-9a-f-]{36}$/);
    const edit = new LessonEditorPage(adminPage);
    await expect(edit.status()).toHaveText('แบบร่าง');
    await adminPage.getByLabel('ชื่อบทเรียน').fill(title);
    await edit.openQuiz();
    await edit.addChoiceQuestion('คอร์ด C คือคอร์ดอะไร?', ['C เมเจอร์', 'A ไมเนอร์', 'G เซเว่น', 'D เมเจอร์'], 0);
    await edit.saveDraft();
    const created = await db.from('lessons').select('slug').eq('course_id', courseId).eq('title', title).single();
    expect(created.error).toBeNull();
    const slug = created.data!.slug;

    // Learner: draft is not visible.
    const memberPage = await ctx.newPage();
    const login = new LoginPage(memberPage);
    await login.goto();
    await login.login(member.email, member.password);
    await memberPage.waitForURL(/\/dashboard/);
    const path = new PathPage(memberPage);
    await path.goto();
    await expect(path.card(controlSlug)).toBeVisible();
    await expect(path.card(slug)).toHaveCount(0);

    // Admin publishes.
    await edit.status().click();
    await edit.dialog().getByRole('button', { name: 'ตกลง' }).click();
    await expect(edit.status()).toHaveText('เผยแพร่');

    // Learner reloads and sees the lesson card.
    await memberPage.reload();
    await expect(path.card(slug)).toBeVisible();
    await expect(path.card(slug)).toContainText(title);
    expect(csp, 'CSP violations in console').toEqual([]);
  } finally {
    await ctx.close();
    await deleteCourse(courseId);
  }
});
