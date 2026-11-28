import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isChordName } from '@/lib/audio/chords'

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

describe('supabase/content/guitar-basics-round3.sql', () => {
  const round3 = join(process.cwd(), 'supabase', 'content', 'guitar-basics-round3.sql')

  it('contains no user accounts or known passwords', () => {
    const sql = readFileSync(round3, 'utf8')
    for (const banned of ['auth.users', 'auth.identities', '@fretpath.test', 'Passw0rd']) {
      expect(sql).not.toContain(banned)
    }
  })

  it('adds the round-3 lessons with five questions each, using the planned slugs', () => {
    const sql = readFileSync(round3, 'utf8')
    for (const slug of ['barre-e-shape', 'barre-a-shape', 'minor-pentatonic', 'legato-techniques', 'caged-system', 'odd-meters-shuffle', 'final-song-project']) {
      expect(sql).toContain(`('${slug}', `)
      expect(sql.split(`perform pg_temp.add_q('${slug}',`).length - 1).toBe(5)
      expect(sql).toContain(`set status = 'published' where slug = '${slug}'`)
    }
  })
})

describe('supabase/content/guitar-basics-choices4.sql', () => {
  const file = join(process.cwd(), 'supabase', 'content', 'guitar-basics-choices4.sql')

  it('contains no user accounts or known passwords', () => {
    const sql = readFileSync(file, 'utf8')
    for (const banned of ['auth.users', 'auth.identities', '@fretpath.test', 'Passw0rd']) {
      expect(sql).not.toContain(banned)
    }
  })

  it('adds a fourth choice to each of the 46 three-choice questions, at positions 1-4, without touching answer keys', () => {
    const sql = readFileSync(file, 'utf8')
    const calls = [...sql.matchAll(/perform pg_temp\.add_choice\('[^']+', '[^']+', '[^']+', (\d)\);/g)]
    expect(calls).toHaveLength(46)
    expect(new Set(calls.map((m) => m[1]))).toEqual(new Set(['1', '2', '3', '4']))
    expect(sql).not.toMatch(/quiz_answer_keys/)
  })

  it('is loaded by the local seed after round 3', () => {
    const toml = readFileSync(join(process.cwd(), 'supabase', 'config.toml'), 'utf8')
    expect(toml).toContain('"./content/guitar-basics-round3.sql", "./content/guitar-basics-choices4.sql",')
  })
})

describe('supabase/content/guitar-basics-practical.sql', () => {
  const file = join(process.cwd(), 'supabase', 'content', 'guitar-basics-practical.sql')

  it('contains no user accounts or known passwords', () => {
    const sql = readFileSync(file, 'utf8')
    for (const banned of ['auth.users', 'auth.identities', '@fretpath.test', 'Passw0rd']) {
      expect(sql).not.toContain(banned)
    }
  })

  it('adds one practical question to the five chord lessons, using only chords the verifier knows', () => {
    const sql = readFileSync(file, 'utf8')
    const calls = [...sql.matchAll(/perform pg_temp\.add_practical\('([^']+)', array\[([^\]]+)\]\);/g)]
    expect(calls.map((m) => m[1])).toEqual(['first-chords', 'open-chords-changes', 'f-chord-first-song', 'barre-a-shape', 'caged-system'])
    for (const m of calls) {
      for (const chord of m[2].split(',').map((c) => c.trim().replace(/'/g, ''))) expect(isChordName(chord)).toBe(true)
    }
  })

  it('is loaded by the local seed after the four-choice content', () => {
    const toml = readFileSync(join(process.cwd(), 'supabase', 'config.toml'), 'utf8')
    expect(toml).toContain('"./content/guitar-basics-choices4.sql", "./content/guitar-basics-practical.sql", "./seed.sql"')
  })
})
