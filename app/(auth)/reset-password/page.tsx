import { ResetForm } from '../forms';

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-4">
      <h1 className="text-2xl font-semibold">ตั้งรหัสผ่านใหม่</h1>
      <ResetForm />
    </main>
  );
}
