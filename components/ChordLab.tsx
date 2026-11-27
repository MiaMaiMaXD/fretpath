'use client';

import { useState } from 'react';
import { chordFrequencies, type ChordName } from '@/lib/audio/chords';
import { getAudioContext, pluck } from '@/lib/audio/strings';
import { ChordDiagram } from './ChordDiagram';
import { useAudioSupported } from './StringPlayer';

const DEFAULT: ChordName[] = ['Em', 'Am', 'C', 'D', 'G', 'F'];

/** Pick a chord, see its diagram and hear it. `chords` = the lesson's example chords. */
export function ChordLab({ chords = DEFAULT }: { chords?: ChordName[] }) {
  const NAMES = chords.length > 0 ? chords : DEFAULT;
  const [name, setName] = useState<ChordName>(NAMES[0]);
  const supported = useAudioSupported();
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">ห้องทดลองคอร์ด</h2>
      <div className="flex flex-wrap gap-2">
        {NAMES.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={n === name}
            onClick={() => setName(n)}
            className={`rounded border px-3 py-2 ${n === name ? 'font-semibold underline' : ''}`}
          >
            {n}
          </button>
        ))}
      </div>
      <ChordDiagram name={name} />
      <button
        type="button"
        disabled={!supported}
        onClick={() => {
          const ctx = getAudioContext();
          if (!ctx) return;
          const freqs = chordFrequencies(name);
          // Scale each voice by 1/n so a six-string chord does not clip.
          freqs.forEach((hz, i) => {
            window.setTimeout(() => pluck(ctx, hz, 2, 1 / freqs.length), i * 60);
          });
        }}
        className="self-start rounded border px-4 py-2 disabled:opacity-50"
      >
        ฟังเสียง
      </button>
      {!supported ? <p role="status">เบราว์เซอร์นี้ไม่รองรับเสียง</p> : null}
    </section>
  );
}
