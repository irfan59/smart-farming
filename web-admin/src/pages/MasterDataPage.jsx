import { useState } from 'react';
import { useMasterData } from '../features/masterData/useMasterData';
import DataTable from '../components/DataTable';

function toggleCol(update) {
  return {
    key: 'toggle',
    header: '',
    render: (r) => (
      <button onClick={() => update.mutate({ id: r.id, body: { isActive: !r.isActive } })}>
        {r.isActive ? 'Deactivate' : 'Activate'}
      </button>
    ),
  };
}
const activeCol = { key: 'isActive', header: 'Active', render: (r) => String(r.isActive) };

function CropsEditor() {
  const { list, create, update } = useMasterData('crops');
  const [name, setName] = useState('');
  const [defaultSeason, setSeason] = useState('kharif');
  if (list.isLoading) return <p>Loading…</p>;
  if (list.error) return <p role="alert">{list.error.message}</p>;
  const columns = [{ key: 'name', header: 'Name' }, { key: 'defaultSeason', header: 'Season' }, activeCol, toggleCol(update)];
  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); create.mutate({ name, defaultSeason }); setName(''); }} style={{ marginBottom: 12 }}>
        <input aria-label="Crop name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Crop name" required />
        <select aria-label="Default season" value={defaultSeason} onChange={(e) => setSeason(e.target.value)}>
          <option value="kharif">Kharif</option><option value="rabi">Rabi</option><option value="zaid">Zaid</option><option value="perennial">Perennial</option>
        </select>
        <button type="submit">Add crop</button>
      </form>
      <DataTable columns={columns} rows={list.data.data} empty="No crops" />
    </div>
  );
}

function ExpenseEditor() {
  const { list, create, update } = useMasterData('expense-categories');
  const [name, setName] = useState('');
  const [cacpTag, setTag] = useState('A2');
  const [isPaidOut, setPaid] = useState(true);
  const [isImputed, setImputed] = useState(false);
  if (list.isLoading) return <p>Loading…</p>;
  if (list.error) return <p role="alert">{list.error.message}</p>;
  const columns = [{ key: 'name', header: 'Name' }, { key: 'cacpTag', header: 'CACP' }, { key: 'isPaidOut', header: 'Paid-out', render: (r) => String(r.isPaidOut) }, { key: 'isImputed', header: 'Imputed', render: (r) => String(r.isImputed) }, activeCol, toggleCol(update)];
  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); create.mutate({ name, cacpTag, isPaidOut, isImputed }); setName(''); }} style={{ marginBottom: 12 }}>
        <input aria-label="Expense category name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" required />
        <select aria-label="CACP tag" value={cacpTag} onChange={(e) => setTag(e.target.value)}>
          <option value="A1">A1</option><option value="A2">A2</option><option value="FL">FL</option><option value="C2">C2</option>
        </select>
        <label><input type="checkbox" checked={isPaidOut} onChange={(e) => setPaid(e.target.checked)} /> paid-out</label>
        <label><input type="checkbox" checked={isImputed} onChange={(e) => setImputed(e.target.checked)} /> imputed</label>
        <button type="submit">Add</button>
      </form>
      <DataTable columns={columns} rows={list.data.data} empty="No expense categories" />
    </div>
  );
}

function IncomeEditor() {
  const { list, create, update } = useMasterData('income-categories');
  const [name, setName] = useState('');
  const [type, setType] = useState('main_produce');
  if (list.isLoading) return <p>Loading…</p>;
  if (list.error) return <p role="alert">{list.error.message}</p>;
  const columns = [{ key: 'name', header: 'Name' }, { key: 'type', header: 'Type' }, activeCol, toggleCol(update)];
  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); create.mutate({ name, type }); setName(''); }} style={{ marginBottom: 12 }}>
        <input aria-label="Income category name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" required />
        <select aria-label="Income type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="main_produce">Main produce</option><option value="by_product">By-product</option><option value="subsidy">Subsidy</option><option value="insurance">Insurance</option><option value="custom_hire">Custom hire</option><option value="other">Other</option>
        </select>
        <button type="submit">Add</button>
      </form>
      <DataTable columns={columns} rows={list.data.data} empty="No income categories" />
    </div>
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
      <h1>Master data</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {TABS.map((t) => <button key={t.key} onClick={() => setTab(t.key)} disabled={tab === t.key}>{t.label}</button>)}
      </div>
      <Active />
    </div>
  );
}
