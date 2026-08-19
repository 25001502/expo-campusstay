import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Colors, Fonts, Radius, Shadow } from '../theme';
import { Badge, Btn } from '../components/UI';
import { properties } from '../data';

type Props = NativeStackScreenProps<RootStackParamList, 'Main'>;
type TabType = 'Upcoming' | 'Active' | 'Completed' | 'Cancelled';
const TABS: TabType[] = ['Upcoming', 'Active', 'Completed', 'Cancelled'];

const bookings = [
  { property: properties[0], room: 'Private Room', moveIn: '1 Feb 2025', rent: 3500, status: 'Active', ref: '#CS-20481' },
  { property: properties[1], room: 'Studio Room', moveIn: '1 Aug 2025', rent: 5200, status: 'Upcoming', ref: '#CS-20522' },
  { property: properties[2], room: 'Shared Room', moveIn: '1 Mar 2024', rent: 2600, status: 'Completed', ref: '#CS-19845' },
];

const statusVariant: Record<string, 'green' | 'blue' | 'gray' | 'red'> = {
  Active: 'green',
  Upcoming: 'blue',
  Completed: 'gray',
  Cancelled: 'red',
};

export default function BookingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabType>('Active');
  const filtered = bookings.filter((b) => b.status === tab);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={styles.tabs}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tab, tab === t && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏠</Text>
            <Text style={styles.emptyTitle}>No {tab.toLowerCase()} bookings</Text>
            <Text style={styles.emptySub}>Your {tab.toLowerCase()} bookings will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardImageWrapper}>
              <Image source={{ uri: item.property.images[0] }} style={styles.cardImage} contentFit="cover" />
              <View style={styles.cardBadge}>
                <Badge label={item.status} variant={statusVariant[item.status] ?? 'gray'} />
              </View>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardName}>{item.property.name}</Text>
              <Text style={styles.cardMeta}>{item.room} · Move-in {item.moveIn}</Text>
              <Text style={styles.cardRef}>{item.ref}</Text>
              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.cardPrice}>R{item.rent.toLocaleString()}</Text>
                  <Text style={styles.cardPriceSub}>/month</Text>
                </View>
                <Btn
                  variant="secondary"
                  onPress={() => (navigation as any).navigate('AppStatus', { property: item.property })}
                  style={styles.viewBtn}
                >
                  View Details
                </Btn>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
    marginBottom: 14,
  },
  tabs: { flexDirection: "row" },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: Colors.blue },
  tabText: { fontSize: 11, fontFamily: Fonts.bodyMed, color: Colors.slate400 },
  tabTextActive: { color: Colors.blue, fontFamily: Fonts.bodySemi },
  list: { padding: 16, gap: 14, paddingBottom: 100 },
  empty: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Fonts.heading,
    color: Colors.slate700,
  },
  emptySub: { fontSize: 13, fontFamily: Fonts.body, color: Colors.slate400 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    overflow: "hidden",
    ...Shadow.sm,
  },
  cardImageWrapper: { height: 120, position: "relative" },
  cardImage: { width: "100%", height: "100%" },
  cardBadge: { position: "absolute", top: 10, left: 10 },
  cardBody: { padding: 16, gap: 4 },
  cardName: { fontSize: 16, fontFamily: Fonts.heading, color: Colors.slate900 },
  cardMeta: { fontSize: 13, fontFamily: Fonts.body, color: Colors.slate500 },
  cardRef: { fontSize: 11, fontFamily: Fonts.body, color: Colors.slate400 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  cardPrice: {
    fontSize: 18,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
  },
  cardPriceSub: {
    fontSize: 12,
    color: Colors.slate400,
    fontFamily: Fonts.body,
  },
  viewBtn: { paddingVertical: 10, paddingHorizontal: 16 },
});
