import { LoadingScreen } from '@/components/LoadingScreen';

// Needed so the loading screen also shows when moving between learner pages (the layout is shared,
// so the root app/loading.tsx would not trigger). The screen covers the header too.
export default function Loading() {
  return <LoadingScreen />;
}
