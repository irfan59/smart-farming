import { forwardRef, useId } from 'react';
import { cn } from '../../lib/cn';

const Input = forwardRef(function Input({ label, error, hint, className, id, ...props }, ref) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? 'true' : undefined}
        className={cn(
          'block h-11 w-full rounded-xl bg-white px-3.5 text-sm text-slate-900 shadow-soft ring-1 ring-inset ring-slate-200 transition',
          'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500',
          error && 'ring-red-400 focus:ring-red-500',
          className,
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
});

export default Input;
