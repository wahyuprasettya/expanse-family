// ============================================================
// Main Navigator (Bottom Tabs + Nested Stacks)
// ============================================================
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '@screens/main/HomeScreen';
import TransactionsScreen from '@screens/main/TransactionsScreen';
import ReportsScreen from '@screens/main/ReportsScreen';
import AssetsScreen from '@screens/main/AssetsScreen';
import BudgetScreen from '@screens/main/BudgetScreen';
import ProfileScreen from '@screens/main/ProfileScreen';
import AddTransactionScreen from '@screens/transaction/AddTransactionScreen';
import TransactionDetailScreen from '@screens/transaction/TransactionDetailScreen';
import RemindersScreen from '@screens/reminder/RemindersScreen';
import CategoriesScreen from '@screens/category/CategoriesScreen';
import PinScreen from '@screens/auth/PinScreen';
import HouseholdScreen from '@screens/main/HouseholdScreen';
import NotificationsScreen from '@screens/main/NotificationsScreen';
import NotesScreen from '@screens/main/NotesScreen';
import InsightsScreen from '@screens/main/InsightsScreen';
import WalletsScreen from '@screens/main/WalletsScreen';
import ScanReceiptScreen from '@screens/receipt/ScanReceiptScreen';
import ReceiptCameraScreen from '@screens/receipt/ReceiptCameraScreen';
import { BORDER_RADIUS, FONT_FAMILY } from '@constants/theme';
import { useTranslation } from '@hooks/useTranslation';
import { useAppTheme } from '@hooks/useAppTheme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ─── Tab Icon Map ────────────────────────────────────────────
const TAB_ICONS = {
  Home: { active: 'home', inactive: 'home-outline' },
  Transactions: { active: 'list', inactive: 'list-outline' },
  Reports: { active: 'stats-chart', inactive: 'stats-chart-outline' },
  Assets: { active: 'diamond', inactive: 'diamond-outline' },
  Budget: { active: 'wallet', inactive: 'wallet-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

// ─── Bottom Tab Navigator ────────────────────────────────────
const BottomTabs = () => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarBackground: () => (
          <View style={styles.tabBarBackground} />
        ),
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          return (
            <Ionicons
              name={focused ? icons.active : icons.inactive}
              size={focused ? 24 : 22}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t('nav.home') }} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} options={{ tabBarLabel: t('nav.transactions') }} />
      <Tab.Screen name="Reports" component={ReportsScreen} options={{ tabBarLabel: t('nav.reports') }} />
      <Tab.Screen name="Assets" component={AssetsScreen} options={{ tabBarLabel: t('nav.assets') }} />
      <Tab.Screen name="Budget" component={BudgetScreen} options={{ tabBarLabel: t('nav.budget') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t('nav.profile') }} />
    </Tab.Navigator>
  );
};

// ─── Main Stack Navigator ────────────────────────────────────
const MainNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={BottomTabs} />
      <Stack.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="ScanReceipt"
        component={ScanReceiptScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="ReceiptCamera"
        component={ReceiptCameraScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
      <Stack.Screen name="Reminders" component={RemindersScreen} />
      <Stack.Screen name="Categories" component={CategoriesScreen} />
      <Stack.Screen name="Household" component={HouseholdScreen} />
      <Stack.Screen name="Notes" component={NotesScreen} />
      <Stack.Screen name="Insights" component={InsightsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Wallets" component={WalletsScreen} />
      <Stack.Screen
        name="Pin"
        component={PinScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
};

const createStyles = (colors) => StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.overlayLight,
    height: 65,
    paddingBottom: 10,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: FONT_FAMILY.semibold,
  },
  tabBarBackground: {
    flex: 1,
    backgroundColor: colors.surface,
  },
});

export default MainNavigator;
