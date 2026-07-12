import { useEffect, useState } from 'react';
import { useConfig } from '../features/config/useConfig';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Skeleton from '../components/ui/Skeleton';

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
  useEffect(() => {
    if (query.data) setForm(query.data);
  }, [query.data]);

  if (query.isLoading || !form)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-72" />
      </div>
    );
  if (query.error)
    return (
      <Card className="p-6">
        <p role="alert" className="text-sm text-red-600">
          {query.error.message}
        </p>
      </Card>
    );

  return (
    <div>
      <PageHeader title="Config" subtitle="Pricing, trial, and cost-engine defaults." />
      <Card className="max-w-2xl p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update.mutate(form);
          }}
          className="space-y-5"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FIELDS.map(([k, label]) => (
              <Input
                key={k}
                label={label}
                type="number"
                value={form[k] ?? ''}
                onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" loading={update.isPending}>
              Save changes
            </Button>
            {update.isSuccess && <span className="text-sm font-medium text-brand-600">Saved.</span>}
          </div>
        </form>
      </Card>
    </div>
  );
}
