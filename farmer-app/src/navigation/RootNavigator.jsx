import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../auth/useAuth';
import { colors } from '../theme';
import OnboardingScreen from '../screens/OnboardingScreen';
import RegisterScreen from '../screens/RegisterScreen';
import LoginScreen from '../screens/LoginScreen';
import WaitingApprovalScreen from '../screens/WaitingApprovalScreen';
import MainTabs from './MainTabs';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerShadowVisible: false,
  headerTintColor: colors.brand[700],
  headerTitleStyle: { color: colors.text, fontWeight: '600' },
  contentStyle: { backgroundColor: colors.canvas },
};

export default function RootNavigator() {
  const { status, ready } = useAuth();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas }}>
        <ActivityIndicator color={colors.brand[600]} />
      </View>
    );
  }
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {status === 'active' ? (
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
      ) : status === 'pending_approval' ? (
        <Stack.Screen name="WaitingApproval" component={WaitingApprovalScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create account' }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Log in' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
