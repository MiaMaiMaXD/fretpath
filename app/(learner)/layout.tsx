import Link from 'next/link';
import { BottomNav, HeaderTabs } from '@/components/app/AppNav';
import { UserMenu } from '@/components/app/UserMenu';
import { plexThai } from '@/lib/fonts';
import { createClient } from '@/lib/supabase/server';
import './learner.css';

export default async function LearnerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc('is_admin');
  const { data: auth } = await supabase.auth.getUser();
  const { data: prof } = auth.user
    ? await supabase.from('profiles').select('avatar_url, display_name').eq('id', auth.user.id).maybeSingle()
    : { data: null };
  const name = prof?.display_name?.trim() || auth.user?.email?.split('@')[0] || 'ผู้เรียน';
  return (
    <div className={`fp-app ${plexThai.variable}`}>
      <header className="app-header">
        <div className="wrap">
          <Link href="/dashboard" className="logo" aria-label="FretPath ภาพรวมการเรียน">
            <svg viewBox="0 0 26 26" aria-hidden="true">
              <path d="M13 2 4 9.5v9L13 24l9-5.5v-9z" fill="none" stroke="#e38b12" strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M9 11h8M9 15h8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
            FretPath
          </Link>
          <HeaderTabs isAdmin={Boolean(isAdmin)} />
          <UserMenu name={name} avatarUrl={prof?.avatar_url ?? null} isAdmin={Boolean(isAdmin)} />
        </div>
      </header>
      <div className="app-main wrap">{children}</div>
      <BottomNav isAdmin={Boolean(isAdmin)} />
    </div>
  );
}
