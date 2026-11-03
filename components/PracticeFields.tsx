import { Field } from '@/components/Field';
import { ACTIVITIES, FEELINGS } from '@/lib/practice-activities';
import type { FieldErrors } from '@/lib/validation';

export type LessonOption = { id: string; title: string };

export type PracticeValues = {
  practicedOn: string;
  minutes: string;
  activity: string;
  topic: string;
  feeling: string;
  note: string;
  lessonId: string;
};

type Props = {
  idPrefix?: string;
  today: string;
  lessons: LessonOption[];
  errors?: FieldErrors;
  noteResetKey?: number;
  values: PracticeValues;
};

export function PracticeFields({ idPrefix, today, lessons, errors, values, noteResetKey }: Props) {
  return (
    <div className="fields">
      <Field
        idPrefix={idPrefix}
        name="practicedOn"
        label="วันที่ฝึกซ้อม"
        type="date"
        max={today}
        error={errors?.practicedOn}
        defaultValue={values.practicedOn}
      />
      <Field
        idPrefix={idPrefix}
        name="topic"
        label="วันนี้ฝึกอะไรไปบ้าง? (ตัวเลือก)"
        required={false}
        maxLength={120}
        placeholder="เช่น ฝึกเปลี่ยนคอร์ด C - Am - Dm - G, ฝึกตีคอร์ดลง-ขึ้น"
        error={errors?.topic}
        defaultValue={values.topic}
      />
      <div className="pair">
        <Field
          idPrefix={idPrefix}
          name="minutes"
          label="เวลาที่ฝึก (นาที)"
          inputMode="numeric"
          placeholder="เช่น 20"
          error={errors?.minutes}
          defaultValue={values.minutes}
        />
        <Field
          idPrefix={idPrefix}
          name="feeling"
          label="ความรู้สึกหลังซ้อม"
          as="select"
          placeholder="ไม่ระบุ"
          required={false}
          options={FEELINGS}
          error={errors?.feeling}
          defaultValue={values.feeling}
        />
      </div>
      <div className="pair">
        <Field
          idPrefix={idPrefix}
          name="activity"
          label="หมวดที่ฝึก"
          as="select"
          placeholder="เลือกหมวด"
          options={ACTIVITIES}
          error={errors?.activity}
          defaultValue={values.activity}
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
      </div>
      <Field
        idPrefix={idPrefix}
        name="note"
        label="บันทึกช่วยจำ (ตัวเลือก)"
        as="textarea"
        required={false}
        maxCount={500}
        resetKey={noteResetKey}
        placeholder="เช่น คอร์ด F ยังบอดที่สาย 2 ต้องตั้งนิ้วชี้ให้ชันขึ้น"
        error={errors?.note}
        defaultValue={values.note}
      />
    </div>
  );
}
