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
            โปรไฟล์และเป้าหมาย
          </Link>
        </li>
        {isAdmin ? (
          <li>
            <Link href="/admin">หลังบ้าน</Link>
          </li>
        ) : null}
        <li className="sep" role="separator" />
        <li>
          <form action={signOut}>
            <button type="submit" data-testid="menu-logout">
              ออกจากระบบ
            </button>
          </form>
        </li>
      </ul>
    </details>
  );
}
