import Link from 'next/link';
import { GoogleButton } from '@/components/GoogleButton';
import { LoginForm } from '../forms';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-4">
      <h1 className="text-2xl font-semibold">เข้าสู่ระบบ</h1>
      {error === 'link' ? (
        <p role="alert" className="text-red-600">
          ลิงก์ใช้ไม่ได้ หากยืนยันอีเมลแล้วให้เข้าสู่ระบบได้เลย หรือขอลิงก์ใหม่
        </p>
      ) : null}
      <LoginForm next={next ?? ''} />
      <GoogleButton />
      <p className="text-sm">
        <Link href="/forgot-password" className="underline">
          ลืมรหัสผ่าน?
        </Link>{' '}
        ·{' '}
        <Link href="/signup" className="underline">
          สมัครสมาชิกใหม่
        </Link>
      </p>
    </main>
  );
}
