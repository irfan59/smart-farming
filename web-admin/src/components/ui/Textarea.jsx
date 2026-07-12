import { forwardRef, useId } from 'react';
import { cn } from '../../lib/cn';

const Textarea = forwardRef(function Textarea({ label, className, id, ...props }, ref) {
  const autoId = useId();
  const taId = id || autoId;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={taId} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={taId}
        className={cn(
          'block min-h-24 w-full rounded-xl bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-soft ring-1 ring-inset ring-slate-200 transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500',
          className,
        )}
        {...props}
      />
    </div>
  );
});

export default Textarea;
