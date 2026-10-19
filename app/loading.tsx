export default function Loading() {
  return (
    <main className="flex flex-1 items-center justify-center p-4" aria-busy="true">
      <p role="status">กำลังโหลด…</p>
    </main>
  );
}
