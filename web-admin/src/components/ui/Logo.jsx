import { Sprout } from 'lucide-react';
import { cn } from '../../lib/cn';

export default function Logo({ className, showText = true, invert = false }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'grid h-9 w-9 place-items-center rounded-xl shadow-soft',
          invert ? 'bg-white/15 text-white ring-1 ring-white/25' : 'bg-brand-600 text-white',
        )}
      >
        <Sprout className="h-5 w-5" strokeWidth={2.2} />
      </span>
      {showText && (
        <span
          className={cn(
            'text-[15px] font-semibold tracking-tight',
            invert ? 'text-white' : 'text-slate-900',
          )}
        >
          Smart Farming
        </span>
      )}
    </div>
  );
}
