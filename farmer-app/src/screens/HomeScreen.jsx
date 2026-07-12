import { View, Text, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import StatusBanner from '../components/StatusBanner';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import FadeIn from '../components/ui/FadeIn';
import { useAuth } from '../auth/useAuth';
import { useMonthly } from '../features/reports/useReports';
import { rupees } from '../lib/money';
import { colors, font, spacing } from '../theme';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function HomeScreen({ navigation }) {
  const { subscription, isReadOnly } = useAuth();
  const now = new Date();
  const { data, isLoading } = useMonthly(now.getFullYear(), now.getMonth() + 1);
  const profitColor = data ? (data.cashProfit >= 0 ? colors.brand[600] : colors.danger) : colors.text;

  return (
    <Screen>
      <FadeIn>
        <StatusBanner subscription={subscription} />
        <Text style={styles.month}>{MONTHS[now.getMonth()]} {now.getFullYear()}</Text>
        <Text style={styles.h1}>This month</Text>

        {isLoading || !data ? (
          <Card style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.textMuted }}>Loading…</Text>
          </Card>
        ) : (
          <Card style={{ marginTop: spacing.md }}>
            <Text style={styles.metricLabel}>Profit</Text>
            <Text style={[styles.bigProfit, { color: profitColor }]}>{rupees(data.cashProfit)}</Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.metricLabel}>Income</Text>
                <Text style={styles.metricValue}>{rupees(data.income)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.metricLabel}>Expense</Text>
                <Text style={styles.metricValue}>{rupees(data.expense)}</Text>
              </View>
            </View>
          </Card>
        )}

        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          <Button title="Add expense" icon="Plus" size="lg" disabled={isReadOnly} onPress={() => navigation.navigate('AddExpense')} />
          <Button title="Add income" icon="Coins" size="lg" variant="secondary" disabled={isReadOnly} onPress={() => navigation.navigate('AddIncome')} />
          {isReadOnly ? <Text style={styles.readonly}>Renew to add new entries</Text> : null}
        </View>

        <Button title="My plots & crop cycles" variant="ghost" icon="MapPin" onPress={() => navigation.navigate('Plots')} style={{ marginTop: spacing.sm }} />
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  month: { fontSize: font.size.sm, color: colors.textMuted, fontWeight: font.weight.medium },
  h1: { fontSize: font.size.xxl, fontWeight: font.weight.bold, color: colors.text, marginTop: 2 },
  metricLabel: { fontSize: font.size.sm, color: colors.textMuted },
  metricValue: { fontSize: font.size.lg, fontWeight: font.weight.semibold, color: colors.text, marginTop: 2 },
  bigProfit: { fontSize: font.size.display, fontWeight: font.weight.bold, marginTop: 2, marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.md },
  readonly: { color: colors.harvest[700], fontSize: font.size.sm, textAlign: 'center' },
});
