import type { Page } from '@playwright/test';

export type LessonFormValues = {
  title?: string;
  slug?: string;
  summary?: string;
  contentMd?: string;
  videoUrl?: string;
  passScore?: string;
};

/** The lesson form (new + edit) and the publish/delete panel of /admin/lessons/[id]. */
export class AdminLessonEditPage {
  constructor(readonly page: Page) {}

  async gotoNew(courseId: string) {
    await this.page.goto(`/admin/lessons/new?course=${courseId}`);
  }

  async goto(lessonId: string) {
    await this.page.goto(`/admin/lessons/${lessonId}`);
  }

  async fill(v: LessonFormValues) {
    const p = this.page;
    if (v.title !== undefined) await p.getByLabel('ชื่อบท', { exact: true }).fill(v.title);
    if (v.slug !== undefined) await p.getByLabel('slug', { exact: true }).fill(v.slug);
    if (v.summary !== undefined) await p.getByLabel('สรุป', { exact: true }).fill(v.summary);
    if (v.contentMd !== undefined) await p.getByLabel('เนื้อหา (Markdown)').fill(v.contentMd);
    if (v.videoUrl !== undefined) await p.getByLabel('ลิงก์วิดีโอ YouTube').fill(v.videoUrl);
    if (v.passScore !== undefined) await p.getByLabel('เกณฑ์ผ่าน (%)').fill(v.passScore);
  }

  async save() {
    await this.page.getByRole('button', { name: 'บันทึก', exact: true }).click();
  }

  async create() {
    await this.page.getByRole('button', { name: 'สร้างบทเรียน', exact: true }).click();
  }

  /** Alert region of the page, excluding Next's route announcer. */
  problems() {
    return this.page.locator('[role="alert"]:not(#__next-route-announcer__)');
  }
}
