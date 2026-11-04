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

/** Radio buttons drawn as tappable pills; a fieldset/legend gives the group its name. */
function Choices({
  id,
  name,
  legend,
  options,
  defaultValue,
  error,
  required,
  tone,
}: {
  id: string;
  name: string;
  legend: string;
  options: readonly { value: string; label: string }[];
  defaultValue: string;
  error?: string;
  required?: boolean;
  tone?: boolean;
}) {
  const errorId = `${id}-error`;
  return (
    <fieldset className="choices" aria-describedby={error ? errorId : undefined} aria-invalid={error ? true : undefined}>
      <legend>{legend}</legend>
      <div className="choice-row">
        {options.map((o) => (
          <label key={o.value} className={`choice${tone ? ` tone-${o.value}` : ''}`}>
            <input type="radio" name={name} value={o.value} defaultChecked={defaultValue === o.value} required={required} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      {error ? (
        <p id={errorId} className="field-error">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export function PracticeFields({ idPrefix = '', today, lessons, errors, values, noteResetKey }: Props) {
  return (
    <div className="fields">
      <Field
        idPrefix={idPrefix}
        name="topic"
        label="วันนี้ฝึกอะไร"
        required={false}
        maxLength={120}
        placeholder="เช่น เปลี่ยนคอร์ด C → Am → G ให้ทันจังหวะ"
        error={errors?.topic}
        defaultValue={values.topic}
      />

      <div className="pair">
        <Field
          idPrefix={idPrefix}
          name="minutes"
          label="ซ้อมไปกี่นาที"
          inputMode="numeric"
          error={errors?.minutes}
          defaultValue={values.minutes}
        />
        <Field
          idPrefix={idPrefix}
          name="practicedOn"
          label="วันที่ซ้อม"
          type="date"
          max={today}
          error={errors?.practicedOn}
          defaultValue={values.practicedOn}
        />
      </div>

      <Choices
        id={`${idPrefix}activity`}
        name="activity"
        legend="หมวด"
        options={ACTIVITIES}
        defaultValue={values.activity}
        error={errors?.activity}
        required
      />

      <Choices
        id={`${idPrefix}feeling`}
        name="feeling"
        legend="รู้สึกยังไง"
        options={FEELINGS}
        defaultValue={values.feeling}
        error={errors?.feeling}
        tone
      />

      <Field
        idPrefix={idPrefix}
        name="note"
        label="โน้ตถึงตัวเอง"
        as="textarea"
        required={false}
        maxCount={500}
        resetKey={noteResetKey}
        placeholder="อะไรที่ยังติด หรือเทคนิคที่ได้ผล ไว้อ่านตอนซ้อมครั้งหน้า"
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
    </div>
  );
}
