import { AuthCard } from '../../AuthCard';
import { ResetForm } from '../../forms';

export default function ResetPasswordPage() {
  return (
    <AuthCard backHref="/forgot-password" backLabel="กลับไปหน้าลืมรหัสผ่าน" className="auth-card-plain">
      <h1 className="auth-heading auth-heading-form">กรอกรหัสผ่านใหม่</h1>
      <ResetForm />
    </AuthCard>
  );
}
