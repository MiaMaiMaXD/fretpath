import Link from 'next/link';
import { AuthCard } from '../../AuthCard';

/** Shown after the signup code is accepted. verifySignupOtp signs the user out first, so /login opens instead of the dashboard. */
export default function SignupSuccessPage() {
  return (
    <AuthCard className="auth-card-done">
      <svg className="done-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12.5l2.8 2.8L16.5 9.5" />
      </svg>
      <h1 className="auth-heading">สมัครสมาชิกสำเร็จ</h1>
      <p className="done-lede">
        ยินดีต้อนรับเข้าสู่ <strong className="brand-word">FretPath</strong> บัญชีของคุณพร้อมใช้งานแล้ว
      </p>
      <Link href="/login" className="btn-primary-link">
        กลับเข้าสู่หน้าเข้าสู่ระบบ
      </Link>
    </AuthCard>
  );
}
