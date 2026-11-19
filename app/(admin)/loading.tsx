import { LoadingScreen } from '@/components/LoadingScreen';

// Only the signed-in groups ((learner), (admin)) have a loading screen. A root app/loading.tsx
// would also wrap the static home and auth pages: their prerendered HTML would then ship the
// loading screen first and reveal the real content with a script, which delays LCP.

export default function Loading() {
  return <LoadingScreen />;
}
