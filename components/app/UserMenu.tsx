'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { signOut } from '@/app/(auth)/actions';

export function UserMenu({ name, avatarUrl, isAdmin }: { name: string; avatarUrl: string | null; isAdmin: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  const initial = Array.from(name.trim())[0] ?? '?';

  // Close after navigating, on a click outside, or on Escape.
  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);
  useEffect(() => {
    const close = (e: Event) => {
      const el = ref.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent) {
        if (e.key !== 'Escape') return;
        el.open = false;
        el.querySelector('summary')?.focus();
      } else if (!el.contains(e.target as Node)) {
        el.open = false;
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, []);

  return (
    <details className="user" data-testid="user-menu" ref={ref}>
      <summary>
        <span className="sr-only">เมนูบัญชีของ </span>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="รูปโปรไฟล์" width={34} height={34} className="avatar" />
        ) : (
          <span className="avatar" aria-hidden="true">
            {initial}
          </span>
        )}
        <span className="name">{name}</span>
        <span className="caret" aria-hidden="true">
          ▾
        </span>
      </summary>
      <ul className="menu">
        <li>
          <Link href="/profile" data-testid="menu-profile">
            <MenuIcon d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />
            โปรไฟล์
          </Link>
        </li>
        {/* admin tools (more may join "จัดการบทเรียน" later) */}
        {isAdmin ? (
          <li>
            <Link href="/admin/lessons" data-testid="menu-admin-lessons">
              <MenuIcon d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z" />
              จัดการบทเรียน
            </Link>
          </li>
        ) : null}
        <li>
          <form action={signOut}>
            <button type="submit" data-testid="menu-logout">
              <MenuIcon d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M21 12H9M13 8l-4 4 4 4" />
              ออกจากระบบ
            </button>
          </form>
        </li>
      </ul>
    </details>
  );
}

function MenuIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
