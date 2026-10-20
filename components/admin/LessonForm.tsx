'use client';

import { useActionState } from 'react';
import { createLesson, updateLesson } from '@/app/(admin)/admin/lessons/actions';
import { Field } from '@/components/Field';
import { FormMessage } from '@/components/FormMessage';
import { SubmitButton } from '@/components/SubmitButton';
import { keepValuesSubmit } from '@/components/useKeepValuesSubmit';
import type { ActionState } from '@/lib/action-state';

export type LessonFormInitial = {
  title: string;
  slug: string;
  summary: string;
  contentMd: string;
  videoUrl: string;
  passScore: string;
};

type Props = { mode: { kind: 'create'; courseId: string } | { kind: 'edit'; lessonId: string }; initial: LessonFormInitial };

const EMPTY: ActionState = { ok: false };

export function LessonForm({ mode, initial }: Props) {
  const [state, action, pending] = useActionState(
    (prev: ActionState, fd: FormData) =>
      mode.kind === 'create' ? createLesson(mode.courseId, prev, fd) : updateLesson(mode.lessonId, prev, fd),
    EMPTY,
  );
  const v = { ...initial, ...(state.values ?? {}) };
  const e = state.fieldErrors ?? {};
  // Remount fields after a successful save so counters/defaults re-sync with the saved values.
  const fieldsKey = state.ok ? 1 : 0;
  return (
    <form onSubmit={keepValuesSubmit(action)} className="flex flex-col gap-4" noValidate>
      <Field name="title" label="ชื่อบท" defaultValue={v.title} error={e.title} />
      <Field name="slug" label="slug" defaultValue={v.slug} error={e.slug} />
      <Field name="summary" label="สรุป" as="textarea" maxCount={300} required={false} defaultValue={v.summary} error={e.summary} resetKey={fieldsKey} />
      <Field name="contentMd" label="เนื้อหา (Markdown)" as="textarea" maxCount={100000} required={false} defaultValue={v.contentMd} resetKey={fieldsKey} />
      <Field name="videoUrl" label="ลิงก์วิดีโอ YouTube" type="url" required={false} defaultValue={v.videoUrl} error={e.videoUrl} />
      <Field name="passScore" label="เกณฑ์ผ่าน (%)" inputMode="numeric" defaultValue={v.passScore} error={e.passScore} />
      <FormMessage state={state} />
      <div>
        <SubmitButton pending={pending}>{mode.kind === 'create' ? 'สร้างบทเรียน' : 'บันทึก'}</SubmitButton>
      </div>
    </form>
  );
}
