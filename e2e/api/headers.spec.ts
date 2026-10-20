import { test, expect } from '../fixtures';

for (const path of ['/', '/login']) {
  test(`TC-SEC-24 security headers present on pages (${path}) @security`, async ({ request }) => {
    const res = await request.get(path);
    const h = res.headers();
    const csp = h['content-security-policy'] ?? '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain('frame-src https://www.youtube-nocookie.com');
    expect(csp).not.toContain("'unsafe-eval'");
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(h['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
  });
}
