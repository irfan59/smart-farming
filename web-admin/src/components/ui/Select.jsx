import { forwardRef, useId } from 'react';
import { cn } from '../../lib/cn';

const Select = forwardRef(function Select({ label, className, id, children, ...props }, ref) {
  const autoId = useId();
  const selectId = id || autoId;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={cn(
          'block h-11 w-full rounded-xl bg-white px-3 text-sm text-slate-900 shadow-soft ring-1 ring-inset ring-slate-200 transition focus:outline-none focus:ring-2 focus:ring-brand-500',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
});

export default Select;
