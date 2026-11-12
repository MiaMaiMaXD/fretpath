import type { Metadata } from 'next';
import { AvatarUpload } from '@/components/AvatarUpload';
import { getMyProfile } from '@/lib/data/profile';
import { thaiJoinDate } from '@/lib/profile-ui';
import { GoalForm } from './GoalForm';
import { MicSettings } from './MicSettings';
import { NameEditor } from './NameEditor';
import { PasswordReset } from './PasswordReset';
import { ToastProvider } from './Toast';
import './profile.css';

export const metadata: Metadata = { title: 'โปรไฟล์ — FretPath' };

export default async function ProfilePage() {
  const p = await getMyProfile();
  const name = p.displayName.trim() || p.email.split('@')[0] || 'ผู้เรียน';
  const initial = Array.from(name)[0] ?? '?';

  return (
    <div className="fp-prof">
      <ToastProvider>
        <section className="card">
          <h1>โปรไฟล์</h1>

          <div className="ident">
            <AvatarUpload userId={p.id} avatarUrl={p.avatarUrl} initial={initial} />
            <div className="ident-text">
              <NameEditor initialName={name} />
              <p className="since">เริ่มเรียนเมื่อ {thaiJoinDate(p.createdAt)}</p>
            </div>
          </div>

          <dl className="rows">
            <div className="row">
              <dt>อีเมล</dt>
              <dd data-testid="profile-email">{p.email}</dd>
            </div>
            {p.login.password ? (
              <div className="row" data-testid="profile-password">
                <dt>รหัสผ่าน</dt>
                <dd>
                  <span aria-hidden="true">••••••••••</span>
                  <span className="sr-only">ตั้งไว้แล้ว (ซ่อน)</span>
                </dd>
                <PasswordReset email={p.email} />
              </div>
            ) : null}
            {p.login.google ? (
              <div className="row" data-testid="profile-google">
                <dt>เข้าสู่ระบบด้วย</dt>
                <dd>
                  <span className="badge">
                    <b className="g" aria-hidden="true">
                      G
                    </b>{' '}
                    บัญชี Google
                  </span>
                </dd>
              </div>
            ) : null}
          </dl>

          <hr />
          <GoalForm initialGoal={p.weeklyGoalMinutes} />
          <hr />
          <MicSettings />
        </section>
      </ToastProvider>
    </div>
  );
}
