import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Colors, Fonts, Radius, Shadow } from '../theme';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Main'>;

const sections = [
  {
    title: "Personal Information",
    icon: "person-outline",
    iconColor: "#1976D2",
    iconBg: "#E3F2FD",
  },
  {
    title: "My Documents",
    icon: "document-text-outline",
    iconColor: "#8E44AD",
    iconBg: "#F3E5F5",
  },
  {
    title: "Notifications",
    icon: "notifications-outline",
    iconColor: "#F4B400",
    iconBg: "#FFF4CC",
  },
  {
    title: "Security",
    icon: "lock-closed-outline",
    iconColor: "#4B5563",
    iconBg: "#F1F5F9",
  },
  {
    title: "Help & Support",
    icon: "help-circle-outline",
    iconColor: "#2196F3",
    iconBg: "#E3F2FD",
  },
  {
    title: "Terms & Privacy",
    icon: "clipboard-outline",
    iconColor: "#64748B",
    iconBg: "#F1F5F9",
  },
];

export default function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const handleSettingPress = (title: string) => {
    console.log(`${title} pressed`);
  };

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
          {[
            { label: 'Bookings', val: '2' },
            { label: 'Saved', val: '4' },
            { label: 'Active', val: '1' },
          ].map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statVal}>{s.val}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.menuSection}>
        {/* Settings */}
        {sections.map(({ title, icon, iconColor, iconBg }) => (
          <TouchableOpacity
            key={title}
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => handleSettingPress(title)}
          >
            <View
              style={[
                styles.menuIcon,
                { backgroundColor: iconBg },
              ]}
            >
              <Ionicons
                name={icon as keyof typeof Ionicons.glyphMap}
                size={21}
                color={iconColor}
              />
            </View>

            <Text style={styles.menuLabel}>{title}</Text>

            <Ionicons
              name="chevron-forward-outline"
              size={20}
              color={Colors.slate300}
            />
          </TouchableOpacity>
        ))}

        {/* LOG OUT - UNCHANGED */}
        <TouchableOpacity
          style={styles.logoutItem}
          activeOpacity={0.7}
          onPress={() => (navigation as any).replace('Login')}
        >
          <Text style={styles.headerIconText}>
            <Ionicons
              name="log-out-outline"
              size={24}
              color="#cc4646"
            />
          </Text>

          <Text style={styles.logoutLabel}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

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

  avatarText: {
    color: Colors.white,
    fontSize: 26,
    fontFamily: Fonts.heading,
  },

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

  statsRow: {
    flexDirection: "row",
    gap: 9,
    borderRadius: Radius.xl,
    overflow: "hidden",
  },


  statItem: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 12,
    borderRadius: Radius.xl,
    overflow: "hidden",
},

  headerIconText: {
    fontSize: 18,
  },

  notifDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.red500,
  },

  statVal: {
    color: Colors.white,
    fontSize: 20,
    fontFamily: Fonts.heading,
  },

  statLabel: {
    color: Colors.slate400,
    fontSize: 11,
    fontFamily: Fonts.body,
    marginTop: 2,
  },

  menuSection: {
    padding: 16,
    gap: 8,
  },

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

  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.bodyMed,
    color: Colors.slate800,
  },

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