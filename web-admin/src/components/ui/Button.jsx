import { motion } from 'motion/react';
import { cn } from '../../lib/cn';
import Spinner from './Spinner';

const VARIANTS = {
  primary: 'bg-brand-600 text-white shadow-soft hover:bg-brand-700 active:bg-brand-800',
  secondary: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:text-slate-900',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-red-600 text-white shadow-soft hover:bg-red-700',
  harvest: 'bg-harvest-500 text-white shadow-soft hover:bg-harvest-600',
};

const SIZES = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-[15px] gap-2',
  icon: 'h-9 w-9',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}) {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-xl font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </motion.button>
  );
}
