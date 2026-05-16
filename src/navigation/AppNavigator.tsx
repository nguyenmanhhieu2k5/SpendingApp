import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { RootStackParamList, MainTabParamList } from '../types';
import { COLORS } from '../utils/constants';

import { LoginScreen, RegisterScreen } from '../screens/AuthScreens';
import { PinSetupScreen, PinVerifyScreen } from '../screens/PinScreens';
import { HomeScreen }          from '../screens/HomeScreen';
import { AddScreen }           from '../screens/AddScreen';
import { StatsScreen }         from '../screens/StatsScreen';
import { BudgetScreen }        from '../screens/BudgetScreen';
import { GoalsScreen }         from '../screens/GoalsScreen';
import { ProfileScreen }       from '../screens/ProfileScreen';
import { EditProfileScreen }   from '../screens/EditProfileScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { CurrencyScreen }      from '../screens/CurrencyScreen';
import { BiometricScreen }     from '../screens/BiometricScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab   = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, string> = {
  Home: '🏠', Stats: '📊', Add: '➕', Budget: '🎯', Profile: '👤',
};

function MainTabs() {
  const { state } = useApp();
  const unread = state.notifications.filter(n => !n.read).length;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: s.tabBar,
        tabBarLabelStyle: s.tabLbl,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#aaa',
        tabBarIcon: ({ focused }) => {
          const isAdd = route.name === 'Add';
          return (
            <View style={[s.tabIco, isAdd && s.tabIcoAdd, isAdd && focused && s.tabIcoAddOn]}>
              <Text style={{ fontSize: isAdd ? 22 : 18 }}>{TAB_ICONS[route.name]}</Text>
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home"    component={HomeScreen}   options={{ title: 'Trang chủ' }} />
      <Tab.Screen name="Stats"   component={StatsScreen}  options={{ title: 'Thống kê' }} />
      <Tab.Screen name="Add"     component={AddScreen}    options={{ title: '', tabBarLabel: '' }} />
      <Tab.Screen name="Budget"  component={BudgetScreen} options={{ title: 'Ngân sách' }} />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Hồ sơ',
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: COLORS.danger, fontSize: 10 },
        }}
      />
    </Tab.Navigator>
  );
}

// Full stack after auth - contains tabs + all sub-screens
function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Main"          component={MainTabs} />
      <Stack.Screen name="PinSetup"      component={PinSetupScreen} />
      <Stack.Screen name="EditProfile"   component={EditProfileScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Currency"      component={CurrencyScreen} />
      <Stack.Screen name="Biometric"     component={BiometricScreen} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { state } = useApp();

  if (state.isLoading) {
    return (
      <View style={s.splash}>
        <Text style={{ fontSize: 52, marginBottom: 16 }}>💰</Text>
        <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.dark, marginBottom: 8 }}>
          SpendingApp
        </Text>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  // Not logged in
  if (!state.isAuthenticated) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="Login"    component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    );
  }

  // New user — needs PIN setup
  if (state.needsPinSetup) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="PinSetup" component={PinSetupScreen} />
      </Stack.Navigator>
    );
  }

  // Returning user — PIN not verified yet
  if (!state.isPinVerified) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="PinVerify" component={PinVerifyScreen} />
      </Stack.Navigator>
    );
  }

  // Fully authenticated
  return <MainStack />;
}

export function AppNavigator() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}

const s = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  tabBar: {
    backgroundColor: '#fff', borderTopColor: '#eee', borderTopWidth: 0.5,
    height: 82, paddingBottom: 18, paddingTop: 8,
  },
  tabLbl: { fontSize: 10, fontWeight: '500' },
  tabIco: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  tabIcoAdd: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: COLORS.primaryLight, marginBottom: 6,
  },
  tabIcoAddOn: { backgroundColor: COLORS.primary },
});
