import { cn } from '../../lib/cn';

export default function Spinner({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
    />
  );
}
