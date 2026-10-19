import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-2xl font-semibold">ไม่พบหน้าที่คุณต้องการ</h1>
      <Link href="/" className="underline">
        กลับหน้าแรก
      </Link>
    </main>
  );
}
