export function StatCard({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <div data-testid={`stat-${id}`} className="rounded border border-neutral-300 p-3 dark:border-neutral-700">
      <div className="text-sm text-neutral-600 dark:text-neutral-400">{label}</div>
      <div className="mt-1 text-lg font-semibold break-words">{value}</div>
    </div>
  );
}
