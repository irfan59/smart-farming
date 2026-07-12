import { cn } from '../../lib/cn';

const STYLES = {
  active: 'bg-brand-50 text-brand-700 ring-brand-600/20',
  trial: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  pending_approval: 'bg-harvest-50 text-harvest-700 ring-harvest-600/20',
  grace: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  expired: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  suspended: 'bg-red-50 text-red-700 ring-red-600/20',
  deactivated: 'bg-red-50 text-red-700 ring-red-600/20',
  superadmin: 'bg-brand-50 text-brand-700 ring-brand-600/20',
  admin: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

const LABELS = {
  pending_approval: 'Pending approval',
  active: 'Active',
  trial: 'Trial',
  grace: 'Grace',
  expired: 'Expired',
  suspended: 'Suspended',
  deactivated: 'Deactivated',
  superadmin: 'Superadmin',
  admin: 'Admin',
};

export default function Badge({ status, children, dot = true, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        STYLES[status] || STYLES.expired,
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children || LABELS[status] || status}
    </span>
  );
}
