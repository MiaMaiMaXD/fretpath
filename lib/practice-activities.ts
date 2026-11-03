export const ACTIVITIES = [
  { value: 'tuning', label: 'ตั้งสาย' },
  { value: 'chords', label: 'คอร์ด' },
  { value: 'strumming', label: 'การดีด' },
  { value: 'song', label: 'เล่นเพลง' },
  { value: 'other', label: 'อื่น ๆ' },
] as const;

export function activityLabel(value: string): string {
  return ACTIVITIES.find((a) => a.value === value)?.label ?? value;
}

/** How a session felt; stored in practice_logs.feeling (CHECK constraint lists the same values). */
export const FEELINGS = [
  { value: 'great', label: 'คล่องขึ้นมาก' },
  { value: 'progress', label: 'เริ่มจับทางได้' },
  { value: 'sore', label: 'เจ็บนิ้ว ต้องซ้อมอีก' },
  { value: 'tough', label: 'ยังยากอยู่' },
] as const;

export function feelingLabel(value: string | null): string | null {
  if (!value) return null;
  return FEELINGS.find((f) => f.value === value)?.label ?? null;
}

/** Card/table title: the learner's own topic, falling back to the activity category. */
export function practiceTitle(log: { topic: string | null; activity: string }): string {
  return log.topic?.trim() || `ฝึก${activityLabel(log.activity)}`;
}
