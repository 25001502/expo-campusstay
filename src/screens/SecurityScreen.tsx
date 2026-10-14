import React from 'react';
import { Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Btn } from '../components/UI';
import { ProfileLayout, ProfileSection, profileStyles as styles } from '../components/ProfileLayout';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Security'>;
export default function SecurityScreen({ navigation }: Props) {
  return <ProfileLayout title="Security" onBack={() => navigation.goBack()}>
    <ProfileSection title="Account access"><Text style={styles.body}>The student app is available without signing in. Sign-in and account security controls will become available when account services are connected.</Text></ProfileSection>
    <ProfileSection title="Passwords and recovery"><Text style={styles.body}>Password changes and reset emails are unavailable. Entering credentials on Login does not authenticate you. No password change, two-factor authentication, or biometric control is enabled.</Text></ProfileSection>
    <ProfileSection title="Your session"><Text style={styles.body}>Log Out on Profile opens a confirmation. Cancel keeps your information. Confirming clears personal details and applications, then restores starting favorites, messages, and notifications. It does not delete any remote account.</Text><Btn variant="secondary" onPress={() => navigation.goBack()}>Return to Profile</Btn></ProfileSection>
  </ProfileLayout>;
}
