import { useState } from 'react';
import { usePayments } from '../features/payments/usePayments';
import DataTable from '../components/DataTable';
import { rupees } from '../lib/money';

const d = (v) => (v ? new Date(v).toLocaleDateString('en-IN') : '—');

export default function PaymentsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data, isLoading, error } = usePayments({ from, to });

  const columns = [
    { key: 'receivedAt', header: 'Date', render: (r) => d(r.receivedAt) },
    { key: 'farmerId', header: 'Farmer' },
    { key: 'amount', header: 'Amount', render: (r) => rupees(r.amount) },
    { key: 'method', header: 'Method' },
    { key: 'period', header: 'Covers', render: (r) => `${d(r.periodStart)} → ${d(r.periodEnd)}` },
  ];

  return (
    <div>
      <h1>Payments</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <label>From <input aria-label="From date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>To <input aria-label="To date" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      {isLoading ? <p>Loading…</p> : error ? <p role="alert">{error.message}</p> : (
        <>
          <DataTable columns={columns} rows={data.data} empty="No payments" />
          <p>{data.total} payment(s)</p>
        </>
      )}
    </div>
  );
}
