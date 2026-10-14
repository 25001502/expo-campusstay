import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Property } from '../data';
import type { QuickFilter } from '../discovery';

export type MainTabParamList = {
  Home: undefined;
  Explore: { query?: string; universityId?: string; quickFilter?: QuickFilter } | undefined;
  Favorites: undefined;
  Bookings: { section?: 'Applications' | 'Upcoming' | 'Active' | 'Completed' | 'Cancelled' } | undefined;
  Messages: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  Forgot: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Property: { property: Property };
  Apply: { property: Property; selectedRoomId?: string };
  AppStatus:
    | { property: Property; applicationId: string; sampleReference?: never; sampleRoom?: never; sampleStatus?: never }
    | { property: Property; applicationId?: never; sampleReference: string; sampleRoom: string; sampleStatus: string };
  Compare: { ids: string[] };
  Chat: { convId: string };
  Notifications: undefined;
  PersonalInformation: undefined;
  MyDocuments: undefined;
  Security: undefined;
  HelpSupport: undefined;
  TermsPrivacy: undefined;
  Manager: undefined;
};

export type StudentTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
