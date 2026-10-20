import { randomUUID } from "node:crypto";
import { test, expect } from "../fixtures";
import { buildAnswers, lessonIdBySlug } from "../utils/quiz";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { env } from "../utils/env";
import {
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "../utils/supabaseAdmin";

test("TC-ADM-16 learner list shows progress read-only @regression", async ({
  adminPage,
  adminDb,
}) => {
  const name = `ครูทดสอบ-${randomUUID().slice(0, 8)}`;
  let learner: TestUser | undefined;
  try {
    learner = await createTestUser({ displayName: name });
    const learnerDb = createClient<Database>(env.supabaseUrl, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signIn = await learnerDb.auth.signInWithPassword({
      email: learner.email,
      password: learner.password,
    });
    expect(signIn.error).toBeNull();

    const l1 = await lessonIdBySlug(adminDb, "guitar-anatomy-tuning");
    const res = await learnerDb.rpc("submit_quiz", {
      p_lesson_id: l1,
      p_answers: await buildAnswers(adminDb, l1, 5),
    });
    expect(res.error).toBeNull();

    await adminPage.goto("/admin/learners");
    for (const h of [
      "ชื่อ",
      "บทที่จบ",
      "คะแนนเฉลี่ย",
      "นาทีฝึกสัปดาห์นี้",
      "ฝึกล่าสุด",
      "สิทธิ์",
    ]) {
      await expect(
        adminPage.getByRole("columnheader", { name: h }),
      ).toBeVisible();
    }
    const row = adminPage.getByRole("row").filter({ hasText: name });
    await expect(row).toContainText("1 / 5");
    await expect(
      row.getByRole("button", { name: "ตั้งเป็นผู้ดูแล" }),
    ).toBeVisible();
    await expect(row.getByRole("textbox")).toHaveCount(0);
    await expect(adminPage.getByText(learner.email)).toHaveCount(0);
  } finally {
    if (learner) await deleteTestUser(learner.id);
  }
});

test("TC-ADM-17 admin promotes and demotes another user @regression", async ({
  adminPage,
  adminDb,
}) => {
  const name = `เลื่อนสิทธิ์-${randomUUID().slice(0, 8)}`;
  let target: TestUser | undefined;
  try {
    target = await createTestUser({ displayName: name });
    await adminPage.goto("/admin/learners");
    const row = adminPage.getByRole("row").filter({ hasText: name });

    await row.getByRole("button", { name: "ตั้งเป็นผู้ดูแล" }).click();
    const dialog = adminPage.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "ยกเลิก" })).toBeFocused();
    await dialog.getByRole("button", { name: "ยืนยัน" }).click();
    await expect(
      row.getByRole("button", { name: "ลดเป็นผู้เรียน" }),
    ).toBeVisible();
    await expect(row).toContainText("ผู้ดูแล");
    expect(
      (
        await adminDb
          .from("profiles")
          .select("role")
          .eq("id", target.id)
          .single()
      ).data?.role,
    ).toBe("admin");

    await row.getByRole("button", { name: "ลดเป็นผู้เรียน" }).click();
    await adminPage
      .getByRole("dialog")
      .getByRole("button", { name: "ยืนยัน" })
      .click();
    await expect(
      row.getByRole("button", { name: "ตั้งเป็นผู้ดูแล" }),
    ).toBeVisible();
    expect(
      (
        await adminDb
          .from("profiles")
          .select("role")
          .eq("id", target.id)
          .single()
      ).data?.role,
    ).toBe("member");
  } finally {
    if (target) await deleteTestUser(target.id);
  }
});
