import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text } from 'react-native';
import { useAuth } from '../auth/useAuth';
import OnboardingScreen from '../screens/OnboardingScreen';
import RegisterScreen from '../screens/RegisterScreen';
import LoginScreen from '../screens/LoginScreen';
import WaitingApprovalScreen from '../screens/WaitingApprovalScreen';
import MainTabs from './MainTabs';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { status, ready } = useAuth();
  if (!ready) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>Loading…</Text></View>;
  }
  return (
    <Stack.Navigator>
      {status === 'active' ? (
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
      ) : status === 'pending_approval' ? (
        <Stack.Screen name="WaitingApproval" component={WaitingApprovalScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
