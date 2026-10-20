import Link from 'next/link';
import { signOut } from '../(auth)/actions';
import { requireAdmin } from '@/lib/data/admin';

const links = [
  { href: '/admin', label: 'ภาพรวม' },
  { href: '/admin/lessons', label: 'จัดการบทเรียน' },
  { href: '/admin/learners', label: 'ผู้เรียน' },
  { href: '/dashboard', label: 'กลับหน้าผู้เรียน' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <header className="border-b border-neutral-300 dark:border-neutral-700">
        <nav aria-label="เมนูหลังบ้าน" className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-4 gap-y-2 p-3">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="underline-offset-4 hover:underline">
              {l.label}
            </Link>
          ))}
          <form action={signOut} className="ml-auto">
            <button type="submit" className="underline-offset-4 hover:underline">
              ออกจากระบบ
            </button>
          </form>
        </nav>
      </header>
      <div className="mx-auto w-full max-w-4xl flex-1 p-4">{children}</div>
    </>
  );
}
