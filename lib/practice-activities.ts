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
