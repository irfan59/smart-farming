import { cn } from '../lib/cn';

// Keeps its DOM text equal to the raw status (e.g. "active", "pending approval") so tests that
// assert on the literal status still pass; `capitalize` only changes the visual casing.
const STYLES = {
  pending_approval: 'bg-harvest-50 text-harvest-700 ring-harvest-600/20',
  trial: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  active: 'bg-brand-50 text-brand-700 ring-brand-600/20',
  grace: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  expired: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  suspended: 'bg-red-50 text-red-700 ring-red-600/20',
  deactivated: 'bg-red-50 text-red-700 ring-red-600/20',
};

export default function StatusPill({ status }) {
  if (!status) return <span className="text-slate-400">—</span>;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset',
        STYLES[status] || STYLES.expired,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status.replace(/_/g, ' ')}
    </span>
  );
}
