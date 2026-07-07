import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useFarmer } from '../features/farmers/useFarmer';
import { useRecordPayment } from '../features/farmers/useRecordPayment';
import { useFarmerActions } from '../features/farmers/useFarmerActions';
import StatusPill from '../components/StatusPill';
import Modal from '../components/Modal';
import Field from '../components/Field';
import { rupees } from '../lib/money';

export default function FarmerDetailPage() {
  const { id } = useParams();
  const { data, isLoading, error } = useFarmer(id);
  const recordPayment = useRecordPayment(id);
  const actions = useFarmerActions(id);
  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState('99');
  const [method, setMethod] = useState('cash');
  const [period, setPeriod] = useState('monthly');
  const [temp, setTemp] = useState('');

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p role="alert">{error.message}</p>;
  const { farmer, subscription, counts, reportSummary } = data;

  async function submitPayment(e) {
    e.preventDefault();
    await recordPayment.mutateAsync({ amount: Number(amount), method, period });
    setPayOpen(false);
  }

  return (
    <div>
      <h1>{farmer.name}</h1>
      <p>{farmer.phone} · {farmer.village}, {farmer.state}</p>

      <section>
        <h2>Subscription</h2>
        <p>Status: <StatusPill status={subscription?.status} /></p>
        {subscription?.status === 'pending_approval' && (
          <button onClick={() => actions.approve.mutate()} disabled={actions.approve.isPending}>Approve</button>
        )}
        <button onClick={() => setPayOpen(true)}>Record payment</button>
      </section>

      <section>
        <h2>Summary</h2>
        <p>Plots: {counts.plots} · Crop cycles: {counts.cropCycles} · Entries: {counts.transactions}</p>
        <p>Income: {rupees(reportSummary.totalIncome)} · Expense: {rupees(reportSummary.totalExpense)} · Cash profit: {rupees(reportSummary.cashProfit)}</p>
      </section>

      <section>
        <h2>Actions</h2>
        {farmer.status !== 'suspended' ? (
          <button onClick={() => actions.setStatus.mutate('suspended')}>Suspend</button>
        ) : (
          <button onClick={() => actions.setStatus.mutate('active')}>Reactivate</button>
        )}
        <button onClick={() => { if (confirm('Deactivate this farmer? Data is retained.')) actions.deactivate.mutate(); }}>Deactivate</button>
        <button onClick={async () => { const r = await actions.resetPassword.mutateAsync(); setTemp(r.tempPassword); }}>Reset password</button>
        {temp && <p>Temporary password (share offline): <code>{temp}</code></p>}
      </section>

      <Modal open={payOpen} title="Record payment" onClose={() => setPayOpen(false)}>
        <form onSubmit={submitPayment}>
          <Field label="Amount (₹)"><input aria-label="Amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="Method">
            <select aria-label="Method" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="cash">Cash</option><option value="upi">UPI</option><option value="other">Other</option>
            </select>
          </Field>
          <Field label="Period">
            <select aria-label="Period" value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="monthly">Monthly (₹99)</option><option value="yearly">Yearly (₹799)</option>
            </select>
          </Field>
          <button type="submit" disabled={recordPayment.isPending}>Save payment</button>
        </form>
      </Modal>
    </div>
  );
}
