import { View, Text, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Icon from '../components/ui/Icon';
import FadeIn from '../components/ui/FadeIn';
import { useAuth } from '../auth/useAuth';
import { colors, font, spacing, radius } from '../theme';

export default function AccountScreen() {
  const { farmer, subscription, logout, api } = useAuth();

  async function deactivate() {
    try {
      await api.post('/me/deactivate');
    } catch {
      /* ignore */
    }
    await logout();
  }

  return (
    <Screen>
      <FadeIn>
        <Text style={styles.h1}>Account</Text>

        <Card style={{ marginTop: spacing.md }}>
          <View style={styles.profile}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(farmer?.name?.[0] || 'F').toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{farmer?.name}</Text>
              <Text style={styles.muted}>{farmer?.phone}</Text>
            </View>
          </View>
          {subscription?.status ? <View style={{ marginTop: spacing.md }}><Badge status={subscription.status} /></View> : null}
        </Card>

        <Card style={{ marginTop: spacing.md }}>
          <View style={styles.planRow}>
            <View style={styles.planIcon}>
              <Icon name="Wallet" size={20} color={colors.brand[600]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.planTitle}>Plan: ₹99 / month or ₹799 / year</Text>
              <Text style={styles.muted}>To pay, use cash/UPI with us; we'll activate your month.</Text>
            </View>
          </View>
        </Card>

        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          <Button title="Log out" variant="secondary" icon="LogOut" onPress={logout} />
          <Button title="Deactivate my account" variant="dangerGhost" icon="Trash2" onPress={deactivate} />
        </View>
        <Text style={styles.footnote}>Your data is kept. Contact us to fully erase it.</Text>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: font.size.xxl, fontWeight: font.weight.bold, color: colors.text },
  profile: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  avatar: { width: 52, height: 52, borderRadius: radius.pill, backgroundColor: colors.brand[600], alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: font.size.xl, fontWeight: font.weight.bold },
  name: { fontSize: font.size.lg, fontWeight: font.weight.semibold, color: colors.text },
  muted: { color: colors.textMuted, fontSize: font.size.sm },
  planRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  planIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.brand[50], alignItems: 'center', justifyContent: 'center' },
  planTitle: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text, marginBottom: 2 },
  footnote: { color: colors.textMuted, fontSize: font.size.xs, textAlign: 'center', marginTop: spacing.md },
});
