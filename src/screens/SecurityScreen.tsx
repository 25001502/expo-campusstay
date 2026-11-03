import React from 'react';
import { Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Btn } from '../components/UI';
import { ProfileLayout, ProfileSection, profileStyles as styles } from '../components/ProfileLayout';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Security'>;
export default function SecurityScreen({ navigation }: Props) {
  return <ProfileLayout title="Security" onBack={() => navigation.goBack()}>
    <ProfileSection title="Account access"><Text style={styles.body}>A signed-in account with a confirmed email is required. CampusStay checks restored sessions with the account service before opening protected screens.</Text></ProfileSection>
    <ProfileSection title="Passwords and recovery"><Text style={styles.body}>Use Forgot password on Sign In to request a recovery email. Open the latest link on the same device, choose a new password, then sign in again. Two-factor authentication and biometric controls are not enabled.</Text></ProfileSection>
    <ProfileSection title="Your session"><Text style={styles.body}>Log Out on Profile opens a confirmation. Cancel keeps your information. Successful sign-out removes the saved session on this device and clears current local personal details and applications. It does not delete your account or sign out other devices.</Text><Btn variant="secondary" onPress={() => navigation.goBack()}>Return to Profile</Btn></ProfileSection>
  </ProfileLayout>;
}
