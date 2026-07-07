import { useState } from 'react';
import { View, Text } from 'react-native';
import Screen from '../components/Screen';
import PrimaryButton from '../components/PrimaryButton';
import { useCropCycleReport } from '../features/reports/useReports';
import { rupees } from '../lib/money';

export default function CropCycleDetailScreen({ route }) {
  const id = route?.params?.id;
  const { data, isLoading } = useCropCycleReport(id);
  const [showTrue, setShowTrue] = useState(false);

  if (isLoading || !data) return <Screen><Text>Loading…</Text></Screen>;

  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>{data.cycle.cropName} · {data.cycle.season} {data.cycle.year}</Text>

      <Text style={{ fontSize: 16, marginTop: 12 }}>Cash profit</Text>
      <Text style={{ fontSize: 28, color: data.cashProfit >= 0 ? '#1d9e75' : '#A32D2D' }}>{rupees(data.cashProfit)}</Text>
      <Text>Per acre: {rupees(data.perAcreCash)}</Text>

      <PrimaryButton title={showTrue ? 'Hide real profit' : 'See my real profit'} onPress={() => setShowTrue((v) => !v)} />

      {showTrue ? (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 16 }}>True profit (after family labour & own-land value)</Text>
          <Text style={{ fontSize: 24 }}>{rupees(data.trueProfit)}</Text>
          <Text>Per acre: {rupees(data.perAcreTrue)}</Text>
        </View>
      ) : null}
    </Screen>
  );
}
