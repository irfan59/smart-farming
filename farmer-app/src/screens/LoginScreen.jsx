import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import FadeIn from '../components/ui/FadeIn';
import { useAuth } from '../auth/useAuth';
import { colors, font, spacing, radius } from '../theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError('');
    setBusy(true);
    try {
      await login(phone, password);
    } catch (e) {
      if (e.code !== 'PENDING_APPROVAL') setError(e.message || 'Could not log in'); // pending routes to waiting screen
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <FadeIn>
        <Text style={{ fontSize: 44, marginBottom: spacing.sm }}>🌱</Text>
        <Text style={styles.h1}>Welcome back</Text>
        <Text style={styles.sub}>Log in to track your farm.</Text>
        <Card style={{ marginTop: spacing.xl }}>
          <Input label="Phone number" value={phone} onChangeText={setPhone} keyboardType="number-pad" placeholder="10-digit number" />
          <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" containerStyle={{ marginBottom: 0 }} />
          {error ? (
            <View style={styles.err}>
              <Text style={styles.errText}>{error}</Text>
            </View>
          ) : null}
          <Button title="Log in" size="lg" onPress={submit} loading={busy} style={{ marginTop: spacing.lg }} />
        </Card>
        <Text style={styles.hint}>Forgot password? Contact us to reset it.</Text>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: font.size.xxl, fontWeight: font.weight.bold, color: colors.text },
  sub: { marginTop: 4, fontSize: font.size.sm, color: colors.textMuted },
  err: { marginTop: spacing.md, backgroundColor: colors.dangerBg, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  errText: { color: colors.dangerText, fontSize: font.size.sm },
  hint: { marginTop: spacing.lg, color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center' },
});
