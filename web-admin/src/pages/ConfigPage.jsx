import { useEffect, useState } from 'react';
import { useConfig } from '../features/config/useConfig';

const FIELDS = [
  ['trialDays', 'Trial days'],
  ['monthlyPriceINR', 'Monthly price (₹)'],
  ['yearlyPriceINR', 'Yearly price (₹)'],
  ['graceDays', 'Grace days'],
  ['dailyWageINR', 'Daily wage (₹)'],
  ['ownLandRentalPerAcreINR', 'Own-land rental /acre (₹)'],
  ['ownedCapitalInterestRatePct', 'Owned-capital interest %'],
];

export default function ConfigPage() {
  const { query, update } = useConfig();
  const [form, setForm] = useState(null);
  useEffect(() => { if (query.data) setForm(query.data); }, [query.data]);

  if (query.isLoading || !form) return <p>Loading…</p>;
  if (query.error) return <p role="alert">{query.error.message}</p>;

  return (
    <div>
      <h1>Config</h1>
      <form onSubmit={(e) => { e.preventDefault(); update.mutate(form); }}>
        {FIELDS.map(([k, label]) => (
          <label key={k} style={{ display: 'block', marginBottom: 8 }}>
            {label}{' '}
            <input aria-label={label} type="number" value={form[k] ?? ''} onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })} />
          </label>
        ))}
        <button type="submit" disabled={update.isPending}>Save</button>
        {update.isSuccess && <span> Saved.</span>}
      </form>
    </div>
  );
}
