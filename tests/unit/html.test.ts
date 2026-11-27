import { describe, expect, it } from 'vitest';
import { sanitizeLessonHtml } from '@/lib/html';

describe('sanitizeLessonHtml', () => {
  it('keeps editor formatting', () => {
    const html = '<p style="text-align: center"><strong>a</strong> <span style="color: #e38b12; font-size: 18px">b</span></p><ul><li>c</li></ul>';
    expect(sanitizeLessonHtml(html)).toBe(html.replace('text-align: center', 'text-align:center').replace('color: #e38b12; font-size: 18px', 'color:#e38b12;font-size:18px'));
  });

  it('removes scripts, handlers and javascript links', () => {
    const out = sanitizeLessonHtml('<p onclick="x()">t<script>alert(1)</script><a href="javascript:alert(1)">l</a><iframe src="https://x"></iframe></p>');
    expect(out).not.toMatch(/script|onclick|javascript|iframe/);
    expect(out).toContain('t');
  });

  it('drops unsafe styles and non-web image sources', () => {
    expect(sanitizeLessonHtml('<span style="position:fixed;color:red">x</span>')).toBe('<span>x</span>');
    expect(sanitizeLessonHtml('<img src="javascript:alert(1)" alt="x">')).not.toContain('javascript');
    expect(sanitizeLessonHtml('<img src="data:image/png;base64,AAAA" alt="x">')).not.toContain('data:');
    expect(sanitizeLessonHtml('<img src="https://a/b.png" alt="x">')).toContain('src="https://a/b.png"');
  });

  it('opens links in a new tab safely and turns h1 into h2', () => {
    expect(sanitizeLessonHtml('<a href="https://a.b">x</a>')).toBe('<a href="https://a.b" target="_blank" rel="noopener noreferrer">x</a>');
    expect(sanitizeLessonHtml('<h1>t</h1>')).toBe('<h2>t</h2>');
  });
});
