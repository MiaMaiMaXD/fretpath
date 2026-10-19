import { ForgotForm } from '../forms';

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-4">
      <h1 className="text-2xl font-semibold">ลืมรหัสผ่าน</h1>
      <ForgotForm />
    </main>
  );
}
