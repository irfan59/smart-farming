import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import Screen from '../components/Screen';
import Card from '../components/ui/Card';
import Icon from '../components/ui/Icon';
import FadeIn from '../components/ui/FadeIn';
import EmptyState from '../components/ui/EmptyState';
import { useAuth } from '../auth/useAuth';
import { useAnnouncements } from '../features/announcements/useAnnouncements';
import { colors, font, spacing, radius } from '../theme';

export default function NotificationsScreen() {
  const { api } = useAuth();
  const list = useAnnouncements();

  useEffect(() => {
    (async () => {
      try {
        await messaging().requestPermission();
        const token = await messaging().getToken();
        if (token) await api.post('/me/fcm-token', { token });
      } catch {
        /* permission denied or no FCM — non-fatal */
      }
    })();
  }, [api]);

  return (
    <Screen>
      <FadeIn>
        <Text style={styles.h1}>Announcements</Text>
        {!list.data ? (
          <Card><Text style={styles.muted}>Loading…</Text></Card>
        ) : list.data.length ? (
          <View style={{ gap: spacing.md }}>
            {list.data.map((a) => (
              <Card key={a.id}>
                <View style={styles.row}>
                  <View style={styles.icon}>
                    <Icon name="Megaphone" size={18} color={colors.harvest[600]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{a.title}</Text>
                    <Text style={styles.body}>{a.body}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <EmptyState icon="Bell" title="No announcements yet" text="Updates from the team will appear here." />
        )}
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: font.size.xxl, fontWeight: font.weight.bold, color: colors.text, marginBottom: spacing.md },
  muted: { color: colors.textMuted, fontSize: font.size.sm },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  icon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.harvest[50], alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text },
  body: { marginTop: 2, fontSize: font.size.sm, color: colors.textMuted, lineHeight: 20 },
});
