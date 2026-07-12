import { View, Text, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import Button from '../components/ui/Button';
import FadeIn from '../components/ui/FadeIn';
import { colors, font, spacing } from '../theme';

const FEATURES = [
  { emoji: '🧾', title: 'Log every kharcha', text: 'Record expenses and income in a few taps.' },
  { emoji: '🌾', title: 'Real profit, per crop', text: 'See cash and true profit for each crop and acre.' },
  { emoji: '📤', title: 'Share anywhere', text: 'Send a clean report on WhatsApp or as PDF.' },
];

export default function OnboardingScreen({ navigation }) {
  return (
    <Screen contentStyle={{ justifyContent: 'space-between' }}>
      <FadeIn>
        <View style={{ alignItems: 'center', marginTop: spacing.xxxl }}>
          <Text style={{ fontSize: 64 }}>🌱</Text>
          <Text style={styles.brand}>Smart Farming</Text>
          <Text style={styles.tag}>Track your kheti kharcha and see real profit — per crop, per acre.</Text>
        </View>
        <View style={{ marginTop: spacing.xxxl, gap: spacing.md }}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.feature}>
              <Text style={{ fontSize: 22 }}>{f.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.fTitle}>{f.title}</Text>
                <Text style={styles.fText}>{f.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </FadeIn>
      <FadeIn delay={120}>
        <View style={{ gap: spacing.md, marginTop: spacing.xxxl }}>
          <Button title="Get started" size="lg" onPress={() => navigation.navigate('Register')} />
          <Button title="I already have an account" variant="secondary" size="lg" onPress={() => navigation.navigate('Login')} />
        </View>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { marginTop: spacing.lg, fontSize: font.size.display, fontWeight: font.weight.bold, color: colors.text },
  tag: { marginTop: spacing.sm, fontSize: font.size.md, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.lg, lineHeight: 22 },
  feature: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 16, padding: spacing.lg },
  fTitle: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text },
  fText: { marginTop: 2, fontSize: font.size.sm, color: colors.textMuted },
});
