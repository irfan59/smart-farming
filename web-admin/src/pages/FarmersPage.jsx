import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFarmers } from '../features/farmers/useFarmers';
import DataTable from '../components/DataTable';
import StatusPill from '../components/StatusPill';

export default function FarmersPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useFarmers({ q, status, page });
  const navigate = useNavigate();

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'phone', header: 'Phone' },
    { key: 'village', header: 'Village' },
    { key: 'state', header: 'State' },
    { key: 'subscriptionStatus', header: 'Subscription', render: (r) => (r.subscriptionStatus ? <StatusPill status={r.subscriptionStatus} /> : '—') },
  ];

  return (
    <div>
      <h1>Farmers</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input aria-label="Search farmers" placeholder="Search name / phone / village" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} />
        <select aria-label="Filter status" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
          <option value="">All</option>
          <option value="pending_approval">Pending</option>
          <option value="trial">Trial</option>
          <option value="active">Active</option>
          <option value="grace">Grace</option>
          <option value="expired">Expired</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>
      {isLoading ? (
        <p>Loading…</p>
      ) : error ? (
        <p role="alert">{error.message}</p>
      ) : (
        <>
          <DataTable columns={columns} rows={data.data} empty="No farmers" onRowClick={(r) => navigate(`/farmers/${r.id}`)} />
          <div style={{ marginTop: 12 }}>
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span style={{ margin: '0 8px' }}>Page {data.page} · {data.total} total</span>
            <button disabled={page * 20 >= data.total} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </>
      )}
    </div>
  );
}
