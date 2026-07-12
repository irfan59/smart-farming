import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/ui/Card';
import Icon from '../components/ui/Icon';
import FadeIn from '../components/ui/FadeIn';
import EmptyState from '../components/ui/EmptyState';
import { useMonthly, useCropRanking } from '../features/reports/useReports';
import { rupees } from '../lib/money';
import { colors, font, spacing, radius, shadow } from '../theme';

const TABS = [
  ['monthly', 'Monthly'],
  ['ranking', 'Best per acre'],
];

export default function ReportsScreen() {
  const [tab, setTab] = useState('monthly');
  const now = new Date();
  const monthly = useMonthly(now.getFullYear(), now.getMonth() + 1);
  const ranking = useCropRanking();

  return (
    <Screen>
      <FadeIn>
        <Text style={styles.h1}>Reports</Text>

        <View style={styles.tabs}>
          {TABS.map(([k, label]) => {
            const active = tab === k;
            return (
              <Pressable key={k} accessibilityRole="button" onPress={() => setTab(k)} style={[styles.tab, active && styles.tabActive]}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'monthly' ? (
          monthly.data ? (
            <Card>
              <Text style={styles.rowLabel}>Income: {rupees(monthly.data.income)}</Text>
              <Text style={styles.rowLabel}>Expense: {rupees(monthly.data.expense)}</Text>
              <View style={styles.divider} />
              <Text style={styles.profitLine}>Cash profit: {rupees(monthly.data.cashProfit)}</Text>
            </Card>
          ) : (
            <Card>
              <Text style={styles.muted}>Loading…</Text>
            </Card>
          )
        ) : ranking.data ? (
          ranking.data.length ? (
            <View style={{ gap: spacing.md }}>
              {ranking.data.map((r) => (
                <Card key={r.cycleId || `${r.cropName}${r.year}`}>
                  <View style={styles.rankRow}>
                    <View style={styles.rankIcon}>
                      <Icon name="Sprout" size={18} color={colors.brand[600]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rankTitle}>{r.cropName} · {r.season} {r.year}</Text>
                      <Text style={styles.muted}>Per acre (true): {rupees(r.perAcreTrue)}</Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          ) : (
            <EmptyState icon="BarChart3" title="No crop cycles yet" text="Add a crop cycle to see per-acre profit." />
          )
        ) : (
          <Card>
            <Text style={styles.muted}>Loading…</Text>
          </Card>
        )}
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: font.size.xxl, fontWeight: font.weight.bold, color: colors.text, marginBottom: spacing.lg },
  tabs: { flexDirection: 'row', backgroundColor: '#eaf0ec', borderRadius: radius.md, padding: 4, marginBottom: spacing.lg },
  tab: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: 'center' },
  tabActive: { backgroundColor: colors.surface, ...shadow.soft },
  tabText: { fontSize: font.size.sm, fontWeight: font.weight.medium, color: colors.textMuted },
  tabTextActive: { color: colors.brand[700], fontWeight: font.weight.semibold },
  rowLabel: { fontSize: font.size.md, color: colors.text, marginBottom: 6 },
  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.sm },
  profitLine: { fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.brand[700] },
  muted: { color: colors.textMuted, fontSize: font.size.sm },
  rankRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  rankIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.brand[50], alignItems: 'center', justifyContent: 'center' },
  rankTitle: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text },
});
