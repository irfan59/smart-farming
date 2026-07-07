import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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

function HomeStack() {
  return (
    <Stack.Navigator>
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
    <Stack.Navigator>
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="ShareReport" component={ShareReportScreen} options={{ title: 'Share' }} />
    </Stack.Navigator>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: 'Home' }} />
      <Tab.Screen name="ReportsTab" component={ReportsStack} options={{ title: 'Reports' }} />
      <Tab.Screen name="AddTab" component={AddExpenseScreen} options={{ title: 'Add' }} />
      <Tab.Screen name="AlertsTab" component={NotificationsScreen} options={{ title: 'Alerts' }} />
      <Tab.Screen name="AccountTab" component={AccountScreen} options={{ title: 'Account' }} />
    </Tab.Navigator>
  );
}
