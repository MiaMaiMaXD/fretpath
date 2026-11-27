'use client';

import { useEffect, useState } from 'react';
import { timeUntil } from '@/lib/bangkok';

/** Red notice once the quiz quota is used up: "…ทำแบบทดสอบอีกครั้งในอีก 23 ชั่วโมง 59 นาที", ticking. */
export function RetryCountdown({ until }: { until: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // the clock starts after hydration so server and client render the same first frame
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);
  const at = new Date(until);
  return (
    <p className="lv-quota-out" role="status" data-testid="quiz-retry-at">
      คุณใช้โควต้าครบจำนวนแล้ว
      {now && at > now ? ` คุณสามารถทำแบบทดสอบอีกครั้งในอีก ${timeUntil(at, now)}` : now ? ' ทำแบบทดสอบได้อีกครั้งแล้ว ลองโหลดหน้าใหม่' : ''}
    </p>
  );
}
