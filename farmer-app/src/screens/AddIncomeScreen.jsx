import { useState } from 'react';
import { Text } from 'react-native';
import Screen from '../components/Screen';
import CategoryGrid from '../components/CategoryGrid';
import NumberPad from '../components/NumberPad';
import PrimaryButton from '../components/PrimaryButton';
import { useCatalog } from '../features/catalog/useCatalog';
import { useCreateTransaction } from '../features/transactions/useCreateTransaction';
import { rupees } from '../lib/money';

export default function AddIncomeScreen({ navigation, route }) {
  const cropCycleId = route?.params?.cropCycleId || null;
  const { data: categories = [], isLoading } = useCatalog('income-categories');
  const create = useCreateTransaction();
  const [category, setCategory] = useState(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  async function save() {
    setError('');
    try {
      await create.mutateAsync({ type: 'income', categoryId: category.id, cropCycleId, amount: Number(amount), date: new Date().toISOString() });
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
        <CategoryGrid categories={categories} onSelect={setCategory} />
      </Screen>
    );
  }
  return (
    <Screen>
      <Text style={{ fontSize: 18, marginBottom: 8 }}>{category.name}</Text>
      <Text style={{ fontSize: 30, textAlign: 'center', marginVertical: 8 }}>{rupees(Number(amount || 0))}</Text>
      <NumberPad value={amount} onChange={setAmount} />
      {error ? <Text style={{ color: '#A32D2D' }}>{error}</Text> : null}
      <PrimaryButton title="Save" onPress={save} disabled={create.isPending} />
    </Screen>
  );
}
