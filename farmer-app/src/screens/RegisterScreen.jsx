import { useState } from 'react';
import { Text, TextInput, Switch, View } from 'react-native';
import Screen from '../components/Screen';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../auth/useAuth';

const inp = { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8 };

export default function RegisterScreen() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', password: '', village: '', state: '', district: '' });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    setError('');
    if (!consent) { setError('Please give consent to continue'); return; }
    try { await register(form); } catch (e) { setError(e.message || 'Could not register'); }
  }

  const Row = ({ label, k, ...opts }) => (
    <View style={{ marginBottom: 8 }}>
      <Text>{label}</Text>
      <TextInput value={form[k]} onChangeText={set(k)} style={inp} {...opts} />
    </View>
  );

  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>Register</Text>
      <Row label="Name" k="name" />
      <Row label="Phone number" k="phone" keyboardType="number-pad" />
      <Row label="Password" k="password" secureTextEntry />
      <Row label="State" k="state" />
      <Row label="District" k="district" />
      <Row label="Village" k="village" />
      <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8 }}>
        <Switch value={consent} onValueChange={setConsent} />
        <Text style={{ marginLeft: 8, flex: 1 }}>I agree to my data being stored to run my account</Text>
      </View>
      {error ? <Text style={{ color: '#A32D2D' }}>{error}</Text> : null}
      <PrimaryButton title="Register" onPress={submit} />
    </Screen>
  );
}
