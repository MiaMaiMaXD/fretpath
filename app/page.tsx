import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 p-4 text-center">
      <h1 className="text-3xl font-semibold">FretPath</h1>
      <p className="text-lg">คอร์สกีตาร์พื้นฐาน เรียนทีละก้าว พร้อมแบบทดสอบและบันทึกการฝึก</p>
      <div className="flex gap-3">
        <Link
          href="/signup"
          className="rounded bg-neutral-900 px-4 py-2 font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          เริ่มเรียนฟรี
        </Link>
        <Link href="/login" className="rounded border border-neutral-400 px-4 py-2 font-medium">
          เข้าสู่ระบบ
        </Link>
      </div>
    </main>
  );
}
