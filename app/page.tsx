import Link from 'next/link';

const subnav = [
  { href: '#overview', label: 'ภาพรวมการเรียน' },
  { href: '/path', label: 'เส้นทางการเรียน' },
  { href: '#about', label: 'เกี่ยวกับเรา' },
];

const steps = [
  'ทำความรู้จักกีตาร์และเรียนรู้พื้นฐานที่จำเป็น',
  'เริ่มจับคอร์ด ฝึกวางนิ้ว และเรียนรู้วิธีการดีด',
  'ทำแบบทดสอบหลังเรียนและบันทึกการฝึก เพื่อพัฒนาทักษะอย่างต่อเนื่อง',
];

const primaryButton =
  'inline-flex items-center rounded-full bg-accent px-6 py-2.5 font-semibold text-white shadow-sm hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="size-6">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.3 4.3c.4-1.7 3-1.7 3.4 0a1.7 1.7 0 0 0 2.6 1.1c1.5-.9 3.3.8 2.4 2.4a1.7 1.7 0 0 0 1 2.5c1.8.4 1.8 3 0 3.4a1.7 1.7 0 0 0-1 2.6c.9 1.5-.9 3.3-2.4 2.4a1.7 1.7 0 0 0-2.6 1c-.4 1.8-3 1.8-3.4 0a1.7 1.7 0 0 0-2.5-1c-1.6.9-3.3-.9-2.4-2.4a1.7 1.7 0 0 0-1.1-2.6c-1.7-.4-1.7-3 0-3.4a1.7 1.7 0 0 0 1.1-2.5c-.9-1.6.8-3.3 2.4-2.4a1.7 1.7 0 0 0 2.5-1.1Z"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-paper text-ink dark:bg-neutral-950 dark:text-neutral-100">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="text-2xl font-semibold">
            FretPath
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold hover:bg-accent-strong"
            >
              เข้าสู่ระบบ
            </Link>
            <Link href="/profile" aria-label="ตั้งค่า" className="rounded-full p-1 hover:bg-white/10">
              <GearIcon />
            </Link>
          </div>
        </div>
        <nav aria-label="เมนูหน้าแรก" className="bg-ink-soft">
          <ul className="mx-auto flex max-w-5xl flex-wrap gap-x-6 gap-y-1 px-4 py-2 text-sm">
            {subnav.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="underline-offset-4 hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-4 py-12">
        <section className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col items-start gap-6">
            <h1 className="text-4xl leading-tight font-bold text-balance sm:text-5xl">
              เริ่มต้นเส้นทาง
              <br />
              มือกีตาร์ได้ง่าย ๆ
              <br />
              ตั้งแต่วันนี้
            </h1>
            <p className="max-w-md text-neutral-700 dark:text-neutral-300">
              เรียนรู้ตั้งแต่พื้นฐาน ฝึกจับคอร์ดและการดีดกีตาร์ พร้อมพัฒนาทักษะทีละขั้นไปกับ FretPath
            </p>
            <Link href="/signup" className={primaryButton}>
              เริ่มเรียนกันเลย!
            </Link>
          </div>
          {/* Placeholder until the real guitar photo (transparent PNG) is added. */}
          <div
            role="img"
            aria-label="รูปกีตาร์โปร่ง (รอใส่รูปจริง)"
            className="mx-auto flex aspect-[3/4] w-full max-w-60 items-center md:max-w-xs justify-center rounded-2xl border-2 border-dashed border-neutral-300 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
          >
            รูปกีตาร์
          </div>
        </section>

        <section
          id="overview"
          className="mx-auto flex w-full max-w-3xl scroll-mt-4 flex-col gap-4 rounded-xl bg-ink p-8 text-white shadow-lg dark:ring-1 dark:ring-white/15"
        >
          <h2 className="text-2xl font-semibold text-balance sm:text-3xl">เริ่มต้นก้าวแรก สู่การเล่นกีตาร์ที่คุณรัก</h2>
          <p className="max-w-xl text-neutral-200">
            เรียนกีตาร์ตั้งแต่พื้นฐาน ฝึกจับคอร์ดและการดีดทีละขั้น
            พร้อมพัฒนาทักษะตามเส้นทางการเรียนที่ออกแบบมาสำหรับมือใหม่
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/signup" className={primaryButton}>
              เริ่มเรียนกันเลย!
            </Link>
            <Link href="/path" className="font-medium text-accent-light underline-offset-4 hover:underline">
              เส้นทางการเรียน
            </Link>
          </div>
        </section>

        <section id="about" className="mx-auto flex w-full max-w-3xl scroll-mt-4 flex-col gap-4">
          <h2 className="text-lg font-semibold">เริ่มต้นที่นี่ ทีละขั้น</h2>
          <ol className="list-decimal space-y-1 pl-6">
            {steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p className="text-neutral-700 dark:text-neutral-300">
            FretPath แบ่งการเรียนออกเป็นบทเรียนสั้น ๆ ที่เข้าใจง่าย ตั้งแต่การรู้จักส่วนต่าง ๆ ของกีตาร์
            ไปจนถึงการจับคอร์ดและฝึกจังหวะการดีด คุณสามารถเรียนตามลำดับความยาก ทำแบบทดสอบเพื่อทบทวนความรู้
            และติดตามความคืบหน้าของตัวเองได้ใน Dashboard
          </p>
        </section>
      </main>
    </div>
  );
}
