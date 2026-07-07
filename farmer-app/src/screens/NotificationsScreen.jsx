import { useEffect } from 'react';
import { View, Text } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import Screen from '../components/Screen';
import { useAuth } from '../auth/useAuth';
import { useAnnouncements } from '../features/announcements/useAnnouncements';

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
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Announcements</Text>
      {list.data ? (
        list.data.length ? list.data.map((a) => (
          <View key={a.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: '#eee' }}>
            <Text style={{ fontWeight: '600' }}>{a.title}</Text>
            <Text>{a.body}</Text>
          </View>
        )) : <Text>No announcements yet</Text>
      ) : <Text>Loading…</Text>}
    </Screen>
  );
}
