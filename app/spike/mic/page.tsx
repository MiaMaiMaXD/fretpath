// SPIKE (throwaway): public test page for mic note/chord detection. Not for merge.
import type { Metadata } from 'next';
import { MicLab } from './MicLab';

export const metadata: Metadata = {
  title: 'ทดสอบไมค์ (spike)',
  robots: { index: false, follow: false },
};

export default function MicSpikePage() {
  return <MicLab />;
}
