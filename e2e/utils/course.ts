/** The guitar-basics course as seeded locally and in CI (guitar-basics.sql + guitar-basics-round1.sql), in course order. */
export const COURSE_SLUGS = [
  'guitar-anatomy-tuning',
  'read-tab-chord-charts',
  'first-chords',
  'open-chords-changes',
  'strumming-4-4',
  'twelve-notes',
  'eighth-note-strumming',
  'f-chord-first-song',
  'seventh-sus-chords',
  'c-major-scale',
] as const;

export const LESSON_COUNT = COURSE_SLUGS.length;
/** The lesson that unlocks after passing lesson 1. */
export const SECOND_LESSON = COURSE_SLUGS[1];
