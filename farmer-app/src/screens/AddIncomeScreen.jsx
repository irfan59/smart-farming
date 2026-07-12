import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import CategoryGrid from '../components/CategoryGrid';
import NumberPad from '../components/NumberPad';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import FadeIn from '../components/ui/FadeIn';
import { useCatalog } from '../features/catalog/useCatalog';
import { useCreateTransaction } from '../features/transactions/useCreateTransaction';
import { rupees } from '../lib/money';
import { colors, font, spacing, radius } from '../theme';

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

  if (isLoading)
    return (
      <Screen>
        <Text style={{ color: colors.textMuted }}>Loading…</Text>
      </Screen>
    );

  if (!category) {
    return (
      <Screen>
        <FadeIn>
          <Text style={styles.step}>Step 1 of 2</Text>
          <Text style={styles.h1}>Pick a category</Text>
          <View style={{ marginTop: spacing.lg }}>
            <CategoryGrid categories={categories} onSelect={setCategory} />
          </View>
        </FadeIn>
      </Screen>
    );
  }

  return (
    <Screen>
      <FadeIn>
        <Text style={styles.step}>Step 2 of 2 · {category.name}</Text>
        <Text style={styles.h1}>Amount</Text>
        <Card style={styles.display}>
          <Text style={styles.amount}>{rupees(Number(amount || 0))}</Text>
        </Card>
        <NumberPad value={amount} onChange={setAmount} />
        {error ? (
          <View style={styles.err}>
            <Text style={styles.errText}>{error}</Text>
          </View>
        ) : null}
        <Button title="Save" size="lg" onPress={save} loading={create.isPending} style={{ marginTop: spacing.md }} />
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: { fontSize: font.size.sm, color: colors.textMuted, fontWeight: font.weight.medium, marginBottom: 2 },
  h1: { fontSize: font.size.xxl, fontWeight: font.weight.bold, color: colors.text },
  display: { marginTop: spacing.lg, marginBottom: spacing.lg, alignItems: 'center', paddingVertical: spacing.xl },
  amount: { fontSize: font.size.display, fontWeight: font.weight.bold, color: colors.text },
  err: { marginTop: spacing.md, backgroundColor: colors.dangerBg, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  errText: { color: colors.dangerText, fontSize: font.size.sm },
});
