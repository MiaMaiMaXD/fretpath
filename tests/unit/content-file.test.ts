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

describe('supabase/content/guitar-basics-round1.sql', () => {
  const round1 = join(process.cwd(), 'supabase', 'content', 'guitar-basics-round1.sql')

  it('contains no user accounts or known passwords', () => {
    const sql = readFileSync(round1, 'utf8')
    for (const banned of ['auth.users', 'auth.identities', '@fretpath.test', 'Passw0rd']) {
      expect(sql).not.toContain(banned)
    }
  })

  it('adds the round-1 lessons with five questions each, using the planned slugs', () => {
    const sql = readFileSync(round1, 'utf8')
    for (const slug of ['read-tab-chord-charts', 'twelve-notes', 'eighth-note-strumming', 'seventh-sus-chords', 'c-major-scale']) {
      expect(sql).toContain(`('${slug}', `)
      expect(sql.split(`perform pg_temp.add_q('${slug}',`).length - 1).toBe(5)
      expect(sql).toContain(`set status = 'published' where slug = '${slug}'`)
    }
  })
})

describe('supabase/content/guitar-basics-round2.sql', () => {
  const round2 = join(process.cwd(), 'supabase', 'content', 'guitar-basics-round2.sql')

  it('contains no user accounts or known passwords', () => {
    const sql = readFileSync(round2, 'utf8')
    for (const banned of ['auth.users', 'auth.identities', '@fretpath.test', 'Passw0rd']) {
      expect(sql).not.toContain(banned)
    }
  })

  it('adds the round-2 lessons with five questions each, using the planned slugs', () => {
    const sql = readFileSync(round2, 'utf8')
    for (const slug of ['building-triads', 'chords-in-a-key', 'capo-octave', 'fingerpicking-basics', 'power-chords-palm-mute']) {
      expect(sql).toContain(`('${slug}', `)
      expect(sql.split(`perform pg_temp.add_q('${slug}',`).length - 1).toBe(5)
      expect(sql).toContain(`set status = 'published' where slug = '${slug}'`)
    }
  })
})
