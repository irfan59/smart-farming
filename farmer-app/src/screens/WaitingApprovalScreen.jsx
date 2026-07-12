import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import Button from '../components/ui/Button';
import FadeIn from '../components/ui/FadeIn';
import { useAuth } from '../auth/useAuth';
import { colors, font, spacing, radius } from '../theme';

export default function WaitingApprovalScreen() {
  const { retry, logout } = useAuth();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function check() {
    setBusy(true);
    setMsg('');
    try {
      await retry();
    } catch (e) {
      setMsg(e.code === 'PENDING_APPROVAL' ? 'Still waiting for approval.' : e.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen contentStyle={{ justifyContent: 'center' }}>
      <FadeIn>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 56 }}>⏳</Text>
          <Text style={styles.h1}>Waiting for approval</Text>
          <Text style={styles.sub}>Your account is being reviewed. We'll let you in as soon as an admin approves it.</Text>
        </View>
        {msg ? (
          <View style={styles.note}>
            <Text style={styles.noteText}>{msg}</Text>
          </View>
        ) : null}
        <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
          <Button title="Check again" size="lg" onPress={check} loading={busy} />
          <Button title="Log out" variant="ghost" onPress={logout} />
        </View>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { marginTop: spacing.lg, fontSize: font.size.xxl, fontWeight: font.weight.bold, color: colors.text, textAlign: 'center' },
  sub: { marginTop: spacing.sm, fontSize: font.size.md, color: colors.textMuted, textAlign: 'center', lineHeight: 22, paddingHorizontal: spacing.md },
  note: { marginTop: spacing.xl, backgroundColor: colors.harvest[50], borderRadius: radius.md, padding: spacing.md },
  noteText: { color: colors.harvest[700], fontSize: font.size.sm, textAlign: 'center' },
});
