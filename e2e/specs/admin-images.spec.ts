import path from 'node:path';
import { test, expect } from '../fixtures';
import { createCompleteLesson, createCourse, deleteCourse } from '../utils/adminCourse';
import { adminClient } from '../utils/supabaseAdmin';

const PIXEL = path.join(__dirname, '..', 'fixtures', 'files', 'pixel.png');

test('TC-ADM-15 admin uploads an image and it renders in preview @regression', async ({ adminPage }) => {
  const courseId = await createCourse();
  const lessonId = await createCompleteLesson(courseId, 'img-lesson', 'บทมีรูป', false);
  try {
    await adminPage.goto(`/admin/lessons/${lessonId}`);
    const content = adminPage.getByLabel('เนื้อหา (Markdown)');
    await content.fill('ก่อน หลัง');
    await content.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(5, 5));
    await adminPage.getByLabel('แทรกรูป').setInputFiles(PIXEL);
    await expect(content).toHaveValue(new RegExp(String.raw`^ก่อน !\[คำอธิบายรูป\]\(http[^)]*/lesson-images/${lessonId}/[0-9a-f-]{36}\.png\)หลัง$`));
    await adminPage.getByRole('button', { name: 'บันทึก', exact: true }).click();
    await expect(adminPage.getByRole('status')).toBeVisible();

    await adminPage.goto(`/admin/lessons/${lessonId}/preview`);
    const img = adminPage.getByRole('img', { name: 'คำอธิบายรูป' });
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
