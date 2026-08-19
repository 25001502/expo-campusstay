import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Colors, Fonts, Radius, Shadow } from '../theme';
import { Badge, Btn } from '../components/UI';

type Props = NativeStackScreenProps<RootStackParamList, 'AppStatus'>;

const milestones = [
  { label: 'Application Submitted', done: true, active: false, sub: 'Completed' },
  { label: 'Documents Verified', done: true, active: false, sub: 'Completed' },
  { label: 'Property Manager Reviewing', done: false, active: true, sub: 'In progress — usually 1–2 business days' },
  { label: 'Decision', done: false, active: false, sub: '' },
  { label: 'Booking Confirmed', done: false, active: false, sub: '' },
];

export default function AppStatusScreen({ navigation, route }: Props) {
  const { property } = route.params;
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Application Status</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Property card */}
        <View style={styles.propertyCard}>
          <Image source={{ uri: property.images[0] }} style={styles.propertyImage} contentFit="cover" />
          <View style={styles.propertyInfo}>
            <Text style={styles.propertyName}>{property.name}</Text>
            <Text style={styles.propertyCity}>{property.city}</Text>
            <Text style={styles.appId}>
              Application ID: <Text style={styles.appIdVal}>#CS-20481</Text>
            </Text>
            <Badge label="Under Review" variant="amber" />
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.sectionTitle}>Application Progress</Text>
          {milestones.map((m, i) => (
            <View key={m.label} style={styles.milestoneRow}>
              <View style={styles.milestoneLeft}>
                <View style={[styles.milestoneCircle, m.done && styles.milestoneDone, m.active && styles.milestoneActive]}>
                  {m.done ? (
                    <Text style={styles.milestoneCheck}>✓</Text>
                  ) : (
                    <View style={[styles.milestoneDot, m.active && styles.milestoneDotActive]} />
                  )}
                </View>
                {i < milestones.length - 1 && (
                  <View style={[styles.milestoneLine, m.done && styles.milestoneLineDone]} />
                )}
              </View>
              <View style={styles.milestoneContent}>
                <Text style={[styles.milestoneLabel, m.done && styles.milestoneLabelDone, m.active && styles.milestoneLabelActive]}>
                  {m.label}
                </Text>
                {m.sub ? <Text style={[styles.milestoneSub, m.active && styles.milestoneSubActive]}>{m.sub}</Text> : null}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Btn variant="secondary" onPress={() => (navigation as any).navigate('Messages')} style={{ flex: 1 }}>
            Message Manager
          </Btn>
          <Btn onPress={() => (navigation as any).navigate('Bookings')} style={{ flex: 1 }}>
            My Bookings
          </Btn>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  backText: { fontSize: 22, color: Colors.slate600, width: 24 },
  topTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
  },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  propertyCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 14,
    ...Shadow.sm,
  },
  propertyImage: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    backgroundColor: Colors.slate200,
  },
  propertyInfo: { flex: 1, gap: 4 },
  propertyName: {
    fontSize: 15,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
  },
  propertyCity: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.slate500,
  },
  appId: { fontSize: 12, fontFamily: Fonts.body, color: Colors.slate400 },
  appIdVal: { fontFamily: Fonts.bodySemi, color: Colors.slate700 },
  timelineCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 20,
    ...Shadow.sm,
    gap: 0,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
    marginBottom: 16,
  },
  milestoneRow: { flexDirection: "row", gap: 14 },
  milestoneLeft: { alignItems: "center" },
  milestoneCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.slate200,
    alignItems: "center",
    justifyContent: "center",
  },
  milestoneDone: { backgroundColor: Colors.blue },
  milestoneActive: { backgroundColor: Colors.amber },
  milestoneCheck: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: Fonts.bodySemi,
  },
  milestoneDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.slate400,
  },
  milestoneDotActive: { backgroundColor: Colors.white },
  milestoneLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.slate200,
    marginVertical: 4,
    minHeight: 28,
  },
  milestoneLineDone: { backgroundColor: "#BFDBFE" },
  milestoneContent: { flex: 1, paddingBottom: 24 },
  milestoneLabel: {
    fontSize: 14,
    fontFamily: Fonts.bodyMed,
    color: Colors.slate400,
  },
  milestoneLabelDone: { color: Colors.slate900 },
  milestoneLabelActive: { color: Colors.amber600, fontFamily: Fonts.bodySemi },
  milestoneSub: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.slate400,
    marginTop: 2,
  },
  milestoneSubActive: { color: Colors.amber600 },
  actions: { flexDirection: "row", gap: 12 },
});
