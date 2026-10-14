import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatApplicationDate, getSubmittedApplicationSummary, type SubmittedApplication } from '../application';
import { BOOKING_TABS, formatMonthlyRent, getBookingItems, getBookingTab, getBookingTabOffset, type BookingRecord, type BookingTabLayout } from '../bookings';
import { Btn, EmptyState, StatusBadge } from '../components/UI';
import { RemoteImage } from '../components/RemoteImage';
import { properties, type Property } from '../data';
import type { StudentTabScreenProps } from '../navigation/types';
import { useApplications } from '../state/ApplicationContext';
import { getHistoricalRoomLabel } from '../rooms';
import { Colors, Fonts, Radius, Shadow, Spacing, TextColors } from '../theme';

type Props = StudentTabScreenProps<'Bookings'>;

export default function BookingsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { applications } = useApplications();
  const tab = getBookingTab(route.params?.section);
  const tabsRef = useRef<ScrollView>(null);
  const tabMeasurements = useRef<{ layouts: Partial<Record<typeof tab, BookingTabLayout>>; viewport: number; content: number; offset: number }>({ layouts: {}, viewport: 0, content: 0, offset: 0 });
  const revealTab = useCallback((selected = tab) => {
    const measured = tabMeasurements.current;
    const x = getBookingTabOffset(selected, measured.layouts, measured.viewport, measured.content, measured.offset);
    if (x !== undefined && Math.abs(x - measured.offset) > 0.5) {
      measured.offset = x;
      tabsRef.current?.scrollTo({ x, animated: false });
    }
  }, [tab]);
  useEffect(() => { revealTab(); }, [revealTab]);
  const applicationItems = useMemo(() => applications.flatMap((application) => {
    const property = properties.find((item) => item.id === application.propertyId);
    if (!property) return [];
    const summary = getSubmittedApplicationSummary(application, property);
    return summary ? [{ application, property, summary }] : [];
  }), [applications]);
  const bookings = getBookingItems(tab, properties);
  const listStyle = [styles.list, { paddingBottom: Math.max(insets.bottom, Spacing.xxl) }];
  const header = (
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.headerTitle}>My Bookings</Text>
      <Text style={styles.headerSub}>Your applications and accommodation records.</Text>
      <ScrollView ref={tabsRef} horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.tabs}
        onLayout={({ nativeEvent }) => { tabMeasurements.current.viewport = nativeEvent.layout.width; revealTab(); }}
        onContentSizeChange={(width) => { tabMeasurements.current.content = width; revealTab(); }}
        onScroll={({ nativeEvent }) => { tabMeasurements.current.offset = nativeEvent.contentOffset.x; }} scrollEventThrottle={16}>
        {BOOKING_TABS.map((item) => (
          <TouchableOpacity key={item} accessibilityRole="tab" accessibilityLabel={item}
            onLayout={({ nativeEvent }) => {
              tabMeasurements.current.layouts[item] = { x: nativeEvent.layout.x, width: nativeEvent.layout.width };
              revealTab();
            }}
            accessibilityState={{ selected: tab === item }} activeOpacity={0.7}
            onPress={() => {
              revealTab(item);
              navigation.setParams({ section: item });
            }}
            style={[styles.tab, tab === item && styles.tabActive]}>
            <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {tab !== 'Applications' ? <Text style={styles.referenceContext}>Illustrative booking records · Not actual stays</Text> : null}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      {isFocused ? <StatusBar style="dark" /> : null}
      {tab === 'Applications' ? (
        <FlatList
          data={applicationItems}
          keyExtractor={(item) => item.application.id}
          ListHeaderComponent={header}
          contentContainerStyle={[...listStyle, !applicationItems.length && styles.emptyList]}
          ListEmptyComponent={<EmptyState style={styles.emptyState} icon={<Ionicons name="document-text-outline" size={48} color={Colors.slate500} />} title="No applications yet" description="Find a place you love and start an application." actionLabel="Explore Accommodation" onAction={() => navigation.navigate('Explore')} />}
          renderItem={({ item }) => <ApplicationCard application={item.application} property={item.property} onView={() => navigation.navigate('AppStatus', { property: item.property, applicationId: item.application.id })} />}
        />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.booking.ref}
          ListHeaderComponent={header}
          contentContainerStyle={[...listStyle, !bookings.length && styles.emptyList]}
          ListEmptyComponent={<EmptyState style={styles.emptyState} icon={<Ionicons name="home-outline" size={48} color={Colors.slate500} />} title={`No ${tab.toLowerCase()} bookings`} description="No accommodation records in this category." />}
          renderItem={({ item }) => <BookingCard booking={item.booking} property={item.property} onView={() => navigation.navigate('AppStatus', {
            property: item.property,
            sampleReference: item.booking.ref,
            sampleRoom: getHistoricalRoomLabel(item.booking.room),
            sampleStatus: item.booking.status,
          })} />}
        />
      )}
    </View>
  );
}

export function ApplicationCard({ application, property, onView }: { application: SubmittedApplication; property: Property; onView: () => void }) {
  const summary = getSubmittedApplicationSummary(application, property);
  if (!summary) return null;
  return (
    <View style={styles.card}>
      <CardImage property={property} status={summary.statusLabel} />
      <View style={styles.cardBody}>
        <Text accessibilityRole="header" style={styles.cardName}>{summary.propertyName}</Text>
        <Text style={styles.cardMeta}>{summary.roomType} · {formatMonthlyRent(summary.roomPrice)}</Text>
        <Text style={styles.cardRef}>{summary.id}</Text>
        <Text style={styles.cardDate}>Created: {formatApplicationDate(summary.submittedAt)}</Text>
        <Text style={styles.notBooking}>Saved for this session · No booking confirmed</Text>
        <Btn variant="secondary" accessibilityLabel={`View application ${summary.id} for ${property.name}`} onPress={onView} style={styles.viewButton}>View Application Status</Btn>
      </View>
    </View>
  );
}

export function BookingCard({ booking, property, onView }: { booking: BookingRecord; property: Property; onView: () => void }) {
  return (
    <View style={styles.card}>
      <CardImage property={property} status={booking.status} />
      <View style={styles.cardBody}>
        <Text accessibilityRole="header" style={styles.cardName}>{property.name}</Text>
        <Text style={styles.cardMeta}>{getHistoricalRoomLabel(booking.room)}</Text>
        <Text style={styles.cardDate}>{booking.moveIn ? `Move-in: ${booking.moveIn}` : 'Move-in date unavailable'}</Text>
        <Text style={styles.cardRef}>{booking.ref}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardPrice}>{formatMonthlyRent(booking.rent)}</Text>
          <Btn variant="secondary" accessibilityLabel={`View ${booking.status.toLowerCase()} record ${booking.ref} for ${property.name}`} onPress={onView} style={styles.viewButton}>View Details</Btn>
        </View>
      </View>
    </View>
  );
}

function CardImage({ property, status }: { property: Property; status: string }) {
  const uri = property.images?.[0];
  return <View style={styles.cardImageWrapper}>
    <RemoteImage source={uri ? { uri } : null} style={styles.cardImage} accessibilityLabel={`${property.name} accommodation`} fallbackLabel={`${property.name} image unavailable`} />
    <View style={styles.cardBadge}><StatusBadge label={status} variant={status === 'Saved locally' ? 'blue' : undefined} /></View>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.white, paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.slate100 },
  headerTitle: { fontSize: 24, lineHeight: 31, letterSpacing: -0.4, fontFamily: Fonts.heading, color: TextColors.primary },
  headerSub: { fontSize: 13, lineHeight: 19, fontFamily: Fonts.body, color: TextColors.muted, marginTop: Spacing.xs, marginBottom: Spacing.md },
  tabs: { alignItems: 'stretch', gap: Spacing.xs, paddingRight: Spacing.xs },
  tab: { flexShrink: 0, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.blue },
  tabText: { fontSize: 13, lineHeight: 19, fontFamily: Fonts.bodyMed, color: TextColors.muted },
  tabTextActive: { color: Colors.blue, fontFamily: Fonts.bodySemi },
  list: { gap: Spacing.lg },
  emptyList: { flexGrow: 1 },
  emptyState: { flexGrow: 1, width: '100%', maxWidth: 440, alignSelf: 'center', paddingHorizontal: Spacing.xxl },
  card: { marginHorizontal: Spacing.lg, backgroundColor: Colors.white, borderRadius: Radius.xl, overflow: 'hidden', ...Shadow.sm },
  cardImageWrapper: { height: 120, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardBadge: { position: 'absolute', top: 10, left: 10, right: 10, alignItems: 'flex-start' },
  cardBody: { padding: Spacing.lg, gap: Spacing.xs },
  cardName: { fontSize: 16, lineHeight: 22, fontFamily: Fonts.heading, color: TextColors.primary },
  cardMeta: { fontSize: 13, lineHeight: 19, fontFamily: Fonts.body, color: TextColors.secondary },
  cardRef: { fontSize: 12, lineHeight: 18, fontFamily: Fonts.bodySemi, color: TextColors.muted },
  cardDate: { fontSize: 12, lineHeight: 18, fontFamily: Fonts.body, color: TextColors.muted },
  notBooking: { fontSize: 12, lineHeight: 18, fontFamily: Fonts.bodyMed, color: Colors.blue, marginVertical: Spacing.xs },
  referenceContext: { fontSize: 12, lineHeight: 18, fontFamily: Fonts.body, color: TextColors.muted, paddingVertical: Spacing.md },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm },
  cardPrice: { fontSize: 16, lineHeight: 23, fontFamily: Fonts.heading, color: TextColors.primary },
  viewButton: { alignSelf: 'flex-start', marginTop: Spacing.sm, minWidth: 150, maxWidth: '100%' },
});
