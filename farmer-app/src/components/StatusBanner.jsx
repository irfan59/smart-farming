import { View, Text } from 'react-native';

export default function StatusBanner({ subscription }) {
  const s = subscription?.status;
  let msg = null;
  let bg = '#E1F5EE';
  if (s === 'trial') msg = 'Free trial active';
  else if (s === 'active') msg = 'Subscription active';
  else if (s === 'grace') { msg = 'Renew to add new entries'; bg = '#FAEEDA'; }
  else if (s === 'expired') { msg = 'Subscription expired — renew to continue'; bg = '#FCEBEB'; }
  if (!msg) return null;
  return (
    <View style={{ backgroundColor: bg, padding: 10, borderRadius: 8, marginBottom: 12 }}>
      <Text>{msg}</Text>
    </View>
  );
}
