import { View, Text } from 'react-native';
import Screen from '../components/Screen';
import StatusBanner from '../components/StatusBanner';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../auth/useAuth';
import { useMonthly } from '../features/reports/useReports';
import { rupees } from '../lib/money';

function Card({ label, value, color }) {
  return (
    <View style={{ flex: 1, margin: 4, padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 10 }}>
      <Text style={{ color: '#666' }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: '600', color: color || '#111' }}>{value}</Text>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { subscription, isReadOnly } = useAuth();
  const now = new Date();
  const { data, isLoading } = useMonthly(now.getFullYear(), now.getMonth() + 1);

  return (
    <Screen>
      <StatusBanner subscription={subscription} />
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>This month</Text>
      {isLoading || !data ? (
        <Text>Loading…</Text>
      ) : (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Card label="Income" value={rupees(data.income)} />
          <Card label="Expense" value={rupees(data.expense)} />
          <Card label="Profit" value={rupees(data.cashProfit)} color={data.cashProfit >= 0 ? '#1d9e75' : '#A32D2D'} />
        </View>
      )}
      <View style={{ marginTop: 20 }}>
        <PrimaryButton title="+ Add entry" onPress={() => navigation.navigate('AddExpense')} disabled={isReadOnly} />
        {isReadOnly ? <Text style={{ color: '#993C1D' }}>Renew to add new entries</Text> : null}
      </View>
    </Screen>
  );
}
