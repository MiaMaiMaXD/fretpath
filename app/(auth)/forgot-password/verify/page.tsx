import { redirect } from 'next/navigation';
import { readResetOtpWindow } from '@/lib/reset-otp';
import { AuthCard } from '../../AuthCard';
import { OtpForm } from './OtpForm';

export default async function ResetOtpPage() {
  const otpWindow = await readResetOtpWindow();
  // Only reachable after asking for a code on /forgot-password (or the profile page).
  if (!otpWindow) redirect('/forgot-password');
  return (
    <AuthCard backHref="/forgot-password" backLabel="กลับไปหน้าลืมรหัสผ่าน" className="auth-card-plain">
      <h1 className="auth-heading" id="otp-heading">
        กรอกรหัส OTP
      </h1>
      <p className="otp-sub">ส่งรหัส OTP ไปยังอีเมลของคุณ</p>
      <OtpForm expiresIn={otpWindow.expiresIn} resendIn={otpWindow.resendIn} />
    </AuthCard>
  );
}
