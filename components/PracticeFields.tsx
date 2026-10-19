import { Field } from '@/components/Field';
import { ACTIVITIES } from '@/lib/practice-activities';
import type { FieldErrors } from '@/lib/validation';

export type LessonOption = { id: string; title: string };

type Props = {
  idPrefix?: string;
  today: string;
  lessons: LessonOption[];
  errors?: FieldErrors;
  noteResetKey?: number;
  values: { practicedOn: string; minutes: string; activity: string; note: string; lessonId: string };
};

export function PracticeFields({ idPrefix, today, lessons, errors, values, noteResetKey }: Props) {
  return (
    <>
      <Field
        idPrefix={idPrefix}
        name="practicedOn"
        label="วันที่"
        type="date"
        max={today}
        error={errors?.practicedOn}
        defaultValue={values.practicedOn}
      />
      <Field
        idPrefix={idPrefix}
        name="minutes"
        label="จำนวนนาที"
        inputMode="numeric"
        error={errors?.minutes}
        defaultValue={values.minutes}
      />
      <Field
        idPrefix={idPrefix}
        name="activity"
        label="หัวข้อที่ฝึก"
        as="select"
        placeholder="เลือกหัวข้อที่ฝึก"
        options={ACTIVITIES}
        error={errors?.activity}
        defaultValue={values.activity}
      />
      <Field
        idPrefix={idPrefix}
        name="note"
        label="บันทึกสั้น"
        as="textarea"
        required={false}
        maxCount={500}
        resetKey={noteResetKey}
        error={errors?.note}
        defaultValue={values.note}
      />
      <Field
        idPrefix={idPrefix}
        name="lessonId"
        label="บทเรียนที่เกี่ยวข้อง"
        as="select"
        placeholder="ไม่ระบุ"
        required={false}
        options={lessons.map((l) => ({ value: l.id, label: l.title }))}
        error={errors?.lessonId}
        defaultValue={values.lessonId}
      />
    </>
  );
}
