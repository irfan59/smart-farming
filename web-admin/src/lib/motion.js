// Shared Motion variants for consistent, uniform animation across the admin.

// Route/page enter + exit transition (used by AdminLayout around <Outlet/>).
export const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18 } },
};

// Stagger container + item, for grids/lists that should cascade in.
export const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 26 } },
};
