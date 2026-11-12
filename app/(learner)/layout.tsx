import Link from 'next/link';
import { BottomNav, HeaderTabs } from '@/components/app/AppNav';
import { UserMenu } from '@/components/app/UserMenu';
import { MiniPlayer } from '@/components/practice/MiniPlayer';
import { PracticeSessionProvider } from '@/components/practice/PracticeSession';
import { plexThai } from '@/lib/fonts';
import { createClient } from '@/lib/supabase/server';
import { LogoMark } from '@/components/LogoMark';
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
            <LogoMark />
            FretPath
          </Link>
          <HeaderTabs isAdmin={Boolean(isAdmin)} />
          <UserMenu name={name} avatarUrl={prof?.avatar_url ?? null} isAdmin={Boolean(isAdmin)} />
        </div>
      </header>
      <PracticeSessionProvider>
        <div className="app-main wrap">{children}</div>
        <MiniPlayer />
      </PracticeSessionProvider>
      <BottomNav isAdmin={Boolean(isAdmin)} />
    </div>
  );
}
