import { useState } from 'react';
import { Text, TextInput } from 'react-native';
import Screen from '../components/Screen';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../auth/useAuth';

const inp = { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8, marginBottom: 8 };

export default function LoginScreen() {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    try {
      await login(phone, password);
    } catch (e) {
      if (e.code !== 'PENDING_APPROVAL') setError(e.message || 'Could not log in'); // pending routes to the waiting screen
    }
  }

  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>Log in</Text>
      <Text>Phone number</Text>
      <TextInput value={phone} onChangeText={setPhone} keyboardType="number-pad" style={inp} />
      <Text>Password</Text>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry style={inp} />
      {error ? <Text style={{ color: '#A32D2D' }}>{error}</Text> : null}
      <PrimaryButton title="Log in" onPress={submit} />
      <Text style={{ marginTop: 12, color: '#666' }}>Forgot password? Contact us to reset it.</Text>
    </Screen>
  );
}
