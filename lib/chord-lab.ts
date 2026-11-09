/** Lessons that show the chord lab (Em Am C D G F) under the content. Keyed by slug, so reordering or
    inserting lessons in the course never moves it onto the wrong lesson. */
const CHORD_LAB_SLUGS: ReadonlySet<string> = new Set(['first-chords', 'open-chords-changes', 'strumming-4-4', 'f-chord-first-song']);

export function showsChordLab(slug: string): boolean {
  return CHORD_LAB_SLUGS.has(slug);
}
