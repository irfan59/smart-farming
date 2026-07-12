import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useFarmers } from '../features/farmers/useFarmers';
import DataTable from '../components/DataTable';
import StatusPill from '../components/StatusPill';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';

export default function FarmersPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useFarmers({ q, status, page });
  const navigate = useNavigate();

  const columns = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
    { key: 'phone', header: 'Phone' },
    { key: 'village', header: 'Village' },
    { key: 'state', header: 'State' },
    {
      key: 'subscriptionStatus',
      header: 'Subscription',
      render: (r) =>
        r.subscriptionStatus ? <StatusPill status={r.subscriptionStatus} /> : <span className="text-slate-400">—</span>,
    },
  ];

  return (
    <div>
      <PageHeader title="Farmers" subtitle="Search, filter, and open any farmer's records." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Search farmers"
            placeholder="Search name / phone / village"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            className="block h-11 w-full rounded-xl bg-white pl-9 pr-3.5 text-sm text-slate-900 shadow-soft ring-1 ring-inset ring-slate-200 transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          aria-label="Filter status"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="h-11 rounded-xl bg-white px-3 text-sm text-slate-900 shadow-soft ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 sm:w-52"
        >
          <option value="">All statuses</option>
          <option value="pending_approval">Pending</option>
          <option value="trial">Trial</option>
          <option value="active">Active</option>
          <option value="grace">Grace</option>
          <option value="expired">Expired</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : error ? (
        <Card className="p-6">
          <p role="alert" className="text-sm text-red-600">
            {error.message}
          </p>
        </Card>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data.data}
            empty="No farmers"
            onRowClick={(r) => navigate(`/farmers/${r.id}`)}
          />
          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <span>
              Page {data.page} · {data.total} total
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Prev
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page * 20 >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
