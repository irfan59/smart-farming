import { motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { item } from '../../lib/motion';

const ACCENTS = {
  brand: 'bg-brand-50 text-brand-600',
  harvest: 'bg-harvest-50 text-harvest-600',
  blue: 'bg-blue-50 text-blue-600',
  slate: 'bg-slate-100 text-slate-500',
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = 'brand',
  as: As = 'div',
  className,
  ...props
}) {
  const interactive = As !== 'div';
  return (
    <motion.div
      variants={item}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="h-full"
    >
      <As
        className={cn(
          'group flex h-full flex-col justify-between gap-4 rounded-2xl bg-white p-5 no-underline ring-1 ring-slate-200/70 shadow-card transition-shadow hover:shadow-lift',
          interactive && 'cursor-pointer',
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between">
          <span className={cn('grid h-11 w-11 place-items-center rounded-xl', ACCENTS[accent])}>
            {Icon && <Icon className="h-5 w-5" strokeWidth={2.2} />}
          </span>
          {interactive && (
            <ArrowUpRight className="h-5 w-5 text-slate-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-400" />
          )}
        </div>
        <div>
          <div className="text-sm font-medium text-slate-500">{label}</div>
          <div className="mt-1 text-[28px] font-semibold leading-tight tracking-tight text-slate-900 tabular-nums">
            {value}
          </div>
          {sub && <div className="mt-1.5 text-xs text-slate-400">{sub}</div>}
        </div>
      </As>
    </motion.div>
  );
}
