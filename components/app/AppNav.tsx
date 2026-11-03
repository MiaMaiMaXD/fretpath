'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/dashboard', label: 'ภาพรวมการเรียน' },
  { href: '/path', label: 'เส้นทางเรียน' },
  { href: '/practice', label: 'บันทึกการฝึก' },
];

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop tabs in the header (hidden below 900px, where BottomNav takes over). */
export function HeaderTabs({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const tabs = isAdmin ? [...TABS, { href: '/admin', label: 'หลังบ้าน' }] : TABS;
  return (
    <nav className="tabs" aria-label="เมนูหลัก">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={isCurrent(pathname, t.href) ? 'page' : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

const ICONS: Record<string, React.ReactNode> = {
  '/dashboard': <path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 4v3h6V4z" />,
  '/path': (
    <>
      <circle cx="5" cy="18" r="2" />
      <circle cx="19" cy="6" r="2" />
      <path d="M7 18h6a4 4 0 0 0 0-8h-2a4 4 0 0 1 0-8h6" />
    </>
  ),
  '/practice': (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2M9 2h6" />
    </>
  ),
  '/profile': (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  '/admin': (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
    </>
  ),
};
const BOTTOM = [
  { href: '/dashboard', label: 'ภาพรวม' },
  { href: '/path', label: 'เส้นทาง' },
  { href: '/practice', label: 'ฝึก' },
  { href: '/profile', label: 'โปรไฟล์' },
];

/** Fixed bottom bar on phones and small tablets. */
export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...BOTTOM, { href: '/admin', label: 'หลังบ้าน' }] : BOTTOM;
  return (
    <nav className="bottom-nav" aria-label="เมนูหลัก (มือถือ)">
      {items.map((t) => (
        <Link key={t.href} href={t.href} aria-current={isCurrent(pathname, t.href) ? 'page' : undefined}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {ICONS[t.href]}
          </svg>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
