import type { NextConfig } from "next";

// Read at build time. Origin only, so the CSP source is a clean host source.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl && process.env.NODE_ENV === 'production') {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required to build the Content-Security-Policy');
}
const supabaseOrigin = new URL(supabaseUrl ?? 'http://127.0.0.1:54321').origin;
const isDev = process.env.NODE_ENV === 'development';

const csp = [
  "default-src 'self'",
  // Next injects inline bootstrap scripts; 'unsafe-eval' is only for `next dev` (React refresh).
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseOrigin}`,
  `connect-src 'self' ${supabaseOrigin}`,
  'frame-src https://www.youtube-nocookie.com',
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
