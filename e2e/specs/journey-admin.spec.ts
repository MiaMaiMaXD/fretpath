import { randomUUID } from 'node:crypto';
import { test, expect, watchCsp } from '../fixtures';
import { LoginPage } from '../pages/LoginPage';
import { AdminLessonEditPage } from '../pages/admin/AdminLessonEditPage';
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

    // Admin creates the lesson and a question in the UI.
    const slug = `qa-${randomUUID().slice(0, 8)}`;
    const title = `บทเดินทาง ${randomUUID().slice(0, 8)}`;
    const edit = new AdminLessonEditPage(adminPage);
    await edit.gotoNew(courseId);
    await edit.fill({ title, slug, summary: 'สรุปสั้น', contentMd: '# เนื้อหา', passScore: '60' });
    await edit.create();
    await expect(adminPage).toHaveURL(/\/admin\/lessons\/[0-9a-f-]{36}$/);
    await expect(adminPage.getByText('สถานะ: ฉบับร่าง')).toBeVisible();

    await adminPage.getByRole('button', { name: 'เพิ่มคำถาม', exact: true }).click();
    const form = adminPage.getByRole('group', { name: 'คำถามใหม่', exact: true });
    await form.getByLabel('คำถาม', { exact: true }).fill('คอร์ด C คือคอร์ดอะไร?');
    await form.getByLabel('ตัวเลือก 1', { exact: true }).fill('C เมเจอร์');
    await form.getByLabel('ตัวเลือก 2', { exact: true }).fill('A ไมเนอร์');
    await form.getByRole('radio', { name: 'ตัวเลือก 1 เป็นข้อที่ถูก' }).check();
    await form.getByRole('button', { name: 'บันทึกคำถาม' }).click();
    await expect(adminPage.getByRole('group', { name: 'ข้อ 1', exact: true })).toBeVisible();

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
    await adminPage.getByRole('button', { name: 'เผยแพร่', exact: true }).click();
    await expect(adminPage.getByText('สถานะ: เผยแพร่')).toBeVisible();

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
