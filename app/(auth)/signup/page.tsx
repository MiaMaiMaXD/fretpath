import Link from 'next/link';
import { SignupForm } from '../forms';

export default function SignupPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-4">
      <h1 className="text-2xl font-semibold">สมัครสมาชิก</h1>
      <SignupForm />
      <p className="text-sm">
        มีบัญชีแล้ว?{' '}
        <Link href="/login" className="underline">
          ไปหน้าเข้าสู่ระบบ
        </Link>
      </p>
    </main>
  );
}
