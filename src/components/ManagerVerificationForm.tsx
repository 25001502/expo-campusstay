import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Btn, Input } from './UI';
import { Feedback } from './Feedback';
import { SelectField } from './SelectField';
import { pickVerificationEvidence } from '../verification/evidence';
import { editable } from '../verification/domain';
import type { VerificationSnapshot, VerificationController } from '../verification/controller';
import { Colors, Fonts, Spacing, TextColors } from '../theme';

type Props = { value: VerificationSnapshot; controller: VerificationController; fullName: string; onWorkspace(): void; onHome(): void; onSignOut(): void; onHelp(): void };
export function ManagerVerificationForm({ value: v, controller, fullName, onWorkspace, onHome, onSignOut, onHelp }: Props) {
  const application = v.data?.application ?? null, busy = !!v.busy;
  const canEdit = editable(application), step = v.step;
  return <View style={styles.form}>
    <Feedback message={v.error} />
    {v.conflict ? <Btn variant="secondary" disabled={busy} onPress={() => { void controller.reload(); }}>Reload saved application and discard unsaved edits</Btn> : null}
    {v.notice ? <Feedback message={v.notice} tone="status" /> : null}
    {!canEdit && application ? <>
      <Text accessibilityRole="header" style={styles.heading}>{application.status === 'pending' ? 'Awaiting CampusStay review' : application.status === 'approved' ? 'Application approved' : 'Application not approved'}</Text>
      {application.status === 'pending' ? <Text style={styles.body}>Your manager verification is awaiting CampusStay review.</Text> : null}
      {application.submitted_at ? <Text style={styles.body}>Submitted: {new Date(application.submitted_at).toLocaleString()}</Text> : null}
      {application.reviewed_at ? <Text style={styles.body}>Reviewed: {new Date(application.reviewed_at).toLocaleString()}</Text> : null}
      {application.review_reason ? <Text style={styles.body}>{application.review_reason}</Text> : null}
      {v.data?.access.authorized ? <Btn disabled={busy} onPress={onWorkspace}>Open Manager Workspace</Btn> : <Text style={styles.body}>{v.data?.access.state === 'suspended' ? 'Your manager access is suspended.' : v.data?.access.state === 'revoked' ? 'Your manager access has been revoked.' : 'Manager Workspace remains locked. Application status alone does not grant access.'}</Text>}
      {application.status === 'rejected' ? <Btn variant="secondary" onPress={onHelp}>Get help with your decision</Btn> : null}
    </> : <>
      <Text accessibilityRole="header" style={styles.heading}>Step 2 · Manager verification</Text>
      <Text accessibilityLiveRegion="polite" style={styles.progress}>{['1 of 3 · Personal contact', '2 of 3 · Accommodation details', '3 of 3 · Supporting proof'][step]}</Text>
      {application?.status === 'needs_information' ? <Feedback message={`More information requested: ${application.review_reason ?? 'Please review your details.'}`} tone="status" /> : null}
      {step === 0 ? <>
        <Input label="Full name" value={fullName} disabled helperText="From your authenticated CampusStay account." />
        {!fullName.trim() ? <Feedback message="Your account needs a full name before submission. Contact support to update your account details." /> : null}
        <Input label="Contact phone number" required keyboardType="phone-pad" autoComplete="tel" maxLength={24} value={v.fields.phone} disabled={busy} error={v.errors.phone} onChangeText={(value) => controller.update('phone', value)} />
      </> : null}
      {step === 1 ? <>
        <Input label="Accommodation or business name" required maxLength={160} value={v.fields.business_name} disabled={busy} error={v.errors.business_name} onChangeText={(value) => controller.update('business_name', value)} />
        <Input label="Property address or location" required maxLength={500} multiline value={v.fields.property_location} disabled={busy} error={v.errors.property_location} onChangeText={(value) => controller.update('property_location', value)} />
        <SelectField label="Your relationship to the property" required value={v.fields.relationship} disabled={busy} error={v.errors.relationship} options={[{ value: 'owner', label: 'Owner' }, { value: 'authorised_manager', label: 'Authorised manager' }]} onChange={(value) => { if (value === 'owner' || value === 'authorised_manager') controller.update('relationship', value); }} />
      </> : null}
      {step === 2 ? <>
        <Text style={styles.body}>Supporting proof helps CampusStay review your authority to list and manage this accommodation. Choose proof of ownership or legal management authority. Do not include unnecessary identity numbers.</Text>
        <Text style={styles.body}>PDF, JPG or PNG · Up to 5 MB. Files are private and available only to you and authorised reviewers.</Text>
        {application?.proof ? <Text style={styles.file}>Uploaded: {application.proof.file_name}</Text> : <Text style={styles.body}>No supporting proof uploaded.</Text>}
        {v.selectedName ? <Text style={styles.file}>{v.selectedName}</Text> : null}
        {v.busy === 'uploading' || v.busy === 'choosing' ? <View accessibilityRole="progressbar" accessibilityLabel={v.busy === 'uploading' ? 'Uploading and checking supporting proof' : 'Preparing supporting proof'} style={styles.upload}><ActivityIndicator color={Colors.blue} /><Text style={styles.body}>{v.busy === 'uploading' ? 'Uploading and checking proof…' : 'Preparing supporting proof…'}</Text></View> : null}
        <Btn variant="secondary" disabled={busy} onPress={() => { void controller.choose(pickVerificationEvidence); }}>{application?.proof ? 'Replace supporting proof' : 'Choose supporting proof'}</Btn>
        <Text style={styles.body}>By submitting, you confirm that these details describe your accommodation and your authority to manage it. Submission does not approve your manager access.</Text>
        <Btn disabled={busy || !fullName.trim()} loading={v.busy === 'submitting'} onPress={() => { void controller.submit(); }}>{application?.status === 'needs_information' ? 'Resubmit for review' : 'Submit for review'}</Btn>
      </> : null}
      <View style={styles.actions}>
        {step > 0 ? <Btn variant="secondary" disabled={busy} onPress={() => controller.move(step - 1)}>Previous</Btn> : null}
        {step < 2 ? <Btn disabled={busy} onPress={() => controller.move(step + 1)}>Continue</Btn> : null}
      </View>
      <Btn variant="secondary" disabled={busy} loading={v.busy === 'saving'} onPress={() => { void controller.save(); }}>Save draft</Btn>
      <Text style={styles.caption}>Save your draft to keep changes when you leave. Replacing proof keeps your previous uploaded file until the new file has been checked.</Text>
    </>}
    <Btn variant="secondary" disabled={busy} onPress={() => { void controller.refresh(); }}>Refresh verification status</Btn>
    <Btn variant="ghost" disabled={busy} onPress={onHome}>Find accommodation</Btn>
    <Btn variant="ghost" disabled={busy} onPress={onSignOut}>Sign out</Btn>
  </View>;
}
const styles = StyleSheet.create({
  form: { gap: Spacing.lg }, heading: { fontFamily: Fonts.headingSemi, fontSize: 20, lineHeight: 28, color: Colors.navy },
  progress: { fontFamily: Fonts.bodySemi, fontSize: 14, lineHeight: 22, color: TextColors.link },
  body: { fontFamily: Fonts.body, fontSize: 14, lineHeight: 22, color: TextColors.secondary },
  caption: { fontFamily: Fonts.body, fontSize: 12, lineHeight: 19, color: TextColors.muted },
  file: { fontFamily: Fonts.bodyMed, fontSize: 14, lineHeight: 22, color: TextColors.primary, flexShrink: 1 },
  upload: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm },
  actions: { gap: Spacing.sm },
});
