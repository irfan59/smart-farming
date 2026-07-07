import { useState } from 'react';
import { Text } from 'react-native';
import Screen from '../components/Screen';
import CategoryGrid from '../components/CategoryGrid';
import NumberPad from '../components/NumberPad';
import PrimaryButton from '../components/PrimaryButton';
import { useCatalog } from '../features/catalog/useCatalog';
import { useCreateTransaction } from '../features/transactions/useCreateTransaction';
import { useSuggestedImputed } from '../features/transactions/useSuggestedImputed';
import { useUploadReceipt } from '../features/transactions/useUploadReceipt';
import { rupees } from '../lib/money';

export default function AddExpenseScreen({ navigation, route }) {
  const cropCycleId = route?.params?.cropCycleId || null;
  const { data: categories = [], isLoading } = useCatalog('expense-categories');
  const create = useCreateTransaction();
  const suggest = useSuggestedImputed();
  const uploadReceipt = useUploadReceipt();
  const [category, setCategory] = useState(null);
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('');
  const [photoPublicId, setPhotoPublicId] = useState(null);
  const [error, setError] = useState('');

  const isFamilyLabour = category?.isImputed && category?.cacpTag === 'FL';

  async function pickCategory(c) {
    setCategory(c);
    if (c.isImputed && c.cacpTag !== 'FL' && cropCycleId) {
      try {
        const s = await suggest(cropCycleId);
        if (s?.ownLandRentalValue) setAmount(String(s.ownLandRentalValue.amount)); // pre-fill; farmer confirms
      } catch { /* ignore */ }
    }
  }

  async function save() {
    setError('');
    try {
      const body = { type: 'expense', categoryId: category.id, cropCycleId, date: new Date().toISOString(), photoPublicId };
      if (isFamilyLabour) {
        const s = await suggest(cropCycleId);
        const rate = s.familyLabour.ratePerDay;
        body.amount = Number(days) * rate;
        body.isImputed = true;
        body.quantity = Number(days);
        body.unit = 'day';
        body.rate = rate;
      } else {
        body.amount = Number(amount);
        if (category.isImputed) body.isImputed = true;
      }
      await create.mutateAsync(body);
      navigation.goBack();
    } catch (e) {
      setError(e.code === 'READ_ONLY' ? 'Renew to add new entries' : e.message || 'Could not save');
    }
  }

  if (isLoading) return <Screen><Text>Loading…</Text></Screen>;

  if (!category) {
    return (
      <Screen>
        <Text style={{ fontSize: 18, marginBottom: 8 }}>Pick a category</Text>
        <CategoryGrid categories={categories} onSelect={pickCategory} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={{ fontSize: 18, marginBottom: 8 }}>{category.name}</Text>
      {isFamilyLabour ? (
        <>
          <Text>About how many days did you and your family work on this crop?</Text>
          <Text style={{ fontSize: 30, textAlign: 'center', marginVertical: 8 }}>{days || '0'}</Text>
          <NumberPad value={days} onChange={setDays} />
        </>
      ) : (
        <>
          <Text style={{ fontSize: 30, textAlign: 'center', marginVertical: 8 }}>{rupees(Number(amount || 0))}</Text>
          <NumberPad value={amount} onChange={setAmount} />
        </>
      )}
      <PrimaryButton title="Add bill photo" onPress={async () => setPhotoPublicId(await uploadReceipt())} />
      {photoPublicId ? <Text>Photo attached</Text> : null}
      {error ? <Text style={{ color: '#A32D2D' }}>{error}</Text> : null}
      <PrimaryButton title="Save" onPress={save} disabled={create.isPending} />
    </Screen>
  );
}
