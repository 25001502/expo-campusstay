import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Colors, Fonts, Radius, Shadow } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Main'>;

const sections = [
  { label: 'Personal Information', icon: '👤', color: Colors.blue100, iconColor: Colors.blue },
  { label: 'My Documents', icon: '📄', color: Colors.purple100, iconColor: Colors.purple },
  { label: 'Payment Methods', icon: '💳', color: Colors.green100, iconColor: Colors.green600 },
  { label: 'Notifications', icon: '🔔', color: Colors.amber100, iconColor: Colors.amber600 },
  { label: 'Security', icon: '🔒', color: Colors.slate100, iconColor: Colors.slate600 },
  { label: 'Help & Support', icon: '❓', color: '#E0F2FE', iconColor: '#0284C7' },
  { label: 'Terms & Privacy', icon: '📋', color: Colors.slate100, iconColor: Colors.slate600 },
];

export default function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>SD</Text>
        </View>
        <Text style={styles.name}>Siyanda Dlamini</Text>
        <Text style={styles.uni}>University of Venda</Text>
        <Text style={styles.studentNo}>Student No. 2021012345</Text>
        <View style={styles.statsRow}>
          {[{ label: 'Bookings', val: '2' }, { label: 'Saved', val: '4' }, { label: 'Active', val: '1' }].map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statVal}>{s.val}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.menuSection}>
        {sections.map(({ label, icon, color, iconColor }) => (
          <TouchableOpacity key={label} style={styles.menuItem} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: color }]}>
              <Text style={styles.menuIconText}>{icon}</Text>
            </View>
            <Text style={styles.menuLabel}>{label}</Text>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.logoutItem}
          activeOpacity={0.7}
          onPress={() => (navigation as any).replace('Login')}
        >
          <View style={[styles.menuIcon, { backgroundColor: Colors.red100 }]}>
            <Text style={styles.menuIconText}>🚪</Text>
          </View>
          <Text style={styles.logoutLabel}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.navy,
    paddingHorizontal: 24,
    paddingBottom: 28,
    alignItems: "center",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: Colors.blue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { color: Colors.white, fontSize: 26, fontFamily: Fonts.heading },
  name: {
    color: Colors.white,
    fontSize: 22,
    fontFamily: Fonts.heading,
    marginBottom: 4,
  },
  uni: {
    color: Colors.slate300,
    fontSize: 14,
    fontFamily: Fonts.body,
    marginBottom: 2,
  },
  studentNo: {
    color: Colors.slate400,
    fontSize: 12,
    fontFamily: Fonts.body,
    marginBottom: 20,
  },
  statsRow: { flexDirection: "row", gap: 0 },
  statItem: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 12,
    borderRadius: 0,
  },
  statVal: { color: Colors.white, fontSize: 20, fontFamily: Fonts.heading },
  statLabel: {
    color: Colors.slate400,
    fontSize: 11,
    fontFamily: Fonts.body,
    marginTop: 2,
  },
  menuSection: { padding: 16, gap: 8 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadow.sm,
    gap: 12,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIconText: { fontSize: 18 },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.bodyMed,
    color: Colors.slate800,
  },
  menuChevron: { fontSize: 20, color: Colors.slate300 },
  logoutItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF1F2",
    borderRadius: Radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.red100,
    marginTop: 4,
    gap: 12,
  },
  logoutLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.bodyMed,
    color: Colors.red600,
  },
});
