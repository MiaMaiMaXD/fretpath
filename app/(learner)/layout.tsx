import Link from 'next/link';
import { signOut } from '../(auth)/actions';
import { createClient } from '@/lib/supabase/server';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/path', label: 'เส้นทางเรียน' },
  { href: '/practice', label: 'บันทึกการฝึก' },
  { href: '/profile', label: 'โปรไฟล์' },
];

export default async function LearnerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc('is_admin');
  return (
    <>
      <header className="border-b border-neutral-300 dark:border-neutral-700">
        <nav aria-label="เมนูหลัก" className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-4 gap-y-2 p-3">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="underline-offset-4 hover:underline">
              {l.label}
            </Link>
          ))}
          {isAdmin ? (
            <Link href="/admin" className="underline-offset-4 hover:underline">
              หลังบ้าน
            </Link>
          ) : null}
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
