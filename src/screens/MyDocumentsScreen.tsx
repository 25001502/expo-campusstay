import React from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Btn, EmptyState } from '../components/UI';
import { ProfileLayout, ProfileSection, profileStyles as styles } from '../components/ProfileLayout';
import { properties } from '../data';
import type { RootStackParamList } from '../navigation/types';
import { getApplicationDocumentGroups } from '../profile';
import { useApplications } from '../state/ApplicationContext';

type Props = NativeStackScreenProps<RootStackParamList, 'MyDocuments'>;
export default function MyDocumentsScreen({ navigation }: Props) {
  const { applications } = useApplications();
  const groups = getApplicationDocumentGroups(applications, properties);
  return <ProfileLayout title="My Documents" onBack={() => navigation.goBack()}>
    <ProfileSection title="Files and verification"><Text style={styles.body}>No document files are stored here. File upload and verification are not available. Category selections are not uploaded files and have not been sent to a provider.</Text></ProfileSection>
    {!groups.length ? <EmptyState title="No document selections" description="Save an application to see its selected document categories here." actionLabel="Explore accommodation" onAction={() => navigation.popTo('Main', { screen: 'Explore' })} /> : groups.map((group) => <ProfileSection key={group.applicationId} title={group.property?.name ?? 'Property unavailable'}>
      <Text style={styles.label}>Application {group.applicationId}</Text>
      {group.categories.map((category) => <View key={category.id} accessible accessibilityLabel={`${category.label}: ${category.selected ? 'Category selected' : 'Not selected'}. No file uploaded or verified.`} style={styles.detail}><Text style={styles.value}>{category.label}</Text><Text style={styles.body}>{category.selected ? 'Category selected' : 'Not selected'}</Text></View>)}
      {group.canOpenApplication ? <Btn variant="secondary" onPress={() => { if (group.property) navigation.navigate('AppStatus', { property: group.property, applicationId: group.applicationId }); }}>View application</Btn> : <Text style={styles.body}>The property or room linked to this application is unavailable. Its category selections remain visible.</Text>}
    </ProfileSection>)}
  </ProfileLayout>;
}
