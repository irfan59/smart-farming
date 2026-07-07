import { useState } from 'react';
import { Text } from 'react-native';
import Screen from '../components/Screen';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../auth/useAuth';

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
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Waiting for approval</Text>
      <Text style={{ marginVertical: 12 }}>Your account is being reviewed. Please check back soon.</Text>
      {msg ? <Text style={{ color: '#993C1D' }}>{msg}</Text> : null}
      <PrimaryButton title="Check again" onPress={check} disabled={busy} />
      <PrimaryButton title="Log out" onPress={logout} />
    </Screen>
  );
}
