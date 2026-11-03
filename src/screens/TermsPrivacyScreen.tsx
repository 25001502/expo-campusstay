import React from 'react';
import { Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProfileLayout, ProfileSection, profileStyles as styles } from '../components/ProfileLayout';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'TermsPrivacy'>;
export default function TermsPrivacyScreen({ navigation }: Props) {
  return <ProfileLayout title="Terms & Privacy" onBack={() => navigation.goBack()}>
    <ProfileSection title="Policy availability"><Text style={styles.body}>Formal CampusStay terms and a privacy policy are not available yet. This page describes the current app behaviour; it is not a legal agreement. No policy acceptance is requested or recorded.</Text></ProfileSection>
    <ProfileSection title="Local session information"><Text style={styles.body}>Personal details, favorites, saved applications, and message/notification interactions remain in memory during this app session. They are not retained after the app process restarts. Log Out clears personal details and applications and restores the starting favorites and conversation/notification history.</Text></ProfileSection>
    <ProfileSection title="Account information"><Text style={styles.body}>When account services are configured, registration and sign-in information is sent securely to Supabase Auth. Native session credentials are kept in encrypted device storage so your session can be restored. Passwords are not saved by CampusStay. Local accommodation records and attachments are not uploaded by this account flow.</Text></ProfileSection>
    <ProfileSection title="Applications and documents"><Text style={styles.body}>Saved applications retain their own personal details. Changing your Profile does not change an application. Document-category selections do not contain uploaded files or indicate verification. No application or document is delivered to a provider.</Text></ProfileSection>
    <ProfileSection title="Accommodation images"><Text style={styles.body}>Accommodation images load from an external image service when an internet connection is available.</Text></ProfileSection>
  </ProfileLayout>;
}
