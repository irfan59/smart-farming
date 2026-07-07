import { Text } from 'react-native';
import Screen from '../components/Screen';
import PrimaryButton from '../components/PrimaryButton';
import StatusBanner from '../components/StatusBanner';
import { useAuth } from '../auth/useAuth';

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
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Account</Text>
      <Text style={{ marginVertical: 6 }}>{farmer?.name} · {farmer?.phone}</Text>
      <StatusBanner subscription={subscription} />
      <Text style={{ marginTop: 8, fontWeight: '600' }}>Plan: ₹99 / month or ₹799 / year</Text>
      <Text style={{ color: '#666', marginBottom: 12 }}>To pay, use cash/UPI with us; we will activate your month.</Text>
      <PrimaryButton title="Log out" onPress={logout} />
      <PrimaryButton title="Deactivate my account" onPress={deactivate} />
      <Text style={{ color: '#666', marginTop: 4 }}>Your data is kept. Contact us to fully erase it.</Text>
    </Screen>
  );
}
