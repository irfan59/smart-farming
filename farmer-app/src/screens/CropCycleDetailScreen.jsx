import { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import FadeIn from '../components/ui/FadeIn';
import { useCropCycleReport } from '../features/reports/useReports';
import { rupees } from '../lib/money';
import { colors, font, spacing } from '../theme';

export default function CropCycleDetailScreen({ route, navigation }) {
  const id = route?.params?.id;
  const { data, isLoading } = useCropCycleReport(id);
  const [showTrue, setShowTrue] = useState(false);

  if (isLoading || !data)
    return (
      <Screen>
        <Text style={{ color: colors.textMuted }}>Loading…</Text>
      </Screen>
    );

  const positive = data.cashProfit >= 0;

  return (
    <Screen>
      <FadeIn>
        <Text style={styles.crop}>{data.cycle.cropName} · {data.cycle.season} {data.cycle.year}</Text>

        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.label}>Cash profit</Text>
          <Text style={[styles.big, { color: positive ? colors.brand[600] : colors.danger }]}>{rupees(data.cashProfit)}</Text>
          <Text style={styles.muted}>Per acre: {rupees(data.perAcreCash)}</Text>
        </Card>

        <Button
          title={showTrue ? 'Hide real profit' : 'See my real profit'}
          variant="secondary"
          icon={showTrue ? undefined : 'Sparkles'}
          onPress={() => setShowTrue((v) => !v)}
          style={{ marginTop: spacing.lg }}
        />

        {showTrue ? (
          <Card style={{ marginTop: spacing.md, backgroundColor: colors.brand[50], borderColor: colors.brand[200] }}>
            <Text style={styles.label}>True profit (after family labour & own-land value)</Text>
            <Text style={[styles.big, { color: colors.brand[700] }]}>{rupees(data.trueProfit)}</Text>
            <Text style={styles.muted}>Per acre: {rupees(data.perAcreTrue)}</Text>
          </Card>
        ) : null}

        <Button
          title="Share report"
          variant="ghost"
          icon="Share2"
          onPress={() => navigation?.navigate('ShareReport', { report: { cropName: data.cycle.cropName, cashProfit: data.cashProfit, trueProfit: data.trueProfit } })}
          style={{ marginTop: spacing.md }}
        />
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  crop: { fontSize: font.size.lg, fontWeight: font.weight.semibold, color: colors.text },
  label: { fontSize: font.size.sm, color: colors.textMuted },
  big: { fontSize: font.size.display, fontWeight: font.weight.bold, marginVertical: 4 },
  muted: { color: colors.textMuted, fontSize: font.size.sm },
});
