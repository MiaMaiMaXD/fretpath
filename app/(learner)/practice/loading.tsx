import { LoadingScreen } from '@/components/LoadingScreen';

// app/(learner)/loading.tsx only shows when moving between top-level learner pages: going from /practice to
// /practice/history (or back) keeps the same "practice" segment, so that boundary never triggers. This one wraps
// the pages inside /practice so the logo loading screen shows there too.
export default function Loading() {
  return <LoadingScreen />;
}
