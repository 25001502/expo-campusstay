import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StudentTabScreenProps } from '../navigation/types';
import { useApplications } from '../state/ApplicationContext';
import { useCommunication } from '../state/CommunicationContext';
import { useFavorites } from '../state/FavoritesContext';
import { Colors, Fonts, Radius, Shadow, Spacing, TextColors } from '../theme';

type Props = StudentTabScreenProps<'Profile'>;
const sections = [
  { title: 'Personal Information', icon: 'person-outline', color: '#1976D2', bg: '#E3F2FD' },
  { title: 'My Documents', icon: 'document-text-outline', color: '#8E44AD', bg: '#F3E5F5' },
  { title: 'Notifications', icon: 'notifications-outline', color: '#B45309', bg: Colors.amber100 },
  { title: 'Security', icon: 'lock-closed-outline', color: '#4B5563', bg: Colors.slate100 },
  { title: 'Help & Support', icon: 'help-circle-outline', color: '#1976D2', bg: '#E3F2FD' },
  { title: 'Terms & Privacy', icon: 'clipboard-outline', color: '#64748B', bg: Colors.slate100 },
] as const;

export default function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { applications, clearApplications } = useApplications();
  const { favoriteIds, resetFavorites } = useFavorites();
  const { unreadNotificationCount, resetCommunication } = useCommunication();
  const openSetting = (title: typeof sections[number]['title']) => {
    if (title === 'Notifications') {
      navigation.navigate('Notifications');
      return;
    }
    Alert.alert(title, 'This setting is not available yet. Changes are not saved.');
  };
  const confirmLogout = () => Alert.alert(
    'Log Out',
    'Are you sure you want to log out?',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => {
        clearApplications();
        resetFavorites();
        resetCommunication();
        navigation.replace('Login');
      } },
    ],
  );
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 + insets.bottom }} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <View importantForAccessibility="no-hide-descendants" style={styles.avatar}><Text style={styles.avatarText}>SD</Text></View>
        <Text accessibilityRole="header" style={styles.name}>Siyanda Dlamini</Text><Text style={styles.university}>University of Venda</Text><Text style={styles.studentNumber}>Student No. 2021012345</Text>
        <View style={styles.statsRow}>
          {[{ label: 'Applications', value: String(applications.length) }, { label: 'Saved', value: String(favoriteIds.length) }, { label: 'Unread', value: String(unreadNotificationCount) }].map((item) => <View key={item.label} accessible accessibilityLabel={item.value + ' ' + item.label} style={styles.statItem}><Text style={styles.statValue}>{item.value}</Text><Text style={styles.statLabel}>{item.label}</Text></View>)}
        </View>
      </View>
      <View style={styles.menuSection}>
        {sections.map((item) => <TouchableOpacity key={item.title} accessibilityRole="button" accessibilityLabel={item.title + (item.title === 'Notifications' && unreadNotificationCount ? ', ' + unreadNotificationCount + ' unread' : '')} accessibilityHint={item.title === 'Notifications' ? 'Opens notifications' : 'Shows availability information'} style={styles.menuItem} activeOpacity={0.7} onPress={() => openSetting(item.title)}>
          <View importantForAccessibility="no-hide-descendants" style={[styles.menuIcon, { backgroundColor: item.bg }]}><Ionicons name={item.icon} size={21} color={item.color} /></View><Text style={styles.menuLabel}>{item.title}</Text>{item.title === 'Notifications' && unreadNotificationCount ? <View style={styles.count}><Text style={styles.countText}>{unreadNotificationCount}</Text></View> : null}<Ionicons importantForAccessibility="no-hide-descendants" name="chevron-forward-outline" size={20} color={Colors.slate400} />
        </TouchableOpacity>)}
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Log Out" accessibilityHint="Opens a confirmation before logging out and clearing current session data" style={styles.logoutItem} activeOpacity={0.7} onPress={confirmLogout}><Ionicons importantForAccessibility="no-hide-descendants" name="log-out-outline" size={24} color={Colors.red600} /><Text style={styles.logoutLabel}>Log Out</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background }, header: { backgroundColor: Colors.navy, paddingHorizontal: Spacing.xxl, paddingBottom: 28, alignItems: 'center' }, avatar: { width: 72, height: 72, borderRadius: 18, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md }, avatarText: { color: Colors.white, fontSize: 26, fontFamily: Fonts.heading }, name: { color: Colors.white, fontSize: 22, fontFamily: Fonts.heading, marginBottom: Spacing.xs }, university: { color: Colors.slate300, fontSize: 14, fontFamily: Fonts.body }, studentNumber: { color: Colors.slate300, fontSize: 12, lineHeight: 18, fontFamily: Fonts.body, marginBottom: Spacing.xl, textAlign: 'center' },
  statsRow: { width: '100%', flexDirection: 'row', gap: Spacing.sm }, statItem: { flex: 1, minWidth: 0, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: Spacing.md, borderRadius: Radius.xl }, statValue: { color: Colors.white, fontSize: 20, fontFamily: Fonts.heading }, statLabel: { color: Colors.slate300, fontSize: 11, fontFamily: Fonts.body, marginTop: 2, textAlign: 'center' },
  menuSection: { padding: Spacing.lg, gap: Spacing.sm }, menuItem: { minHeight: 64, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.xl, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.slate100, ...Shadow.sm, gap: Spacing.md }, menuIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' }, menuLabel: { flex: 1, fontSize: 15, fontFamily: Fonts.bodyMed, color: TextColors.primary }, count: { minWidth: 24, height: 24, paddingHorizontal: 6, borderRadius: 12, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center' }, countText: { color: Colors.white, fontSize: 11, fontFamily: Fonts.bodySemi },
  logoutItem: { minHeight: 60, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF1F2', borderRadius: Radius.xl, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.red100, marginTop: Spacing.xs, gap: Spacing.md }, logoutLabel: { flex: 1, fontSize: 15, fontFamily: Fonts.bodyMed, color: TextColors.danger },
});
