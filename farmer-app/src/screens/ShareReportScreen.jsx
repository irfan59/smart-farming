import { useRef } from 'react';
import { View, Text } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import RNShare from 'react-native-share';
import Screen from '../components/Screen';
import PrimaryButton from '../components/PrimaryButton';
import { rupees } from '../lib/money';

export default function ShareReportScreen({ route }) {
  const report = route?.params?.report || {};
  const ref = useRef(null);

  async function share() {
    try {
      const uri = await captureRef(ref, { format: 'png', quality: 0.9 });
      await RNShare.open({ url: uri, message: 'My Smart Farming profit report' });
    } catch {
      /* user cancelled */
    }
  }

  return (
    <Screen>
      <View ref={ref} collapsable={false} style={{ padding: 16, backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 18, fontWeight: '600' }}>{report.cropName || 'My farm'} — profit report</Text>
        <Text>Cash profit: {rupees(report.cashProfit)}</Text>
        <Text>True profit: {rupees(report.trueProfit)}</Text>
      </View>
      <PrimaryButton title="Share (WhatsApp / PDF)" onPress={share} />
    </Screen>
  );
}
