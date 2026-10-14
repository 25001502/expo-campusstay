import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, useWindowDimensions, View } from 'react-native';
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
import type { MainTabParamList, RootStackParamList } from './src/navigation/types';
import { FavoritesProvider } from './src/state/FavoritesContext';
import { ApplicationProvider } from './src/state/ApplicationContext';
import { CommunicationProvider, useCommunication } from './src/state/CommunicationContext';
import { ProfileProvider } from './src/state/ProfileContext';

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
import PersonalInformationScreen from './src/screens/PersonalInformationScreen';
import MyDocumentsScreen from './src/screens/MyDocumentsScreen';
import SecurityScreen from './src/screens/SecurityScreen';
import HelpSupportScreen from './src/screens/HelpSupportScreen';
import TermsPrivacyScreen from './src/screens/TermsPrivacyScreen';
import ManagerScreen from './src/screens/ManagerScreen';

//font awesome
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faHouse,
  faMagnifyingGlass,
  faHeart,
  faClipboard,
  faComments,
  faUser,
} from "@fortawesome/free-solid-svg-icons";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// ─── Main bottom tabs ─────────────────────────────────────────────────────────
function MainTabs() {
  const { unreadMessageCount } = useCommunication();
  const insets = useSafeAreaInsets();
  const { fontScale, width } = useWindowDimensions();
  // Six tabs need room for a second label line on narrow phones.
  const labelWrapSpace = width / 6 < 64 ? 12 * Math.min(fontScale, 1.2) : 0;
  const tabBarHeight = 54 + labelWrapSpace + Math.max(insets.bottom, 8) + Math.max(0, Math.min(fontScale, 2) - 1) * 18;
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
      height: tabBarHeight,
      paddingBottom: Math.max(insets.bottom, 8),
      paddingTop: 4,
    },

    tabBarLabelStyle: {
      fontSize: 9,
      fontFamily: Fonts.bodyMed,
    },
    tabBarLabel: ({ color, children }) => (
      <Text
        numberOfLines={2}
        maxFontSizeMultiplier={1.2}
        style={{ color, fontSize: 9, textAlign: 'center', fontFamily: Fonts.bodyMed }}
      >
        {children}
      </Text>
    ),
  }}
>
  <Tab.Screen
    name="Home"
    component={HomeScreen}
    options={{
      tabBarIcon: ({ color, size }) => (
        <FontAwesomeIcon
          icon={faHouse}
          size={size}
          color={color}
        />
      ),
    }}
  />

  <Tab.Screen
    name="Explore"
    component={ExploreScreen}
    options={{
      tabBarIcon: ({ color, size }) => (
        <FontAwesomeIcon
          icon={faMagnifyingGlass}
          size={size}
          color={color}
        />
      ),
    }}
  />

  <Tab.Screen
    name="Favorites"
    component={FavoritesScreen}
    options={{
      tabBarIcon: ({ color, size }) => (
        <FontAwesomeIcon
          icon={faHeart}
          size={size}
          color={color}
        />
      ),
    }}
  />

  <Tab.Screen
    name="Bookings"
    component={BookingsScreen}
    options={{
      tabBarIcon: ({ color, size }) => (
        <FontAwesomeIcon
          icon={faClipboard}
          size={size}
          color={color}
        />
      ),
    }}
  />

  <Tab.Screen
    name="Messages"
    component={MessagesScreen}
    options={{
      tabBarBadge: unreadMessageCount || undefined,
      tabBarIcon: ({ color, size }) => (
        <FontAwesomeIcon
          icon={faComments}
          size={size}
          color={color}
        />
      ),
    }}
  />

  <Tab.Screen
    name="Profile"
    component={ProfileScreen}
    options={{
      tabBarIcon: ({ color, size }) => (
        <FontAwesomeIcon
          icon={faUser}
          size={size}
          color={color}
        />
      ),
    }}
  />
</Tab.Navigator>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [fontWaitExpired, setFontWaitExpired] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError || fontWaitExpired) return;
    const timer = setTimeout(() => setFontWaitExpired(true), 10000);
    return () => clearTimeout(timer);
  }, [fontsLoaded, fontError, fontWaitExpired]);

  useEffect(() => {
    if (fontError) {
      console.warn('CampusStay fonts could not load; continuing with system fonts.', fontError);
    } else if (fontWaitExpired && !fontsLoaded) {
      console.warn('CampusStay font loading timed out; continuing with system fonts.');
    }
  }, [fontError, fontWaitExpired, fontsLoaded]);

  if (!fontsLoaded && !fontError && !fontWaitExpired) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <StatusBar style="light" />
        <ActivityIndicator color={Colors.white} accessibilityLabel="Loading CampusStay" />
        <Text style={{ color: Colors.white, fontSize: 20 }}>CampusStay</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <FavoritesProvider>
        <ApplicationProvider>
          <CommunicationProvider>
          <ProfileProvider>
          <NavigationContainer>
          <Stack.Navigator initialRouteName="Main" screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
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
          <Stack.Screen name="PersonalInformation" component={PersonalInformationScreen} />
          <Stack.Screen name="MyDocuments" component={MyDocumentsScreen} />
          <Stack.Screen name="Security" component={SecurityScreen} />
          <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
          <Stack.Screen name="TermsPrivacy" component={TermsPrivacyScreen} />
          <Stack.Screen name="Manager" component={ManagerScreen} />
          </Stack.Navigator>
          </NavigationContainer>
          </ProfileProvider>
          </CommunicationProvider>
        </ApplicationProvider>
      </FavoritesProvider>
    </SafeAreaProvider>
  );
}
