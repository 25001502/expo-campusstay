import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { formatApplicationDate, getSubmittedApplicationSummary } from '../application';
import { formatMonthlyRent, getBookingTab } from '../bookings';
import { Btn, ErrorState, ScreenHeader, StatusBadge } from '../components/UI';
import { RemoteImage } from '../components/RemoteImage';
import type { RootStackParamList } from '../navigation/types';
import { useApplications } from '../state/ApplicationContext';
import { Colors, Fonts, Radius, Shadow, Spacing, StatusColors, TextColors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AppStatus'>;

const localMilestones = [
  { label: 'Application saved', state: 'done' as const, sub: 'Available in this app session only' },
  { label: 'Document categories selected', state: 'done' as const, sub: 'No files were uploaded or verified' },
  { label: 'Provider review', state: 'pending' as const, sub: 'No provider has received this application' },
  { label: 'Decision', state: 'pending' as const, sub: 'No decision has been made' },
  { label: 'Booking', state: 'pending' as const, sub: 'This application is not a booking' },
];

export default function AppStatusScreen({ navigation, route }: Props) {
  const { property, applicationId, sampleReference, sampleRoom, sampleStatus } = route.params;
  const insets = useSafeAreaInsets();
  const { getApplication } = useApplications();
  const application = applicationId ? getApplication(applicationId) : undefined;
  const summary = application ? getSubmittedApplicationSummary(application, property) : undefined;
  const missingLocalApplication = !!applicationId && !summary;
  const missingReference = !applicationId && !sampleReference;
  const bookingTab = getBookingTab(sampleStatus);
  const returnToBookings = () => navigation.popTo('Main', { screen: 'Bookings', params: { section: applicationId ? 'Applications' : bookingTab } });

  if (missingLocalApplication || missingReference) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <ScreenHeader title="Application Status" onBack={() => navigation.goBack()} />
        <View style={styles.missingState}>
          <ErrorState
            title="Application unavailable"
            message={missingLocalApplication ? 'This session-only application may have expired after the app restarted. Start a new application from a property.' : 'This application record is missing its reference information.'}
            retryLabel="Go to Bookings"
            onRetry={returnToBookings}
          />
        </View>
      </View>
    );
  }

  const isLocalApplication = !!summary;
  const dateLabel = summary
    ? formatApplicationDate(summary.submittedAt)
    : 'Date unavailable';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <ScreenHeader title={isLocalApplication ? 'Application Status' : 'Booking Record'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingLeft: insets.left + Spacing.lg, paddingRight: insets.right + Spacing.lg, paddingBottom: insets.bottom + Spacing.xxl }]}>
        {isLocalApplication ? (
          <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.successBanner}>
            <Text style={styles.successTitle}>Application saved</Text>
            <Text style={styles.successText}>Saved in this session. No accommodation provider received it.</Text>
          </View>
        ) : (
          <View style={styles.sampleBanner}><Text style={styles.sampleText}>Illustrative booking record. This is not an actual stay or booking confirmation.</Text></View>
        )}

        <View style={styles.propertyCard}>
          <RemoteImage source={property.images?.[0] ? { uri: property.images[0] } : null} style={styles.propertyImage} accessibilityLabel={`${property.name} accommodation`} fallbackLabel={`${property.name} image unavailable`} />
          <View style={styles.propertyInfo}>
            <Text accessibilityRole="header" style={styles.propertyName}>{property.name}</Text>
            <Text style={styles.propertyCity}>{property.city}</Text>
            {summary ? <Text style={styles.roomText}>{summary.roomType} · {formatMonthlyRent(summary.roomPrice)}</Text> : sampleRoom ? <Text style={styles.roomText}>{sampleRoom}</Text> : null}
            <Text style={styles.appId}>{isLocalApplication ? 'Application ID: ' : 'Record reference: '}<Text style={styles.appIdValue}>{summary?.id ?? sampleReference}</Text></Text>
            {isLocalApplication ? <Text style={styles.dateText}>Created: {dateLabel}</Text> : null}
            <StatusBadge label={summary?.statusLabel ?? (bookingTab === 'Applications' ? 'Status unavailable' : bookingTab)} variant={isLocalApplication ? 'blue' : 'amber'} />
          </View>
        </View>

        {isLocalApplication ? <View style={styles.timelineCard}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Application Progress</Text>
          {localMilestones.map((milestone, index) => {
            const done = milestone.state === 'done';
            return (
              <View key={milestone.label} accessible accessibilityLabel={`${milestone.label}. ${milestone.sub}`} style={styles.milestoneRow}>
                <View style={styles.milestoneLeft}>
                  <View style={[styles.milestoneCircle, done && styles.milestoneDone]}>
                    {done ? <Text style={styles.milestoneCheck}>✓</Text> : <View style={styles.milestoneDot} />}
                  </View>
                  {index < localMilestones.length - 1 ? <View style={[styles.milestoneLine, done && styles.milestoneLineDone]} /> : null}
                </View>
                <View style={styles.milestoneContent}>
                  <Text style={[styles.milestoneLabel, done && styles.milestoneLabelDone]}>{milestone.label}</Text>
                  <Text style={styles.milestoneSub}>{milestone.sub}</Text>
                </View>
              </View>
            );
          })}
        </View> : null}

        <View style={styles.actions}>
          <Btn variant="secondary" onPress={() => navigation.navigate('Property', { property })} style={styles.actionButton}>View Property</Btn>
          <Btn onPress={returnToBookings} style={styles.actionButton}>{isLocalApplication ? 'My Applications' : 'My Bookings'}</Btn>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, gap: Spacing.md },
  missingState: { flex: 1, padding: Spacing.xl, justifyContent: 'center' },
  successBanner: { padding: Spacing.lg, gap: Spacing.xs, borderRadius: Radius.xl, backgroundColor: StatusColors.green.background },
  successTitle: { fontSize: 16, lineHeight: 22, fontFamily: Fonts.heading, color: StatusColors.green.foreground },
  successText: { fontSize: 13, lineHeight: 19, fontFamily: Fonts.body, color: StatusColors.green.foreground },
  sampleBanner: { padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: StatusColors.amber.background },
  sampleText: { fontSize: 13, lineHeight: 19, fontFamily: Fonts.body, color: StatusColors.amber.foreground },
  propertyCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, padding: Spacing.md, backgroundColor: Colors.white, borderRadius: Radius.xl, ...Shadow.sm },
  propertyImage: { width: 72, height: 72, borderRadius: Radius.lg, backgroundColor: Colors.slate200 },
  propertyInfo: { flex: 1, minWidth: 0, gap: 4, alignItems: 'flex-start' },
  propertyName: { fontSize: 16, lineHeight: 22, fontFamily: Fonts.heading, color: TextColors.primary },
  propertyCity: { fontSize: 13, fontFamily: Fonts.body, color: TextColors.muted },
  roomText: { fontSize: 13, lineHeight: 19, fontFamily: Fonts.bodyMed, color: TextColors.secondary },
  appId: { fontSize: 12, lineHeight: 18, fontFamily: Fonts.body, color: TextColors.muted },
  appIdValue: { fontFamily: Fonts.bodySemi, color: TextColors.secondary },
  dateText: { fontSize: 12, lineHeight: 18, fontFamily: Fonts.body, color: TextColors.muted },
  timelineCard: { padding: Spacing.xl, backgroundColor: Colors.white, borderRadius: Radius.xl, ...Shadow.sm },
  sectionTitle: { fontSize: 17, fontFamily: Fonts.heading, color: TextColors.primary, marginBottom: Spacing.lg },
  milestoneRow: { flexDirection: 'row', gap: Spacing.md },
  milestoneLeft: { alignItems: 'center' },
  milestoneCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.slate200, alignItems: 'center', justifyContent: 'center' },
  milestoneDone: { backgroundColor: Colors.blue },
  milestoneActive: { backgroundColor: Colors.amber },
  milestoneCheck: { color: Colors.white, fontSize: 13, fontFamily: Fonts.bodySemi },
  milestoneDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.slate400 },
  milestoneDotActive: { backgroundColor: Colors.white },
  milestoneLine: { width: 2, flex: 1, minHeight: 28, marginVertical: 4, backgroundColor: Colors.slate200 },
  milestoneLineDone: { backgroundColor: Colors.blue100 },
  milestoneContent: { flex: 1, minWidth: 0, paddingBottom: Spacing.xxl },
  milestoneLabel: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.bodyMed, color: Colors.slate500 },
  milestoneLabelDone: { color: TextColors.primary },
  milestoneLabelActive: { color: StatusColors.amber.foreground, fontFamily: Fonts.bodySemi },
  milestoneSub: { fontSize: 12, lineHeight: 18, fontFamily: Fonts.body, color: TextColors.muted, marginTop: 2 },
  milestoneSubActive: { color: StatusColors.amber.foreground },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  actionButton: { flexGrow: 1, minWidth: 150 },
});
