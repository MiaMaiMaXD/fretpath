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

/** วันนี้ / เมื่อวาน / "ศ. 31 ต.ค." (weekday optional; year only when it is not the current one). */
export function practiceDayLabel(iso: string, today: string, withWeekday = true): string {
  if (iso === today) return 'วันนี้';
  const t = new Date(`${today}T00:00:00Z`);
  const d = new Date(`${iso}T00:00:00Z`);
  if ((t.getTime() - d.getTime()) / 864e5 === 1) return 'เมื่อวาน';
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'UTC',
    ...(withWeekday ? { weekday: 'short' as const } : {}),
    day: 'numeric',
    month: 'short',
    ...(iso.slice(0, 4) === today.slice(0, 4) ? {} : { year: 'numeric' as const }),
  }).format(d);
}
