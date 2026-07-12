import { useState } from 'react';
import { usePayments } from '../features/payments/usePayments';
import DataTable from '../components/DataTable';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import { rupees } from '../lib/money';

const d = (v) => (v ? new Date(v).toLocaleDateString('en-IN') : '—');
const dateInput =
  'h-11 rounded-xl bg-white px-3 text-sm text-slate-900 shadow-soft ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500';

export default function PaymentsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data, isLoading, error } = usePayments({ from, to });

  const columns = [
    { key: 'receivedAt', header: 'Date', render: (r) => d(r.receivedAt) },
    { key: 'farmerId', header: 'Farmer', render: (r) => <span className="font-mono text-xs text-slate-500">{r.farmerId}</span> },
    { key: 'amount', header: 'Amount', render: (r) => <span className="font-semibold text-slate-900">{rupees(r.amount)}</span> },
    { key: 'method', header: 'Method', render: (r) => <span className="capitalize">{r.method}</span> },
    { key: 'period', header: 'Covers', render: (r) => `${d(r.periodStart)} → ${d(r.periodEnd)}` },
  ];

  return (
    <div>
      <PageHeader title="Payments" subtitle="All recorded subscription payments." />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm text-slate-600">
          <span className="mb-1.5 block font-medium text-slate-700">From</span>
          <input aria-label="From date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={dateInput} />
        </label>
        <label className="text-sm text-slate-600">
          <span className="mb-1.5 block font-medium text-slate-700">To</span>
          <input aria-label="To date" type="date" value={to} onChange={(e) => setTo(e.target.value)} className={dateInput} />
        </label>
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
          <DataTable columns={columns} rows={data.data} empty="No payments" />
          <p className="mt-3 text-sm text-slate-500">{data.total} payment(s)</p>
        </>
      )}
    </div>
  );
}
