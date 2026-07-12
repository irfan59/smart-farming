import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ChevronRight,
  ClipboardCheck,
  Clock,
  IndianRupee,
  Megaphone,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useDashboard } from '../features/dashboard/useDashboard';
import { rupees } from '../lib/money';
import { cn } from '../lib/cn';
import { container } from '../lib/motion';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';

const SEGMENTS = [
  { key: 'active', label: 'Active', color: 'bg-brand-500' },
  { key: 'trial', label: 'Trial', color: 'bg-blue-500' },
  { key: 'pending_approval', label: 'Pending', color: 'bg-harvest-500' },
  { key: 'grace', label: 'Grace', color: 'bg-orange-500' },
  { key: 'expired', label: 'Expired', color: 'bg-slate-300' },
];

const QUICK = [
  { to: '/approvals', label: 'Review approvals', desc: 'Vet and activate new farmers', icon: ClipboardCheck },
  { to: '/farmers', label: 'Manage farmers', desc: 'Search, view and edit records', icon: Users },
  { to: '/announcements', label: 'Post announcement', desc: 'Broadcast to all farmers', icon: Megaphone },
];

function DashboardSkeleton() {
  return (
    <div>
      <Skeleton className="h-9 w-52" />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-52 lg:col-span-2" />
        <Skeleton className="h-52" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboard();

  if (isLoading) return <DashboardSkeleton />;
  if (error)
    return (
      <Card className="p-6">
        <p role="alert" className="text-sm text-red-600">
          {error.message}
        </p>
      </Card>
    );

  const subs = data.subscriptionsByStatus || {};
  const total = SEGMENTS.reduce((sum, seg) => sum + (subs[seg.key] || 0), 0) || 1;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of farmers, subscriptions, and revenue." />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          as={Link}
          to="/approvals"
          icon={Clock}
          accent="harvest"
          label="Pending approvals"
          value={data.pendingApprovals}
          sub="Awaiting your review"
        />
        <StatCard
          icon={Users}
          accent="brand"
          label="Active subscriptions"
          value={data.activeSubscriptions}
          sub="Paying + trial farmers"
        />
        <StatCard
          icon={IndianRupee}
          accent="blue"
          label="Revenue this month"
          value={rupees(data.revenueThisMonth)}
          sub="Recorded payments"
        />
        <StatCard
          icon={TrendingUp}
          accent="slate"
          label="Revenue total"
          value={rupees(data.revenueTotal)}
          sub="All-time collected"
        />
      </motion.div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Subscription health */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-slate-800">Subscription health</h3>
            <p className="mt-0.5 text-xs text-slate-400">Distribution across lifecycle states</p>

            <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
              {SEGMENTS.map((seg) => {
                const v = subs[seg.key] || 0;
                if (!v) return null;
                return (
                  <motion.div
                    key={seg.key}
                    className={seg.color}
                    initial={{ width: 0 }}
                    animate={{ width: `${(v / total) * 100}%` }}
                    transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
                  />
                );
              })}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SEGMENTS.map((seg) => (
                <div key={seg.key} className="flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', seg.color)} />
                  <span className="text-sm text-slate-600">{`${seg.label} · ${subs[seg.key] || 0}`}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <Card className="p-3">
            <h3 className="px-3 py-2 text-sm font-semibold text-slate-800">Quick actions</h3>
            <div className="space-y-1">
              {QUICK.map((q) => (
                <Link
                  key={q.to}
                  to={q.to}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 no-underline transition-colors hover:bg-slate-50"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
                    <q.icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-slate-800">{q.label}</span>
                    <span className="block text-xs text-slate-400">{q.desc}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
