import { Text } from 'react-native';
import Screen from '../components/Screen';
import PrimaryButton from '../components/PrimaryButton';

export default function OnboardingScreen({ navigation }) {
  return (
    <Screen>
      <Text style={{ fontSize: 24, fontWeight: '600' }}>Smart Farming</Text>
      <Text style={{ marginVertical: 12 }}>Track your kheti kharcha and see real profit — per crop, per acre.</Text>
      <PrimaryButton title="Get started" onPress={() => navigation.navigate('Register')} />
      <PrimaryButton title="I already have an account" onPress={() => navigation.navigate('Login')} />
    </Screen>
  );
}
