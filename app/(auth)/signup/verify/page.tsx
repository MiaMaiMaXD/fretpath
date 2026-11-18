import { redirect } from 'next/navigation';
import { readOtpWindow } from '@/lib/reset-otp';
import { resendSignupOtp, verifySignupOtp } from '../../actions';
import { AuthCard } from '../../AuthCard';
import { OtpForm } from '../../OtpForm';

export default async function SignupOtpPage() {
  const otpWindow = await readOtpWindow('signup');
  // Only reachable after submitting /signup (or logging in with an unconfirmed account).
  if (!otpWindow) redirect('/signup');
  return (
    <AuthCard backHref="/signup" backLabel="กลับไปหน้าสมัครสมาชิก" className="auth-card-plain">
      <h1 className="auth-heading" id="otp-heading">
        กรอกรหัส OTP
      </h1>
      <p className="otp-sub">ส่งรหัส OTP ไปยังอีเมลของคุณ</p>
      <OtpForm expiresIn={otpWindow.expiresIn} resendIn={otpWindow.resendIn} verify={verifySignupOtp} resend={resendSignupOtp} />
    </AuthCard>
  );
}
