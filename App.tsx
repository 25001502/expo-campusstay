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

import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { reportDiagnostic } from './src/errors';
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
import UpdateFundingScreen from './src/screens/UpdateFundingScreen';
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
import { AuthProvider, useAuth } from './src/state/AuthContext';
import { ManagerVerificationProvider } from './src/verification/useManagerVerification';
import { AccountStatusScreen, AccountUnavailableScreen, ManagerAccessScreen, ManagerRequestScreen, PasswordResetScreen, VerificationScreen } from './src/screens/AccountScreens';

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
  // Keep the existing scaling cap local to this dense navigation chrome.
  const labelScale = Math.min(fontScale, 1.5);
  // Match BottomTabBar's symmetric padding around asymmetric device cutouts.
  const tabWidth = (width - 2 * Math.max(insets.left, insets.right)) / 6;
  const labelWidth = Math.max(1, tabWidth - 2);
  // Inter SemiBold's longest tab name needs just under 5em. At larger sizes,
  // reserve two lines rather than compressing enlarged labels back to normal.
  const labelLines = fontScale > 1 && labelWidth < 55 * labelScale ? 2 : 1;
  // 28dp icon + 3dp gap + scaled label + the navigator's 5dp item padding
  // on each side + 1dp border. The system inset is added exactly once.
  const tabBarHeight = 42 + Math.ceil(14 * labelScale) * labelLines + insets.bottom;
  return (
    <Tab.Navigator
  screenOptions={{
    headerShown: false,

    tabBarActiveTintColor: Colors.blue,
    tabBarInactiveTintColor: Colors.slate600,

    tabBarStyle: {
      backgroundColor: Colors.white,
      borderTopColor: Colors.slate100,
      borderTopWidth: 1,
      height: tabBarHeight,
      paddingBottom: insets.bottom,
      paddingTop: 0,
    },
    tabBarLabelPosition: 'below-icon',
    tabBarItemStyle: { flex: 1, minWidth: 0 },
    tabBarLabelStyle: {
      fontSize: 11,
      fontFamily: Fonts.bodyMed,
    },
    tabBarAllowFontScaling: true,
    tabBarLabel: ({ color, children, focused }) => (
      <Text
        accessible={false}
        allowFontScaling
        numberOfLines={labelLines}
        maxFontSizeMultiplier={1.5}
        adjustsFontSizeToFit={labelLines === 1}
        minimumFontScale={0.9}
        textBreakStrategy="balanced"
        lineBreakStrategyIOS="standard"
        style={{
          // Native font metrics follow the font-size cap; an explicit Android
          // lineHeight scales independently and can overrun the second line.
          color, fontSize: 11, includeFontPadding: false, textAlign: 'center',
          fontFamily: focused ? Fonts.bodySemi : Fonts.bodyMed,
          width: labelWidth,
          // Reclaim 4dp of the navigator's 5dp padding, retaining 1dp per edge.
          marginHorizontal: -4, marginTop: 3,
        }}
      >
        {labelLines === 2 && children.length > 4
          // An invisible break opportunity avoids a lone trailing letter when
          // an enlarged name needs two lines. Accessible names stay unchanged.
          ? `${children.slice(0, Math.ceil(children.length / 2))}\u200b${children.slice(Math.ceil(children.length / 2))}`
          : children}
      </Text>
    ),
  }}
>
  <Tab.Screen
    name="Home"
    component={HomeScreen}
    options={{
      tabBarAccessibilityLabel: 'Home',
      tabBarIcon: ({ color, size }) => (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><FontAwesomeIcon
          icon={faHouse}
          size={size}
          color={color}
        /></View>
      ),
    }}
  />

  <Tab.Screen
    name="Explore"
    component={ExploreScreen}
    options={{
      tabBarAccessibilityLabel: 'Explore',
      tabBarIcon: ({ color, size }) => (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><FontAwesomeIcon
          icon={faMagnifyingGlass}
          size={size}
          color={color}
        /></View>
      ),
    }}
  />

  <Tab.Screen
    name="Favorites"
    component={FavoritesScreen}
    options={{
      tabBarAccessibilityLabel: 'Favorites',
      tabBarIcon: ({ color, size }) => (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><FontAwesomeIcon
          icon={faHeart}
          size={size}
          color={color}
        /></View>
      ),
    }}
  />

  <Tab.Screen
    name="Bookings"
    component={BookingsScreen}
    options={{
      tabBarAccessibilityLabel: 'Bookings',
      tabBarIcon: ({ color, size }) => (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><FontAwesomeIcon
          icon={faClipboard}
          size={size}
          color={color}
        /></View>
      ),
    }}
  />

  <Tab.Screen
    name="Messages"
    component={MessagesScreen}
    options={{
      tabBarAccessibilityLabel: unreadMessageCount ? `Messages, ${unreadMessageCount} unread ${unreadMessageCount === 1 ? 'message' : 'messages'}` : 'Messages',
      tabBarBadge: unreadMessageCount || undefined,
      tabBarIcon: ({ color, size }) => (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><FontAwesomeIcon
          icon={faComments}
          size={size}
          color={color}
        /></View>
      ),
    }}
  />

  <Tab.Screen
    name="Profile"
    component={ProfileScreen}
    options={{
      tabBarAccessibilityLabel: 'Profile',
      tabBarIcon: ({ color, size }) => (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><FontAwesomeIcon
          icon={faUser}
          size={size}
          color={color}
        /></View>
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
      reportDiagnostic('fonts', 'font_load_failed');
    } else if (fontWaitExpired && !fontsLoaded) {
      reportDiagnostic('fonts', 'font_timeout');
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

  return <SafeAreaProvider><StatusBar style="light" /><AppErrorBoundary><AuthProvider><ManagerVerificationProvider><AccountNavigation /></ManagerVerificationProvider></AuthProvider></AppErrorBoundary></SafeAreaProvider>;
}

// Protected routes do not exist in the unauthenticated navigator. Replacing the
// tree on identity changes also clears session-only frontend providers through
// their existing cleanup lifecycle (including private document ownership).
export function AccountNavigation() {
  const auth = useAuth();
  if (auth.configured === false) return <AccountUnavailableScreen />;
  if (auth.phase === 'loading' || auth.phase === 'error') return <AccountStatusScreen />;
  if (auth.phase === 'verification') return <VerificationScreen />;
  if (auth.phase === 'recovery') return <PasswordResetScreen />;
  if (auth.phase === 'authenticated' && auth.user) {
    return <StudentExperience key={auth.user.id} />;
  }
  return <NavigationContainer><Stack.Navigator initialRouteName={auth.intent === 'manager' ? 'ManagerLogin' : 'Login'} screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="ManagerLogin" component={LoginScreen} />
    <Stack.Screen name="ManagerRegister" component={RegisterScreen} />
    <Stack.Screen name="Forgot" component={ForgotScreen} />
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    <Stack.Screen name="Splash" component={SplashScreen} />
  </Stack.Navigator></NavigationContainer>;
}

function StudentExperience() {
  const auth = useAuth();
  return (
      <FavoritesProvider>
        <ApplicationProvider>
          <CommunicationProvider>
          <ProfileProvider>
          <NavigationContainer>
          <Stack.Navigator initialRouteName={auth.intent === 'manager' ? 'ManagerRequest' : 'Main'} screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Property" component={PropertyScreen} />
          <Stack.Screen name="Apply" component={ApplyScreen} />
          <Stack.Screen name="AppStatus" component={AppStatusScreen} />
          <Stack.Screen name="UpdateFunding" component={UpdateFundingScreen} />
          <Stack.Screen name="Compare" component={CompareScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="PersonalInformation" component={PersonalInformationScreen} />
          <Stack.Screen name="MyDocuments" component={MyDocumentsScreen} />
          <Stack.Screen name="Security" component={SecurityScreen} />
          <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
          <Stack.Screen name="TermsPrivacy" component={TermsPrivacyScreen} />
          <Stack.Screen name="ManagerRequest" component={ManagerRequestScreen} />
          <Stack.Screen name="Manager" component={ManagerAccessScreen} />
          </Stack.Navigator>
          </NavigationContainer>
          </ProfileProvider>
          </CommunicationProvider>
        </ApplicationProvider>
      </FavoritesProvider>
  );
}
