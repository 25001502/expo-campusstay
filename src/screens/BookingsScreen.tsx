import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSubmittedApplicationSummary, type SubmittedApplication } from '../application';
import { Btn, EmptyState, StatusBadge } from '../components/UI';
import { RemoteImage } from '../components/RemoteImage';
import { properties, type Property } from '../data';
import type { StudentTabScreenProps } from '../navigation/types';
import { useApplications } from '../state/ApplicationContext';
import { Colors, Fonts, Radius, Shadow, Spacing, TextColors } from '../theme';

type Props = StudentTabScreenProps<'Bookings'>;
type BookingTab = 'Applications' | 'Upcoming' | 'Active' | 'Completed' | 'Cancelled';
type SampleBookingStatus = Exclude<BookingTab, 'Applications'>;
type SampleBooking = { property: Property; room: string; moveIn: string; rent: number; status: SampleBookingStatus; ref: string };

const TABS: BookingTab[] = ['Applications', 'Upcoming', 'Active', 'Completed', 'Cancelled'];
const sampleBookings: SampleBooking[] = [
  { property: properties[0], room: 'Private Room', moveIn: '1 Feb 2025', rent: 3500, status: 'Active', ref: '#CS-20481' },
  { property: properties[1], room: 'Studio Room', moveIn: '1 Aug 2025', rent: 5200, status: 'Upcoming', ref: '#CS-20522' },
  { property: properties[2], room: 'Shared Room', moveIn: '1 Mar 2024', rent: 2600, status: 'Completed', ref: '#CS-19845' },
];

export default function BookingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { applications } = useApplications();
  const [tab, setTab] = useState<BookingTab>('Applications');
  const applicationItems = useMemo(() => applications.flatMap((application) => {
    const property = properties.find((item) => item.id === application.propertyId);
    if (!property) return [];
    const summary = getSubmittedApplicationSummary(application, property);
    return summary ? [{ application, property, summary }] : [];
  }), [applications]);
  const bookings = tab === 'Applications' ? [] : sampleBookings.filter((booking) => booking.status === tab);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.headerTitle}>My Bookings</Text>
        <Text style={styles.headerSub}>Applications are separate from bookings. Provider updates and payments are not connected.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((item) => (
            <TouchableOpacity
              key={item}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === item }}
              onPress={() => setTab(item)}
              style={[styles.tab, tab === item && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {tab === 'Applications' ? (
        <FlatList
          data={applicationItems}
          keyExtractor={(item) => item.application.id}
          contentContainerStyle={[styles.list, !applicationItems.length && styles.emptyList]}
          ListEmptyComponent={<EmptyState icon={<Ionicons name="document-text-outline" size={48} color={Colors.slate500} />} title="No applications" description="Applications created during this app session will appear here. They are not bookings." actionLabel="Explore Accommodation" onAction={() => navigation.navigate('Explore')} />}
          renderItem={({ item }) => <ApplicationCard application={item.application} property={item.property} onView={() => navigation.navigate('AppStatus', { property: item.property, applicationId: item.application.id })} />}
        />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.ref}
          contentContainerStyle={[styles.list, !bookings.length && styles.emptyList]}
          ListEmptyComponent={<EmptyState icon={<Ionicons name="home-outline" size={48} color={Colors.slate500} />} title={`No ${tab.toLowerCase()} bookings`} description={`${tab} bookings will appear here.`} />}
          renderItem={({ item }) => <BookingCard booking={item} onView={() => navigation.navigate('AppStatus', {
            property: item.property,
            sampleReference: item.ref,
            sampleRoom: item.room,
            sampleStatus: item.status,
          })} />}
        />
      )}
    </View>
  );
}

function ApplicationCard({ application, property, onView }: { application: SubmittedApplication; property: Property; onView: () => void }) {
  const summary = getSubmittedApplicationSummary(application, property);
  if (!summary) return null;
  const submitted = new Date(summary.submittedAt).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <View style={styles.card}>
      <View style={styles.cardImageWrapper}>
        <RemoteImage source={property.images[0] ? { uri: property.images[0] } : null} style={styles.cardImage} accessibilityLabel={`${property.name} accommodation`} fallbackLabel={`${property.name} image unavailable`} />
        <View style={styles.cardBadge}><StatusBadge label={summary.statusLabel} variant="blue" /></View>
      </View>
      <View style={styles.cardBody}>
        <Text accessibilityRole="header" style={styles.cardName}>{summary.propertyName}</Text>
        <Text style={styles.cardMeta}>{summary.roomType} · R{summary.roomPrice.toLocaleString()}/month</Text>
        <Text style={styles.cardRef}>{summary.id}</Text>
        <Text style={styles.cardDate}>Created {submitted}</Text>
        <Text style={styles.notBooking}>Saved for this session · No booking confirmed</Text>
        <Btn variant="secondary" onPress={onView} style={styles.viewButton}>View Application Status</Btn>
      </View>
    </View>
  );
}

function BookingCard({ booking, onView }: { booking: SampleBooking; onView: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardImageWrapper}>
        <RemoteImage source={booking.property.images[0] ? { uri: booking.property.images[0] } : null} style={styles.cardImage} accessibilityLabel={`${booking.property.name} accommodation`} fallbackLabel={`${booking.property.name} image unavailable`} />
        <View style={styles.cardBadge}><StatusBadge label={booking.status} /></View>
      </View>
      <View style={styles.cardBody}>
        <Text accessibilityRole="header" style={styles.cardName}>{booking.property.name}</Text>
        <Text style={styles.cardMeta}>{booking.room} · Move-in {booking.moveIn}</Text>
        <Text style={styles.cardRef}>{booking.ref} · On-device record</Text>
        <View style={styles.cardFooter}>
          <View><Text style={styles.cardPrice}>R{booking.rent.toLocaleString()}</Text><Text style={styles.cardPriceSub}>/month</Text></View>
          <Btn variant="secondary" onPress={onView} style={styles.viewButton}>View Details</Btn>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.white, paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.slate100 },
  headerTitle: { fontSize: 24, lineHeight: 31, fontFamily: Fonts.heading, color: TextColors.primary },
  headerSub: { fontSize: 12, lineHeight: 18, fontFamily: Fonts.body, color: TextColors.muted, marginTop: Spacing.xs, marginBottom: Spacing.sm },
  tabs: { alignItems: 'stretch', gap: Spacing.sm },
  tab: { minWidth: 92, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.blue },
  tabText: { fontSize: 12, fontFamily: Fonts.bodyMed, color: TextColors.muted },
  tabTextActive: { color: Colors.blue, fontFamily: Fonts.bodySemi },
  list: { padding: Spacing.lg, gap: 14, paddingBottom: 100 },
  emptyList: { flexGrow: 1 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.xl, overflow: 'hidden', ...Shadow.sm },
  cardImageWrapper: { height: 120, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardBadge: { position: 'absolute', top: 10, left: 10 },
  cardBody: { padding: Spacing.lg, gap: 5 },
  cardName: { fontSize: 16, lineHeight: 22, fontFamily: Fonts.heading, color: TextColors.primary },
  cardMeta: { fontSize: 13, lineHeight: 19, fontFamily: Fonts.body, color: TextColors.secondary },
  cardRef: { fontSize: 11, lineHeight: 17, fontFamily: Fonts.bodySemi, color: TextColors.muted },
  cardDate: { fontSize: 11, lineHeight: 17, fontFamily: Fonts.body, color: TextColors.muted },
  notBooking: { fontSize: 12, lineHeight: 18, fontFamily: Fonts.bodyMed, color: Colors.blue, marginVertical: Spacing.xs },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm },
  cardPrice: { fontSize: 18, fontFamily: Fonts.heading, color: TextColors.primary },
  cardPriceSub: { fontSize: 12, color: TextColors.muted, fontFamily: Fonts.body },
  viewButton: { alignSelf: 'flex-start', marginTop: Spacing.sm, minWidth: 150 },
});
