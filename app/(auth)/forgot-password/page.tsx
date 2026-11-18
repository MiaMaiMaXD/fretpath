import { AuthCard } from '../AuthCard';
import { ForgotForm } from '../forms';

export default function ForgotPasswordPage() {
  return (
    <AuthCard backHref="/login" backLabel="กลับไปหน้าเข้าสู่ระบบ" className="auth-card-plain">
      <h1 className="auth-heading">ลืมรหัสผ่าน?</h1>
      <p className="auth-lede">
        กรุณากรอกอีเมลของคุณ ทางเราจะส่งลิงก์ตั้งรหัสผ่านใหม่
        <br />
        ไปทางอีเมลของคุณ
      </p>
      <ForgotForm />
    </AuthCard>
  );
}
