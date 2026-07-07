import { Link } from 'react-router-dom';
import { useDashboard } from '../features/dashboard/useDashboard';
import { rupees } from '../lib/money';

const card = { display: 'block', textDecoration: 'none', color: 'inherit', border: '1px solid #eee', borderRadius: 12, padding: 16, minWidth: 160 };

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboard();
  if (isLoading) return <p>Loading…</p>;
  if (error) return <p role="alert">{error.message}</p>;
  return (
    <div>
      <h1>Dashboard</h1>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Link to="/approvals" style={{ ...card, borderColor: '#EF9F27' }}>
          <div>Pending approvals</div>
          <strong style={{ fontSize: 28 }}>{data.pendingApprovals}</strong>
        </Link>
        <div style={card}>
          <div>Active subscriptions</div>
          <strong style={{ fontSize: 28 }}>{data.activeSubscriptions}</strong>
        </div>
        <div style={card}>
          <div>Revenue this month</div>
          <strong style={{ fontSize: 28 }}>{rupees(data.revenueThisMonth)}</strong>
        </div>
        <div style={card}>
          <div>Revenue total</div>
          <strong style={{ fontSize: 28 }}>{rupees(data.revenueTotal)}</strong>
        </div>
      </div>
    </div>
  );
}
