import Link from 'next/link';
import { plexThai } from '@/lib/fonts';
import './auth.css';

/** Dark card on the night background shared by the redesigned auth pages, with an optional back arrow in the top-left corner. */
export function AuthCard({
  backHref,
  backLabel,
  className,
  children,
}: {
  backHref?: string;
  backLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`fp-auth ${plexThai.variable}`}>
      <main className={`auth-card${className ? ` ${className}` : ''}`}>
        {backHref && (
          <Link href={backHref} className="auth-back" aria-label={backLabel}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </Link>
        )}
        {children}
      </main>
    </div>
  );
}
