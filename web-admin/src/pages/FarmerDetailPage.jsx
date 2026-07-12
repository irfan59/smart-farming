import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Ban, CheckCircle2, CreditCard, KeyRound, Power } from 'lucide-react';
import { useFarmer } from '../features/farmers/useFarmer';
import { useRecordPayment } from '../features/farmers/useRecordPayment';
import { useFarmerActions } from '../features/farmers/useFarmerActions';
import StatusPill from '../components/StatusPill';
import Modal from '../components/Modal';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Skeleton from '../components/ui/Skeleton';
import { rupees } from '../lib/money';

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}

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

  if (isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40" />
      </div>
    );
  if (error)
    return (
      <Card className="p-6">
        <p role="alert" className="text-sm text-red-600">
          {error.message}
        </p>
      </Card>
    );

  const { farmer, subscription, counts, reportSummary } = data;

  async function submitPayment(e) {
    e.preventDefault();
    await recordPayment.mutateAsync({ amount: Number(amount), method, period });
    setPayOpen(false);
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-lg font-semibold text-white">
              {(farmer.name?.[0] || 'F').toUpperCase()}
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">{farmer.name}</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                {farmer.phone} · {farmer.village}, {farmer.state}
              </p>
              <div className="mt-2">
                <StatusPill status={subscription?.status} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {subscription?.status === 'pending_approval' && (
              <Button variant="harvest" onClick={() => actions.approve.mutate()} loading={actions.approve.isPending}>
                Approve
              </Button>
            )}
            <Button onClick={() => setPayOpen(true)}>
              <CreditCard className="h-4 w-4" /> Record payment
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-slate-800">Summary</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Metric label="Plots" value={counts.plots} />
          <Metric label="Crop cycles" value={counts.cropCycles} />
          <Metric label="Entries" value={counts.transactions} />
          <Metric label="Income" value={rupees(reportSummary.totalIncome)} />
          <Metric label="Expense" value={rupees(reportSummary.totalExpense)} />
          <Metric label="Cash profit" value={rupees(reportSummary.cashProfit)} />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-slate-800">Account actions</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {farmer.status !== 'suspended' ? (
            <Button variant="secondary" onClick={() => actions.setStatus.mutate('suspended')}>
              <Ban className="h-4 w-4" /> Suspend
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => actions.setStatus.mutate('active')}>
              <CheckCircle2 className="h-4 w-4" /> Reactivate
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => {
              if (confirm('Deactivate this farmer? Data is retained.')) actions.deactivate.mutate();
            }}
          >
            <Power className="h-4 w-4" /> Deactivate
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              const r = await actions.resetPassword.mutateAsync();
              setTemp(r.tempPassword);
            }}
          >
            <KeyRound className="h-4 w-4" /> Reset password
          </Button>
        </div>
        {temp && (
          <div className="mt-4 rounded-xl bg-harvest-50 px-4 py-3 text-sm text-harvest-800 ring-1 ring-inset ring-harvest-600/20">
            Temporary password (share offline): <code className="font-mono font-semibold">{temp}</code>
          </div>
        )}
      </Card>

      <Modal open={payOpen} title="Record payment" onClose={() => setPayOpen(false)}>
        <form onSubmit={submitPayment} className="space-y-4">
          <Input label="Amount (₹)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Select label="Method" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="other">Other</option>
          </Select>
          <Select label="Period" value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="monthly">Monthly (₹99)</option>
            <option value="yearly">Yearly (₹799)</option>
          </Select>
          <Button type="submit" className="w-full" loading={recordPayment.isPending}>
            Save payment
          </Button>
        </form>
      </Modal>
    </div>
  );
}
