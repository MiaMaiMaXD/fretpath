'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

/** Remembered per device (each device has its own microphones), read by the mic play-along later. */
export const MIC_STORAGE_KEY = 'fretpath.micDeviceId';

type Mic = { id: string; label: string };

function readSaved(): string {
  try {
    return localStorage.getItem(MIC_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}
function writeSaved(id: string) {
  try {
    if (id) localStorage.setItem(MIC_STORAGE_KEY, id);
    else localStorage.removeItem(MIC_STORAGE_KEY);
  } catch {
    // private mode / blocked storage: the choice just isn't remembered
  }
}

const noSubscribe = () => () => {};
const subscribeStorage = (cb: () => void) => {
  window.addEventListener('storage', cb);
  return () => window.removeEventListener('storage', cb);
};

export function MicSettings() {
  // read browser-only values without a hydration mismatch (server render assumes "supported, nothing saved")
  const supported = useSyncExternalStore(noSubscribe, () => Boolean(navigator.mediaDevices?.getUserMedia), () => true);
  const savedId = useSyncExternalStore(subscribeStorage, readSaved, () => '');
  const [chosen, setChosen] = useState<string | null>(null);
  const micId = chosen ?? savedId;
  const [mics, setMics] = useState<Mic[]>([]);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const level = useRef<HTMLElement>(null);
  const live = useRef<{ stream: MediaStream; ctx: AudioContext; raf: number } | null>(null);

  const listMics = useCallback(async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    // labels are only filled in after the user has allowed the microphone once
    setMics(devices.filter((d) => d.kind === 'audioinput' && d.label && d.deviceId !== 'default').map((d) => ({ id: d.deviceId, label: d.label })));
  }, []);

  useEffect(() => {
    const md = navigator.mediaDevices;
    if (!md?.getUserMedia) return;
    md.enumerateDevices().then((devices) => {
      if (devices.some((d) => d.kind === 'audioinput' && d.label)) void listMics();
    });
    md.addEventListener('devicechange', listMics);
    return () => md.removeEventListener('devicechange', listMics);
  }, [listMics]);

  const stop = useCallback(() => {
    const l = live.current;
    if (l) {
      cancelAnimationFrame(l.raf);
      l.stream.getTracks().forEach((t) => t.stop());
      void l.ctx.close();
    }
    live.current = null;
    if (level.current) level.current.style.width = '0%';
    setTesting(false);
  }, []);
  useEffect(() => stop, [stop]);

  const start = useCallback(
    async (id: string) => {
      setMessage(null);
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: id ? { deviceId: { exact: id } } : true });
      } catch (e) {
        const name = e instanceof DOMException ? e.name : '';
        setMessage(
          name === 'NotAllowedError'
            ? 'ไม่ได้รับอนุญาตให้ใช้ไมค์ — เปิดสิทธิ์ไมโครโฟนในการตั้งค่าเบราว์เซอร์'
            : name === 'NotFoundError' || name === 'OverconstrainedError'
              ? 'ไม่พบไมโครโฟนนี้ ลองเลือกตัวอื่น'
              : 'เปิดไมค์ไม่สำเร็จ',
        );
        return;
      }
      await listMics();
      const ctx = new AudioContext();
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.fftSize);
      const tick = () => {
        an.getByteTimeDomainData(buf);
        let peak = 0;
        for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
        if (level.current) level.current.style.width = `${Math.min(100, peak * 1.6)}%`;
        if (live.current) live.current.raf = requestAnimationFrame(tick);
      };
      live.current = { stream, ctx, raf: requestAnimationFrame(tick) };
      setTesting(true);
    },
    [listMics],
  );

  function choose(id: string) {
    setChosen(id);
    writeSaved(id);
    if (live.current) {
      stop();
      void start(id);
    }
  }

  if (!supported) {
    return (
      <section className="audio" aria-labelledby="audio-h">
        <h2 id="audio-h">ตั้งค่าเสียง</h2>
        <p className="sec-hint">เบราว์เซอร์นี้ใช้ไมโครโฟนไม่ได้</p>
      </section>
    );
  }

  // a saved mic that is not plugged in right now still shows, so the choice isn't silently lost
  // (before permission the list is empty, so it shows as just "the mic you chose")
  const options =
    micId && !mics.some((m) => m.id === micId)
      ? [...mics, { id: micId, label: mics.length > 0 ? 'ไมค์ที่เลือกไว้ (ไม่ได้เชื่อมต่อ)' : 'ไมค์ที่เลือกไว้' }]
      : mics;

  return (
    <section className="audio" aria-labelledby="audio-h">
      <h2 id="audio-h">ตั้งค่าเสียง</h2>
      <p className="sec-hint">ใช้กับแบบฝึกเล่นตามด้วยไมค์ · จำไว้เฉพาะเครื่องนี้</p>
      <div className="set">
        <label htmlFor="mic-select">ไมโครโฟน</label>
        <select id="mic-select" value={micId} onChange={(e) => choose(e.target.value)}>
          <option value="">ค่าเริ่มต้นของเครื่อง</option>
          {options.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div className="set">
        <span id="mic-test-label">ทดสอบไมค์ (ลองดีดสาย)</span>
        <div className="test-row">
          <button type="button" className="btn" aria-describedby="mic-test-label" onClick={() => (testing ? stop() : void start(micId))}>
            {testing ? 'หยุด' : 'เริ่มทดสอบ'}
          </button>
          <div className="meter" aria-hidden="true">
            <i ref={level} />
          </div>
        </div>
      </div>
      {message ? (
        <p className="field-err" role="alert">
          {message}
        </p>
      ) : null}
    </section>
  );
}
