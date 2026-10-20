const FALLBACK = '/dashboard';
// Browsers strip tab/CR/LF inside URLs, so reject control chars, whitespace and backslashes anywhere.
const UNSAFE = /[\u0000-\u001f\u007f\s\\]/;

/** Only same-site absolute paths are allowed as post-login redirects. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || UNSAFE.test(next)) return FALLBACK;
  return next;
}
