import { signInWithGoogle } from '@/app/(auth)/actions';

/** Rendered only when Google sign-in is configured (NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true). */
export function GoogleButton() {
  if (process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED !== 'true') return null;
  return (
    <form action={signInWithGoogle}>
      <button type="submit" className="w-full rounded border px-4 py-2">
        เข้าสู่ระบบด้วย Google
      </button>
    </form>
  );
}
