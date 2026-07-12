import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Boxes,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Settings,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { cn } from '../lib/cn';
import { pageVariants } from '../lib/motion';
import Logo from './ui/Logo';
import Button from './ui/Button';
import Badge from './ui/Badge';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/approvals', label: 'Approvals', icon: ClipboardCheck },
  { to: '/farmers', label: 'Farmers', icon: Users },
  { to: '/payments', label: 'Payments', icon: Wallet },
  { to: '/master-data', label: 'Master data', icon: Boxes },
  { to: '/announcements', label: 'Announcements', icon: Megaphone },
];

function NavList({ layoutId, isSuperadmin, onNavigate }) {
  const items = isSuperadmin ? [...NAV, { to: '/config', label: 'Config', icon: Settings }] : NAV;
  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={onNavigate} className="relative block outline-none">
          {({ isActive }) => (
            <span
              className={cn(
                'relative z-10 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )}
            >
              {isActive && (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-0 -z-10 rounded-xl bg-brand-50 ring-1 ring-inset ring-brand-600/15"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
              {label}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function initials(name = '') {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'A';
}

export default function AdminLayout() {
  const { admin, isSuperadmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  async function onLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="px-5 py-5">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto px-3">
          <NavList layoutId="nav-desktop" isSuperadmin={isSuperadmin} />
        </div>
        <div className="px-5 py-4 text-xs text-slate-400">Smart Farming Admin · v1</div>
      </aside>

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="lg:hidden">
            <Logo showText={false} />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium leading-tight text-slate-800">{admin?.name}</div>
              <div className="text-xs text-slate-400">{admin?.email}</div>
            </div>
            <span
              title={admin?.name}
              className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white"
            >
              {initials(admin?.name)}
            </span>
            {admin?.role && <Badge status={admin.role} className="hidden md:inline-flex" />}
            <Button variant="secondary" size="sm" onClick={onLogout} className="gap-1.5">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-slate-200 bg-white"
            >
              <div className="flex items-center justify-between px-5 py-5">
                <Logo />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3">
                <NavList layoutId="nav-mobile" isSuperadmin={isSuperadmin} onNavigate={() => setOpen(false)} />
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
