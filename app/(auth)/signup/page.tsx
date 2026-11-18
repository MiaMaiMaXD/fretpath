import { GoogleButton } from '@/components/GoogleButton';
import { AuthCard } from '../AuthCard';
import { SignupForm } from '../forms';

export default function SignupPage() {
  return (
    <AuthCard backHref="/login" backLabel="กลับไปหน้าเข้าสู่ระบบ" className="auth-card-plain">
      <h1 className="auth-heading auth-heading-form">สมัครสมาชิก</h1>
      <SignupForm />
      <GoogleButton label="สมัครสมาชิกด้วย Google" />
    </AuthCard>
  );
}
