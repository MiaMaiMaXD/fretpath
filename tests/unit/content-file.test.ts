import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const path = join(process.cwd(), 'supabase', 'content', 'guitar-basics.sql')

describe('supabase/content/guitar-basics.sql', () => {
  it('exists', () => {
    expect(existsSync(path)).toBe(true)
  })

  it('contains no user accounts or known passwords', () => {
    const sql = readFileSync(path, 'utf8')
    for (const banned of ['auth.users', 'auth.identities', '@fretpath.test', 'Passw0rd']) {
      expect(sql).not.toContain(banned)
    }
  })

  it('contains the course and all five lesson slugs', () => {
    const sql = readFileSync(path, 'utf8')
    for (const slug of [
      'guitar-basics',
      'guitar-anatomy-tuning',
      'first-chords',
      'open-chords-changes',
      'strumming-4-4',
      'f-chord-first-song',
    ]) {
      expect(sql).toContain(slug)
    }
  })
})
