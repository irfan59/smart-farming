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
import { useSuggestedImputed } from '../features/transactions/useSuggestedImputed';
import { useUploadReceipt } from '../features/transactions/useUploadReceipt';
import { rupees } from '../lib/money';
import { colors, font, spacing, radius } from '../theme';

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
            <CategoryGrid categories={categories} onSelect={pickCategory} />
          </View>
        </FadeIn>
      </Screen>
    );
  }

  return (
    <Screen>
      <FadeIn>
        <Text style={styles.step}>Step 2 of 2 · {category.name}</Text>
        {isFamilyLabour ? (
          <>
            <Text style={styles.h1}>Days worked</Text>
            <Text style={styles.help}>About how many days did you and your family work on this crop?</Text>
            <Card style={styles.display}>
              <Text style={styles.amount}>{days || '0'}</Text>
            </Card>
            <NumberPad value={days} onChange={setDays} />
          </>
        ) : (
          <>
            <Text style={styles.h1}>Amount</Text>
            <Card style={styles.display}>
              <Text style={styles.amount}>{rupees(Number(amount || 0))}</Text>
            </Card>
            <NumberPad value={amount} onChange={setAmount} />
          </>
        )}
        <Button
          title={photoPublicId ? 'Photo attached' : 'Add bill photo'}
          icon={photoPublicId ? 'Check' : 'Camera'}
          variant="secondary"
          onPress={async () => setPhotoPublicId(await uploadReceipt())}
          style={{ marginTop: spacing.lg }}
        />
        {error ? (
          <View style={styles.err}>
            <Text style={styles.errText}>{error}</Text>
          </View>
        ) : null}
        <Button title="Save" icon="Check" size="lg" onPress={save} loading={create.isPending} style={{ marginTop: spacing.md }} />
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: { fontSize: font.size.sm, color: colors.textMuted, fontWeight: font.weight.medium, marginBottom: 2 },
  h1: { fontSize: font.size.xxl, fontWeight: font.weight.bold, color: colors.text },
  help: { marginTop: spacing.sm, fontSize: font.size.sm, color: colors.textMuted, lineHeight: 20 },
  display: { marginTop: spacing.lg, marginBottom: spacing.lg, alignItems: 'center', paddingVertical: spacing.xl },
  amount: { fontSize: font.size.display, fontWeight: font.weight.bold, color: colors.text },
  err: { marginTop: spacing.md, backgroundColor: colors.dangerBg, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  errText: { color: colors.dangerText, fontSize: font.size.sm },
});
