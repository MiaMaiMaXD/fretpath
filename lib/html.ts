import sanitizeHtml from 'sanitize-html';

/* Lesson text pages are HTML from the admin rich-text editor (TipTap). Everything is filtered through
   this allowlist before a learner sees it (and before it is saved), so only formatting survives:
   no scripts, event handlers, iframes or arbitrary styles. */

const SAFE_COLOR = /^(#[0-9a-f]{3,8}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$/i;
const SAFE_SIZE = /^\d{1,2}(\.\d+)?px$/;
const SAFE_ALIGN = /^(left|right|center|justify)$/;

export function sanitizeLessonHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'span', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt'],
      span: ['style'],
      p: ['style'],
      h2: ['style'],
      h3: ['style'],
      h4: ['style'],
      ol: ['start'],
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    // images come from Supabase storage (https in production, http on a local stack); CSP img-src limits where
    allowedSchemesByTag: { img: ['https', 'http'] },
    allowedStyles: {
      span: { color: [SAFE_COLOR], 'font-size': [SAFE_SIZE] },
      p: { 'text-align': [SAFE_ALIGN] },
      h2: { 'text-align': [SAFE_ALIGN] },
      h3: { 'text-align': [SAFE_ALIGN] },
      h4: { 'text-align': [SAFE_ALIGN] },
    },
    transformTags: {
      // the page title is the only h1
      h1: 'h2',
      a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' } }),
    },
  });
}
