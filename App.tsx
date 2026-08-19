import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';

import { Colors, Fonts } from './src/theme';
import { Property } from './src/data';

// Screens
import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotScreen from './src/screens/ForgotScreen';
import HomeScreen from './src/screens/HomeScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import PropertyScreen from './src/screens/PropertyScreen';
import ApplyScreen from './src/screens/ApplyScreen';
import AppStatusScreen from './src/screens/AppStatusScreen';
import BookingsScreen from './src/screens/BookingsScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import CompareScreen from './src/screens/CompareScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import ChatScreen from './src/screens/ChatScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ManagerScreen from './src/screens/ManagerScreen';

// ─── Navigation Types ─────────────────────────────────────────────────────────
export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  Forgot: undefined;
  Main: undefined;
  Property: { property: Property };
  Apply: { property: Property };
  AppStatus: { property: Property };
  Compare: { ids: string[] };
  Chat: { convId: string };
  Notifications: undefined;
  Manager: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Explore: undefined;
  Favorites: undefined;
  Bookings: undefined;
  Messages: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const HomeTabScreen = HomeScreen as React.ComponentType<any>;
const ExploreTabScreen = ExploreScreen as React.ComponentType<any>;
const FavoritesTabScreen = FavoritesScreen as React.ComponentType<any>;
const BookingsTabScreen = BookingsScreen as React.ComponentType<any>;
const MessagesTabScreen = MessagesScreen as React.ComponentType<any>;
const ProfileTabScreen = ProfileScreen as React.ComponentType<any>;

// ─── Tab icon helper ──────────────────────────────────────────────────────────
function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{icon}</Text>
    </View>
  );
}

// ─── Main bottom tabs ─────────────────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.blue,
        tabBarInactiveTintColor: Colors.slate400,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.slate100,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: Fonts.bodyMed,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeTabScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} /> }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreTabScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="🔍" focused={focused} /> }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesTabScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="🤍" focused={focused} /> }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsTabScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="📋" focused={focused} /> }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesTabScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="💬" focused={focused} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileTabScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Forgot" component={ForgotScreen} />
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Property" component={PropertyScreen} />
          <Stack.Screen name="Apply" component={ApplyScreen} />
          <Stack.Screen name="AppStatus" component={AppStatusScreen} />
          <Stack.Screen name="Compare" component={CompareScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Manager" component={ManagerScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
