import { useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import FadeIn from '../components/ui/FadeIn';
import { useAuth } from '../auth/useAuth';
import { colors, font, spacing, radius } from '../theme';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', password: '', village: '', state: '', district: '' });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    setError('');
    if (!consent) {
      setError('Please give consent to continue');
      return;
    }
    setBusy(true);
    try {
      await register(form);
    } catch (e) {
      setError(e.message || 'Could not register');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <FadeIn>
        <Text style={styles.h1}>Create your account</Text>
        <Text style={styles.sub}>An admin approves new farmers before first login.</Text>
        <Card style={{ marginTop: spacing.lg }}>
          <Input label="Name" value={form.name} onChangeText={set('name')} placeholder="Your full name" />
          <Input label="Phone number" value={form.phone} onChangeText={set('phone')} keyboardType="number-pad" placeholder="10-digit number" />
          <Input label="Password" value={form.password} onChangeText={set('password')} secureTextEntry placeholder="At least 8 characters" />
          <Input label="State" value={form.state} onChangeText={set('state')} placeholder="e.g. Maharashtra" />
          <Input label="District" value={form.district} onChangeText={set('district')} placeholder="e.g. Wardha" />
          <Input label="Village" value={form.village} onChangeText={set('village')} placeholder="Your village" containerStyle={{ marginBottom: spacing.sm }} />
          <View style={styles.consent}>
            <Switch value={consent} onValueChange={setConsent} trackColor={{ true: colors.brand[500] }} />
            <Text style={styles.consentText}>I agree to my data being stored to run my account</Text>
          </View>
          {error ? (
            <View style={styles.err}>
              <Text style={styles.errText}>{error}</Text>
            </View>
          ) : null}
          <Button title="Register" size="lg" onPress={submit} loading={busy} style={{ marginTop: spacing.lg }} />
        </Card>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: font.size.xxl, fontWeight: font.weight.bold, color: colors.text },
  sub: { marginTop: 4, fontSize: font.size.sm, color: colors.textMuted },
  consent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs },
  consentText: { flex: 1, fontSize: font.size.sm, color: colors.textMuted },
  err: { marginTop: spacing.md, backgroundColor: colors.dangerBg, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  errText: { color: colors.dangerText, fontSize: font.size.sm },
});
