import { cn } from '../../lib/cn';

export default function Card({ className, children, ...props }) {
  return (
    <div
      className={cn('rounded-2xl bg-white ring-1 ring-slate-200/70 shadow-card', className)}
      {...props}
    >
      {children}
    </div>
  );
}
