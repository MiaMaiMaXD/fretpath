import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const SR = 48000;

/**
 * Writes a mono 16-bit WAV of plucked notes for Chrome's fake microphone
 * (--use-file-for-fake-audio-capture). Each note is a decaying tone with two harmonics, 1 s long,
 * followed by 0.3 s of silence; the file starts with 0.5 s of silence. Chrome loops the file.
 */
export function writePluckWav(path: string, midis: number[]): void {
  const noteLen = SR, gap = Math.round(0.3 * SR), lead = Math.round(0.5 * SR);
  const total = lead + midis.length * (noteLen + gap);
  const pcm = new Int16Array(total);
  midis.forEach((m, k) => {
    const hz = 440 * 2 ** ((m - 69) / 12);
    const at = lead + k * (noteLen + gap);
    for (let i = 0; i < noteLen; i++) {
      const t = i / SR;
      const env = 0.5 * Math.exp(-t / 0.6) * Math.min(1, i / 48);
      const v = (Math.sin(2 * Math.PI * hz * t) + 0.4 * Math.sin(4 * Math.PI * hz * t) + 0.15 * Math.sin(6 * Math.PI * hz * t)) / 1.55;
      pcm[at + i] = Math.round(env * v * 32767);
    }
  });
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.byteLength, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.byteLength, 40);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.concat([header, Buffer.from(pcm.buffer)]));
}

/**
 * The D chord (strings 4 → 1: D3 A3 D4 F#4) with one mistake: string 2 is first played one fret too
 * high (D#4), then correctly.
 */
export const D_CHORD_WITH_MISTAKE = [50, 57, 63, 62, 66];
