import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
import Icon from '../components/ui/Icon';
import HomeScreen from '../screens/HomeScreen';
import ReportsScreen from '../screens/ReportsScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import AddIncomeScreen from '../screens/AddIncomeScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AccountScreen from '../screens/AccountScreen';
import PlotsScreen from '../screens/PlotsScreen';
import CropCycleSetupScreen from '../screens/CropCycleSetupScreen';
import CropCycleDetailScreen from '../screens/CropCycleDetailScreen';
import ShareReportScreen from '../screens/ShareReportScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerShadowVisible: false,
  headerTintColor: colors.brand[700],
  headerTitleStyle: { color: colors.text, fontWeight: '600' },
  contentStyle: { backgroundColor: colors.canvas },
};

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ title: 'Add expense' }} />
      <Stack.Screen name="AddIncome" component={AddIncomeScreen} options={{ title: 'Add income' }} />
      <Stack.Screen name="Plots" component={PlotsScreen} options={{ title: 'My plots' }} />
      <Stack.Screen name="CropCycleSetup" component={CropCycleSetupScreen} options={{ title: 'New crop cycle' }} />
      <Stack.Screen name="CropCycleDetail" component={CropCycleDetailScreen} options={{ title: 'Crop cycle' }} />
    </Stack.Navigator>
  );
}

function ReportsStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="ShareReport" component={ShareReportScreen} options={{ title: 'Share' }} />
    </Stack.Navigator>
  );
}

const tabIcon = (name) => ({ color, size }) => <Icon name={name} size={size} color={color} />;

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand[600],
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.borderLight, height: 60, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: 'Home', tabBarIcon: tabIcon('Home') }} />
      <Tab.Screen name="ReportsTab" component={ReportsStack} options={{ title: 'Reports', tabBarIcon: tabIcon('BarChart3') }} />
      <Tab.Screen name="AddTab" component={AddExpenseScreen} options={{ title: 'Add', tabBarIcon: tabIcon('Plus') }} />
      <Tab.Screen name="AlertsTab" component={NotificationsScreen} options={{ title: 'Alerts', tabBarIcon: tabIcon('Bell') }} />
      <Tab.Screen name="AccountTab" component={AccountScreen} options={{ title: 'Account', tabBarIcon: tabIcon('User') }} />
    </Tab.Navigator>
  );
}
