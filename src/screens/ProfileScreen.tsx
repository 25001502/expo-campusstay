import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StudentTabScreenProps } from '../navigation/types';
import { useApplications } from '../state/ApplicationContext';
import { useCommunication } from '../state/CommunicationContext';
import { useFavorites } from '../state/FavoritesContext';
import { useProfile } from '../state/ProfileContext';
import { Colors, Fonts, Interaction, Radius, Shadow, Spacing, TextColors } from '../theme';

type Props = StudentTabScreenProps<'Profile'>;
const sections = [
  { title: 'Personal Information', route: 'PersonalInformation', icon: 'person-outline', color: '#1976D2', bg: '#E3F2FD' },
  { title: 'My Documents', route: 'MyDocuments', icon: 'document-text-outline', color: '#8E44AD', bg: '#F3E5F5' },
  { title: 'Notifications', route: 'Notifications', icon: 'notifications-outline', color: '#B45309', bg: Colors.amber100 },
  { title: 'Security', route: 'Security', icon: 'lock-closed-outline', color: '#4B5563', bg: Colors.slate100 },
  { title: 'Help & Support', route: 'HelpSupport', icon: 'help-circle-outline', color: '#1976D2', bg: '#E3F2FD' },
  { title: 'Terms & Privacy', route: 'TermsPrivacy', icon: 'clipboard-outline', color: '#64748B', bg: Colors.slate100 },
] as const;

export default function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const isFocused = useIsFocused();
  const stackStatistics = fontScale >= 1.5 && width - insets.left - insets.right < 600;
  const { profile, resetProfile } = useProfile();
  const { applications, clearApplications } = useApplications();
  const { favoriteIds, resetFavorites } = useFavorites();
  const { unreadNotificationCount, resetCommunication } = useCommunication();
  const fullName = profile.fullName.trim();
  const statistics = [
    { label: 'Applications', value: applications.length, hint: 'Opens your applications', onPress: () => navigation.navigate('Bookings', { section: 'Applications' }) },
    { label: 'Saved', value: favoriteIds.length, hint: 'Opens your saved properties', onPress: () => navigation.navigate('Favorites') },
    { label: 'Unread', value: unreadNotificationCount, hint: 'Opens notifications', onPress: () => navigation.navigate('Notifications') },
  ];
  const confirmLogout = () => Alert.alert(
    'Log Out',
    'Are you sure you want to log out?',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => {
        clearApplications();
        resetFavorites();
        resetCommunication();
        resetProfile();
        navigation.replace('Login');
      } },
    ],
  );
  return (
    <View style={[styles.safeArea, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
    {isFocused ? <StatusBar style="light" /> : null}
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: Spacing.xxl + insets.bottom }} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { paddingTop: Spacing.lg }]}>
        <View importantForAccessibility="no-hide-descendants" style={styles.avatar}>{fullName ? <Text maxFontSizeMultiplier={1.3} style={styles.avatarText}>{fullName.split(/\s+/).slice(0, 2).map((word) => Array.from(word)[0]).join('').toUpperCase()}</Text> : <Ionicons name="person-outline" size={30} color={Colors.white} />}</View>
        <Text accessibilityRole="header" style={styles.name}>{fullName || 'Your profile'}</Text>
        <Text style={styles.subtitle}>{fullName ? 'Personal information' : 'Add your personal details'}</Text>
        <View style={[styles.statsRow, stackStatistics && styles.statsStack]}>
          {statistics.map((item) => <TouchableOpacity key={item.label} accessibilityRole="button" accessibilityLabel={`${item.value} ${item.label}`} accessibilityHint={item.hint} activeOpacity={Interaction.pressedOpacity} onPress={item.onPress} style={stackStatistics ? { ...styles.statItem, ...styles.statItemStacked } : styles.statItem}><Text style={styles.statValue}>{item.value}</Text><Text style={styles.statLabel}>{item.label}</Text></TouchableOpacity>)}
        </View>
      </View>
      <View style={styles.menuSection}>
        {sections.map((item) => {
          const count = item.title === 'Notifications' && unreadNotificationCount > 0
            ? <View style={[styles.count, fontScale >= 1.5 && styles.stackedCount]}><Text style={styles.countText}>{unreadNotificationCount}</Text></View>
            : null;
          return <TouchableOpacity key={item.title} accessibilityRole="button" accessibilityLabel={item.title + (item.title === 'Notifications' && unreadNotificationCount ? ', ' + unreadNotificationCount + ' unread' : '')} accessibilityHint={`Opens ${item.title}`} style={styles.menuItem} activeOpacity={Interaction.pressedOpacity} onPress={() => navigation.navigate(item.route)}>
            <View importantForAccessibility="no-hide-descendants" style={[styles.menuIcon, { backgroundColor: item.bg }]}><Ionicons name={item.icon} size={21} color={item.color} /></View>
            <View style={styles.menuCopy}><Text style={styles.menuLabel}>{item.title}</Text>{fontScale >= 1.5 ? count : null}</View>
            {fontScale < 1.5 ? count : null}
            <Ionicons importantForAccessibility="no-hide-descendants" name="chevron-forward-outline" size={20} color={Colors.slate400} style={styles.chevron} />
          </TouchableOpacity>;
        })}
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Log Out" accessibilityHint="Opens a confirmation before logging out and clearing current session data" style={styles.logoutItem} activeOpacity={Interaction.pressedOpacity} onPress={confirmLogout}><Ionicons importantForAccessibility="no-hide-descendants" name="log-out-outline" size={24} color={Colors.red600} /><Text style={styles.logoutLabel}>Log Out</Text></TouchableOpacity>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.navy },
  statsStack: { flexDirection: 'column' },
  statItemStacked: { flex: 0 },
  chevron: { flexShrink: 0 },
  menuCopy: { flex: 1, minWidth: 0, gap: Spacing.sm },
  stackedCount: { alignSelf: 'flex-start' },
  container: { flex: 1, backgroundColor: Colors.background }, header: { backgroundColor: Colors.navy, paddingHorizontal: Spacing.xxl, paddingBottom: Spacing.xxl, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl, alignItems: 'center' }, avatar: { width: 72, height: 72, borderRadius: 18, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg }, avatarText: { color: Colors.white, fontSize: 26, fontFamily: Fonts.heading }, name: { alignSelf: 'stretch', textAlign: 'center', color: Colors.white, fontSize: 22, lineHeight: 29, letterSpacing: -0.35, fontFamily: Fonts.heading, marginBottom: Spacing.xs }, subtitle: { alignSelf: 'stretch', textAlign: 'center', color: Colors.slate300, fontSize: 14, lineHeight: 21, fontFamily: Fonts.body, marginBottom: Spacing.xl },
  statsRow: { width: '100%', flexDirection: 'row', gap: Spacing.sm }, statItem: { flex: 1, minWidth: 0, minHeight: 44, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.md, borderRadius: Radius.xl }, statValue: { alignSelf: 'stretch', textAlign: 'center', color: Colors.white, fontSize: 20, lineHeight: 28, fontFamily: Fonts.heading }, statLabel: { alignSelf: 'stretch', color: Colors.slate300, fontSize: 11, lineHeight: 17, fontFamily: Fonts.body, marginTop: Spacing.xxs, textAlign: 'center' },
  menuSection: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: Spacing.lg, gap: Spacing.sm }, menuItem: { minHeight: 64, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.xl, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderWidth: 1, borderColor: Colors.slate100, ...Shadow.sm, gap: Spacing.md }, menuIcon: { width: 40, height: 40, flexShrink: 0, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' }, menuLabel: { minWidth: 0, fontSize: 15, lineHeight: 22, fontFamily: Fonts.bodyMed, color: TextColors.primary }, count: { minWidth: 24, minHeight: 24, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radius.full, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center' }, countText: { color: Colors.white, fontSize: 11, lineHeight: 16, fontFamily: Fonts.bodySemi },
  logoutItem: { minHeight: 60, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF1F2', borderRadius: Radius.xl, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.red100, marginTop: Spacing.xs, gap: Spacing.md }, logoutLabel: { flex: 1, fontSize: 15, lineHeight: 22, fontFamily: Fonts.bodyMed, color: TextColors.danger },
});
