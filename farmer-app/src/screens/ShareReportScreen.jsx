import { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import RNShare from 'react-native-share';
import Screen from '../components/Screen';
import Button from '../components/ui/Button';
import FadeIn from '../components/ui/FadeIn';
import { rupees } from '../lib/money';
import { colors, font, spacing, radius, shadow } from '../theme';

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
      <FadeIn>
        <View ref={ref} collapsable={false} style={styles.report}>
          <View style={styles.brandRow}>
            <Text style={{ fontSize: 22 }}>🌱</Text>
            <Text style={styles.brand}>Smart Farming</Text>
          </View>
          <Text style={styles.title}>{report.cropName || 'My farm'} — profit report</Text>
          <View style={styles.line}>
            <Text style={styles.lineLabel}>Cash profit</Text>
            <Text style={styles.lineValue}>{rupees(report.cashProfit)}</Text>
          </View>
          <View style={styles.line}>
            <Text style={styles.lineLabel}>True profit</Text>
            <Text style={[styles.lineValue, { color: colors.brand[700] }]}>{rupees(report.trueProfit)}</Text>
          </View>
        </View>
        <Button title="Share (WhatsApp / PDF)" icon="Share2" size="lg" onPress={share} style={{ marginTop: spacing.xl }} />
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  report: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.xl, ...shadow.card },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  brand: { fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.brand[700] },
  title: { fontSize: font.size.lg, fontWeight: font.weight.semibold, color: colors.text, marginBottom: spacing.lg },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  lineLabel: { fontSize: font.size.md, color: colors.textMuted },
  lineValue: { fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text },
});
