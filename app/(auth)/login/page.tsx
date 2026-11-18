import Link from 'next/link';
import { GoogleButton } from '@/components/GoogleButton';
import { LogoMark } from '@/components/LogoMark';
import { AuthCard } from '../AuthCard';
import { LoginForm } from '../forms';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <AuthCard backHref="/" backLabel="กลับหน้าแรก">
      <div className="auth-logo">
        <LogoMark height={80} />
      </div>
      <h1 className="auth-title">
        <span>Welcome to</span> FretPath
      </h1>
      {error === 'link' ? (
        <p role="alert" className="auth-alert">
          ลิงก์ใช้ไม่ได้ หากยืนยันอีเมลแล้วให้เข้าสู่ระบบได้เลย หรือขอลิงก์ใหม่
        </p>
      ) : null}
      <LoginForm next={next ?? ''} />
      <GoogleButton />
      <p className="auth-switch">
        ยังไม่มีบัญชี? <Link href="/signup">สมัครสมาชิก!</Link>
      </p>
    </AuthCard>
  );
}
