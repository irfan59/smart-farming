import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Screen from '../components/Screen';
import { useMonthly, useCropRanking } from '../features/reports/useReports';
import { rupees } from '../lib/money';

export default function ReportsScreen() {
  const [tab, setTab] = useState('monthly');
  const now = new Date();
  const monthly = useMonthly(now.getFullYear(), now.getMonth() + 1);
  const ranking = useCropRanking();

  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 8 }}>Reports</Text>
      <View style={{ flexDirection: 'row' }}>
        {[['monthly', 'Monthly'], ['ranking', 'Best per acre']].map(([k, label]) => (
          <Pressable key={k} accessibilityRole="button" onPress={() => setTab(k)}>
            <Text style={{ padding: 10, fontWeight: tab === k ? '700' : '400' }}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'monthly' && (monthly.data ? (
        <View style={{ marginTop: 8 }}>
          <Text>Income: {rupees(monthly.data.income)}</Text>
          <Text>Expense: {rupees(monthly.data.expense)}</Text>
          <Text>Cash profit: {rupees(monthly.data.cashProfit)}</Text>
        </View>
      ) : <Text>Loading…</Text>)}

      {tab === 'ranking' && (ranking.data ? ranking.data.map((r) => (
        <View key={r.cycleId || `${r.cropName}${r.year}`} style={{ paddingVertical: 6, borderBottomWidth: 1, borderColor: '#eee' }}>
          <Text>{r.cropName} · {r.season} {r.year}</Text>
          <Text>Per acre (true): {rupees(r.perAcreTrue)}</Text>
        </View>
      )) : <Text>Loading…</Text>)}
    </Screen>
  );
}
