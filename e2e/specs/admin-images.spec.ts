import path from 'node:path';
import { test, expect } from '../fixtures';
import { LessonEditorPage } from '../pages/admin/LessonEditorPage';
import { createCompleteLesson, createCourse, deleteCourse } from '../utils/adminCourse';
import { adminClient } from '../utils/supabaseAdmin';

const PIXEL = path.join(__dirname, '..', 'fixtures', 'files', 'pixel.png');

test('TC-ADM-15 admin uploads an image into a text page and it renders in preview @regression', async ({ adminPage }) => {
  const courseId = await createCourse();
  const lessonId = await createCompleteLesson(courseId, 'img-lesson', 'บทมีรูป', false);
  try {
    const edit = new LessonEditorPage(adminPage);
    await edit.goto(lessonId);
    await adminPage.locator('.rte-body').click();
    await adminPage.getByLabel('เลือกไฟล์รูป').setInputFiles(PIXEL);
    const inEditor = adminPage.locator('.rte-body img');
    await expect(inEditor).toHaveAttribute('src', new RegExp(String.raw`/lesson-images/${lessonId}/[0-9a-f-]{36}\.png$`));
    await edit.saveDraft();
    const page = await adminClient().from('lesson_pages').select('body_html').eq('lesson_id', lessonId).eq('kind', 'text').single();
    expect(page.data?.body_html).toContain(`/lesson-images/${lessonId}/`);

    await adminPage.getByTestId('le-preview').click();
    const img = adminPage.locator('.lv-html img');
    await expect(img).toBeVisible();
    await expect.poll(() => img.evaluate((e: HTMLImageElement) => e.naturalWidth)).toBeGreaterThan(0);
  } finally {
    const db = adminClient();
    const list = await db.storage.from('lesson-images').list(lessonId);
    if (list.data?.length) await db.storage.from('lesson-images').remove(list.data.map((f) => `${lessonId}/${f.name}`));
    await deleteCourse(courseId);
  }
});

test('TC-SEC-22 member cannot upload lesson images @security', async ({ memberDb }) => {
  const name = `sec22/${crypto.randomUUID()}.png`;
  try {
    const { error } = await memberDb.storage
      .from('lesson-images')
      .upload(name, new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }));
    expect(error).not.toBeNull();
  } finally {
    await adminClient().storage.from('lesson-images').remove([name]);
  }
});
