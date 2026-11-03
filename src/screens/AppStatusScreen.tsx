import React, { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { formatApplicationDate, getSubmittedApplicationSummary } from '../application';
import { DOCUMENT_CATEGORIES, getDocumentSummary } from '../documents';
import { fundingLabel, fundingStatusLabel, normalizeFunding, paymentDiscussionLabel } from '../funding';
import { formatMonthlyRent, getBookingTab } from '../bookings';
import { Btn, ErrorState, ScreenHeader, StatusBadge } from '../components/UI';
import { RemoteImage } from '../components/RemoteImage';
import type { RootStackParamList } from '../navigation/types';
import { useApplications } from '../state/ApplicationContext';
import { Colors, Fonts, Radius, Shadow, Spacing, StatusColors, TextColors } from '../theme';

import { properties as routeProperties } from '../data';
import { getRouteProperty } from '../navigation/routeProperty';

type Props = NativeStackScreenProps<RootStackParamList, 'AppStatus'>;

export default function AppStatusScreen({ navigation, route }: Props) {
  const { applicationId, sampleReference, sampleRoom, sampleStatus } = route.params ?? {};
  const suppliedProperty = getRouteProperty(route.params?.property);
  const property = suppliedProperty ?? routeProperties[0];
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale > 1.3;
  const { getApplication, refreshDocuments, documentStatus } = useApplications();
  const application = applicationId ? getApplication(applicationId) : undefined;
  useFocusEffect(useCallback(() => { if (application) void refreshDocuments(application.id, application.attachments ?? {}); }, [application, refreshDocuments]));
  const summary = application ? getSubmittedApplicationSummary(application, property) : undefined;
  const missingLocalApplication = !!applicationId && !summary;
  const missingReference = !applicationId && !sampleReference;
  const bookingTab = getBookingTab(sampleStatus);
  const returnToBookings = () => navigation.popTo('Main', { screen: 'Bookings', params: { section: applicationId ? 'Applications' : bookingTab } });

  if (!suppliedProperty || missingLocalApplication || missingReference) {
    return (
      <ScrollView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]} contentContainerStyle={{ flexGrow: 1 }}>
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
      </ScrollView>
    );
  }

  const documents = application ? getDocumentSummary(application.id, application.attachments, documentStatus) : undefined;
  const funding = normalizeFunding(summary?.funding);
  const evidence = application?.attachments?.funding;
  const evidenceStatus = evidence ? documents?.optional ? 'Attached locally' : 'File unavailable · Temporary reference unavailable' : 'Not attached · Optional';
  const isLocalApplication = !!summary;
  const dateLabel = summary
    ? formatApplicationDate(summary.submittedAt)
    : 'Date unavailable';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <ScreenHeader title={isLocalApplication ? 'Application Status' : 'Booking Record'} onBack={() => navigation.goBack()} />
      <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={[styles.scroll, { paddingLeft: insets.left + Spacing.lg, paddingRight: insets.right + Spacing.lg, paddingBottom: insets.bottom + Spacing.xxl }]}>
        {isLocalApplication ? (
          <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.successBanner}>
            <Text style={styles.successTitle}>Application saved</Text>
            <Text style={styles.successText}>Saved in this session. No accommodation provider received it.</Text>
          </View>
        ) : (
          <View style={styles.sampleBanner}><Text style={styles.sampleText}>Illustrative booking record. This is not an actual stay or booking confirmation.</Text></View>
        )}

        <View style={[styles.propertyCard, stacked && styles.stacked]}>
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

        {summary && application ? <>
          <View style={styles.timelineCard}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Funding information</Text>
            <View style={styles.fundingRows}>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Funding source</Text><Text style={styles.detailValue}>{fundingLabel(funding)}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>{funding.source === 'nsfas' ? 'Declared status' : 'Declaration'}</Text><Text style={styles.detailValue}>{fundingStatusLabel(funding)}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Supporting document</Text><Text style={styles.detailValue}>{evidenceStatus}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Payment discussion</Text><Text style={styles.detailValue}>{paymentDiscussionLabel(funding)}</Text></View>
            </View>
            <Text style={styles.milestoneSub}>{funding.source === 'nsfas' ? 'Student-provided · Not verified. ' : ''}No provider review or payment plan has been created. This is not a booking.</Text>
            <Btn variant="secondary" onPress={() => navigation.navigate('UpdateFunding', { applicationId: application.id })}>Update Funding Information</Btn>
          </View>
          <View style={styles.timelineCard}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Documents</Text>
            <Text style={styles.detailValue}>{documents?.required ?? 0} of {DOCUMENT_CATEGORIES.filter((category) => category.required).length} required attachments present</Text>
            <Text style={styles.detailValue}>{documents?.optional ?? 0} optional {documents?.optional === 1 ? 'attachment' : 'attachments'} present</Text>
            {documents?.missingRequired ? <Text style={styles.milestoneSub}>{documents.missingRequired} required {documents.missingRequired === 1 ? 'attachment missing' : 'attachments missing'} or unavailable</Text> : null}
            {documents?.unavailable ? <Text style={styles.milestoneSub}>File unavailable · {documents.unavailable} temporary {documents.unavailable === 1 ? 'reference' : 'references'} unavailable</Text> : null}
            <Btn variant="secondary" onPress={() => navigation.navigate('MyDocuments', { applicationId: application.id })}>View My Documents</Btn>
          </View>
        </> : null}

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
  scroll: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: Spacing.lg, gap: Spacing.md },
  stacked: { flexDirection: 'column' },
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
  timelineCard: { padding: Spacing.lg, gap: Spacing.md, backgroundColor: Colors.white, borderRadius: Radius.xl, ...Shadow.sm },
  sectionTitle: { fontSize: 17, lineHeight: 24, fontFamily: Fonts.heading, color: TextColors.primary },
  fundingRows: { gap: Spacing.sm },
  detailRow: { gap: Spacing.xs, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.slate100 },
  detailLabel: { fontFamily: Fonts.body, fontSize: 12, lineHeight: 18, color: TextColors.muted },
  detailValue: { fontFamily: Fonts.bodyMed, fontSize: 14, lineHeight: 21, color: TextColors.primary },
  milestoneSub: { fontSize: 12, lineHeight: 18, fontFamily: Fonts.body, color: TextColors.secondary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  actionButton: { flexGrow: 1, minWidth: 150 },
});
