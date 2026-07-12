import { useState } from 'react';
import { motion } from 'motion/react';
import { useMasterData } from '../features/masterData/useMasterData';
import DataTable from '../components/DataTable';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Skeleton from '../components/ui/Skeleton';
import { cn } from '../lib/cn';

function BoolPill({ v, yes = 'Yes', no = 'No' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        v ? 'bg-brand-50 text-brand-700 ring-brand-600/20' : 'bg-slate-100 text-slate-500 ring-slate-500/20',
      )}
    >
      {v ? yes : no}
    </span>
  );
}

function toggleCol(update) {
  return {
    key: 'toggle',
    header: '',
    render: (r) => (
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={() => update.mutate({ id: r.id, body: { isActive: !r.isActive } })}>
          {r.isActive ? 'Deactivate' : 'Activate'}
        </Button>
      </div>
    ),
  };
}
const activeCol = { key: 'isActive', header: 'Active', render: (r) => <BoolPill v={r.isActive} yes="Active" no="Inactive" /> };
const nameCol = { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> };

function EditorShell({ list, columns, empty, children }) {
  if (list.isLoading) return <Skeleton className="h-64" />;
  if (list.error)
    return (
      <Card className="p-6">
        <p role="alert" className="text-sm text-red-600">
          {list.error.message}
        </p>
      </Card>
    );
  return (
    <div className="space-y-4">
      <Card className="p-5">{children}</Card>
      <DataTable columns={columns} rows={list.data.data} empty={empty} />
    </div>
  );
}

function CropsEditor() {
  const { list, create, update } = useMasterData('crops');
  const [name, setName] = useState('');
  const [defaultSeason, setSeason] = useState('kharif');
  const columns = [
    nameCol,
    { key: 'defaultSeason', header: 'Season', render: (r) => <span className="capitalize">{r.defaultSeason}</span> },
    activeCol,
    toggleCol(update),
  ];
  return (
    <EditorShell list={list} columns={columns} empty="No crops">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({ name, defaultSeason });
          setName('');
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="min-w-48 flex-1">
          <Input label="Crop name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maize" required />
        </div>
        <div className="w-40">
          <Select label="Season" value={defaultSeason} onChange={(e) => setSeason(e.target.value)}>
            <option value="kharif">Kharif</option>
            <option value="rabi">Rabi</option>
            <option value="zaid">Zaid</option>
            <option value="perennial">Perennial</option>
          </Select>
        </div>
        <Button type="submit" loading={create.isPending}>
          Add crop
        </Button>
      </form>
    </EditorShell>
  );
}

function ExpenseEditor() {
  const { list, create, update } = useMasterData('expense-categories');
  const [name, setName] = useState('');
  const [cacpTag, setTag] = useState('A2');
  const [isPaidOut, setPaid] = useState(true);
  const [isImputed, setImputed] = useState(false);
  const columns = [
    nameCol,
    { key: 'cacpTag', header: 'CACP' },
    { key: 'isPaidOut', header: 'Paid-out', render: (r) => <BoolPill v={r.isPaidOut} /> },
    { key: 'isImputed', header: 'Imputed', render: (r) => <BoolPill v={r.isImputed} /> },
    activeCol,
    toggleCol(update),
  ];
  return (
    <EditorShell list={list} columns={columns} empty="No expense categories">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({ name, cacpTag, isPaidOut, isImputed });
          setName('');
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="min-w-48 flex-1">
          <Input label="Category name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Drip maintenance" required />
        </div>
        <div className="w-28">
          <Select label="CACP tag" value={cacpTag} onChange={(e) => setTag(e.target.value)}>
            <option value="A1">A1</option>
            <option value="A2">A2</option>
            <option value="FL">FL</option>
            <option value="C2">C2</option>
          </Select>
        </div>
        <label className="flex items-center gap-2 pb-3 text-sm text-slate-600">
          <input type="checkbox" checked={isPaidOut} onChange={(e) => setPaid(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
          paid-out
        </label>
        <label className="flex items-center gap-2 pb-3 text-sm text-slate-600">
          <input type="checkbox" checked={isImputed} onChange={(e) => setImputed(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
          imputed
        </label>
        <Button type="submit" loading={create.isPending}>
          Add
        </Button>
      </form>
    </EditorShell>
  );
}

function IncomeEditor() {
  const { list, create, update } = useMasterData('income-categories');
  const [name, setName] = useState('');
  const [type, setType] = useState('main_produce');
  const columns = [
    nameCol,
    { key: 'type', header: 'Type', render: (r) => <span className="capitalize">{String(r.type).replace(/_/g, ' ')}</span> },
    activeCol,
    toggleCol(update),
  ];
  return (
    <EditorShell list={list} columns={columns} empty="No income categories">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({ name, type });
          setName('');
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="min-w-48 flex-1">
          <Input label="Category name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cold-storage rent" required />
        </div>
        <div className="w-48">
          <Select label="Income type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="main_produce">Main produce</option>
            <option value="by_product">By-product</option>
            <option value="subsidy">Subsidy</option>
            <option value="insurance">Insurance</option>
            <option value="custom_hire">Custom hire</option>
            <option value="other">Other</option>
          </Select>
        </div>
        <Button type="submit" loading={create.isPending}>
          Add
        </Button>
      </form>
    </EditorShell>
  );
}

const TABS = [
  { key: 'crops', label: 'Crops', Comp: CropsEditor },
  { key: 'expense', label: 'Expense categories', Comp: ExpenseEditor },
  { key: 'income', label: 'Income categories', Comp: IncomeEditor },
];

export default function MasterDataPage() {
  const [tab, setTab] = useState('crops');
  const Active = TABS.find((t) => t.key === tab).Comp;
  return (
    <div>
      <PageHeader title="Master data" subtitle="Manage crops and expense / income categories." />
      <div className="mb-6 inline-flex flex-wrap rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'relative rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
              tab === t.key ? 'text-brand-700' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {tab === t.key && (
              <motion.span
                layoutId="md-tab"
                className="absolute inset-0 rounded-lg bg-white shadow-soft"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10">{t.label}</span>
          </button>
        ))}
      </div>
      <Active />
    </div>
  );
}
