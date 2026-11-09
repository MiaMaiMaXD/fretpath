import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LessonMarkdown } from '@/components/LessonMarkdown'

const html = (source: string) => renderToStaticMarkup(createElement(LessonMarkdown, { source }))

describe('LessonMarkdown', () => {
  it('renders GFM tables as tables inside a sideways-scrolling box', () => {
    const out = html('| คอร์ด | ราก |\n|---|---|\n| C | C |')
    expect(out).toContain('data-testid="lesson-table"')
    expect(out).toContain('<th>คอร์ด</th>')
    expect(out).toContain('<td>C</td>')
    expect(out).not.toContain('|---|')
  })

  it('renders checklists as checkboxes', () => {
    expect(html('- [ ] เล่นเพลงจบ')).toContain('type="checkbox"')
  })

  it('still turns the h1 into an h2 and drops raw HTML', () => {
    const out = html('# หัวข้อ\n\n<script>alert(1)</script>')
    expect(out).toContain('<h2>หัวข้อ</h2>')
    expect(out).not.toContain('<h1')
    expect(out).not.toContain('<script')
  })
})
