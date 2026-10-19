const FALLBACK = '/dashboard';

/** Only same-site absolute paths are allowed as post-login redirects. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return FALLBACK;
  return next;
}
