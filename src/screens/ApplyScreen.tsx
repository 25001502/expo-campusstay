import { problem, reportDiagnostic } from '../errors';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getCurrentRooms, getRoomLabel } from '../rooms';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { KeyboardForm, type KeyboardFormHandle } from '../components/KeyboardForm';
import { SelectField } from '../components/SelectField';
import { AttachmentSourceButton } from '../components/AttachmentSourceButton';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  APPLICATION_STEPS,
  DOCUMENT_CATEGORIES,
  buildApplicationReview,
  createApplicationDraft,
  firstInvalidApplicationStep,
  normalizeApplicationDraft,
  validateApplication,
  validateApplicationStep,
  type ApplicationDraft,
  type ApplicationErrors,
  type ApplicationStep,
  type DocumentCategoryId,
} from '../application';
import { Btn, EmptyState, IconButton, Input } from '../components/UI';
import { universities, properties as routeProperties } from '../data';
import type { RootStackParamList } from '../navigation/types';
import { useApplications } from '../state/ApplicationContext';
import { useProfile } from '../state/ProfileContext';
import { FundingFields } from '../components/FundingFields';
import { LocalDocumentPreview } from '../components/LocalDocumentPreview';
import { formatDocumentSize, formatDocumentType, type LocalDocument } from '../documents';
import { fundingLabel, fundingStatusLabel, paymentDiscussionLabel } from '../funding';
import type { AttachmentSource, ImagePreview } from '../attachmentSession';
import { Colors, Fonts, Radius, Shadow, Spacing, StatusColors, TextColors } from '../theme';

import { getRouteProperty } from '../navigation/routeProperty';

type Props = NativeStackScreenProps<RootStackParamList, 'Apply'>;
type PersonalKey = keyof ApplicationDraft['personal'];
type EmergencyKey = keyof ApplicationDraft['emergency'];

const RELATIONSHIPS = ['Parent', 'Sibling', 'Guardian', 'Spouse', 'Friend'];

export default function ApplyScreen({ navigation, route }: Props) {
  const suppliedProperty = getRouteProperty(route.params?.property);
  const property = suppliedProperty ?? routeProperties[0];
  const selectedRoomId = route.params?.selectedRoomId;
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const { submitApplication, chooseDocument, removeDocument, releaseDraft, checkDraftDocuments, picking, canPreviewDocument, previewDocument } = useApplications();
  const { profile } = useProfile();
  const scrollRef = useRef<KeyboardFormHandle>(null);
  const submissionStarted = useRef(false);
  const [draft, setDraft] = useState(() => createApplicationDraft(property, selectedRoomId));
  const [errors, setErrors] = useState<ApplicationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [preview, setPreview] = useState<ImagePreview | null>(null);
  const active = useRef(true);
  const advancing = useRef(false);
  const draftId = draft.draftId;
  useEffect(() => { active.current = true; return () => { active.current = false; releaseDraft(draftId); }; }, [draftId, releaseDraft]);
  const invalidSuppliedRoom = !!selectedRoomId && draft.selectedRoomId === null;
  const currentRooms = getCurrentRooms(property);
  const availableRooms = currentRooms.filter((room) => room.available > 0);
  const review = useMemo(() => buildApplicationReview(draft, property), [draft, property]);
  const step = draft.currentStep;

  if (!suppliedProperty || draft.propertyId !== property.id) return <ScrollView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]} contentContainerStyle={{ flexGrow: 1 }}><StatusBar style="dark" /><EmptyState title="Application unavailable" description="This property or application route is no longer available. Choose a property to start again." actionLabel="Explore accommodation" onAction={() => navigation.popTo('Main', { screen: 'Explore' })} /></ScrollView>;

  const updateDraft = (update: Partial<ApplicationDraft>) => {
    setDraft((current) => ({ ...current, ...update }));
  };

  const updatePersonal = (key: PersonalKey, value: string) => {
    setDraft((current) => ({ ...current, personal: { ...current.personal, [key]: value } }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const updateEmergency = (key: EmergencyKey, value: string) => {
    const errorKey = `emergency.${key}` as const;
    setDraft((current) => ({ ...current, emergency: { ...current.emergency, [key]: value } }));
    setErrors((current) => ({ ...current, [errorKey]: undefined }));
  };

  const chooseFile = async (id: DocumentCategoryId, source: AttachmentSource) => {
    const result = await chooseDocument(draftId, id, source);
    if (!active.current) return;
    if (result.status === 'selected') {
      setDraft((current) => ({ ...current, attachments: { ...current.attachments, [id]: result.document } }));
      setErrors((current) => ({ ...current, documents: undefined, [`document.${id}`]: undefined }));
    } else if (result.status === 'error') setErrors((current) => ({ ...current, [`document.${id}`]: result.message }));
  };
  const removeFile = (document: LocalDocument) => {
    removeDocument(draftId, document.id);
    setDraft((current) => { const attachments = { ...current.attachments }; delete attachments[document.category]; return { ...current, attachments }; });
    setErrors((current) => ({ ...current, [`document.${document.category}`]: undefined }));
  };
  const openPreview = (document: LocalDocument) => {
    const result = previewDocument(draftId, document);
    if (result.status === 'image') setPreview(result.preview);
    else if (result.status === 'error') Alert.alert('Preview unavailable', result.message);
  };
  const checkedDraft = async () => {
    const checked = await checkDraftDocuments(draft);
    if (active.current) setDraft(checked);
    return checked;
  };
  const expiredErrors = (value: ApplicationDraft): ApplicationErrors => Object.fromEntries(
    Object.values(value.attachments).filter((document) => document.state === 'unavailable')
      .map((document) => [`document.${document.category}`, `${DOCUMENT_CATEGORIES.find((category) => category.id === document.category)?.label}: file unavailable. Replace or remove it.`]),
  );

  const showValidation = (nextErrors: ApplicationErrors) => {
    setErrors(nextErrors);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const goBack = () => {
    if (step === 0) navigation.goBack();
    else editStep((step - 1) as ApplicationStep);
  };

  const editStep = (nextStep: ApplicationStep) => {
    updateDraft({ currentStep: nextStep });
    setErrors({});
  };

  const continueToNextStep = async () => {
    if (advancing.current || picking) return;
    advancing.current = true;
    setChecking(true);
    try {
      const checkFiles = step === 2 || step === 3;
      const value = checkFiles ? await checkedDraft() : draft;
      if (!active.current) return;
      const nextErrors = { ...validateApplicationStep(step, value, property), ...(step === 3 ? validateApplicationStep(2, value, property) : {}), ...(checkFiles ? expiredErrors(value) : {}) };
      if (Object.keys(nextErrors).length) {
        const invalidStep = firstInvalidApplicationStep(nextErrors);
        if (invalidStep !== undefined && invalidStep < step) updateDraft({ currentStep: invalidStep });
        showValidation(nextErrors);
        return;
      }
      setErrors({});
      updateDraft({ currentStep: (step + 1) as ApplicationStep });
    } catch {
      reportDiagnostic('attachments', 'attachments');
      if (active.current) showValidation({ documents: problem('attachments').message });
    } finally { advancing.current = false; if (active.current) setChecking(false); }
  };

  const submit = async () => {
    if (submissionStarted.current || advancing.current || picking) return;
    submissionStarted.current = true;
    setSubmitting(true);
    let saved = false;
    try {
      const normalized = normalizeApplicationDraft(await checkedDraft());
      if (!active.current) return;
      const nextErrors = { ...validateApplication(normalized, property), ...expiredErrors(normalized) };
      const invalidStep = firstInvalidApplicationStep(nextErrors);
      if (invalidStep !== undefined) {
        updateDraft({ currentStep: invalidStep });
        showValidation(nextErrors);
        return;
      }
      const application = submitApplication(normalized);
      saved = true;
      navigation.replace('AppStatus', { property, applicationId: application.id });
    } catch {
      if (!active.current) return;
      updateDraft({ currentStep: 2 });
      showValidation({ documents: 'The files could not be saved. Check their availability and try again.' });
    } finally { if (!saved) { submissionStarted.current = false; if (active.current) setSubmitting(false); } }
  };

  const errorSummary = Object.values(errors).find(Boolean);
  const compactStepper = width < 360 || fontScale >= 1.3;
  const circleSize = Math.max(28, 28 * Math.min(fontScale, 1.5));

  return (
    <>
      <KeyboardForm ref={scrollRef} resetKey={step} contentContainerStyle={styles.scrollContent} style={[styles.container, { paddingTop: insets.top }]}
        header={<><StatusBar style="dark" />
        <View style={styles.topBar}>
          <IconButton icon="arrow-back-outline" label={step === 0 ? 'Leave application' : `Back to ${APPLICATION_STEPS[step - 1]}`} onPress={goBack} />
          <Text accessibilityRole="header" style={styles.topTitle}>Apply for Accommodation</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View accessible accessibilityRole="text" accessibilityLabel={`Application progress, step ${step + 1} of ${APPLICATION_STEPS.length}: ${APPLICATION_STEPS[step]}`}>
        <View style={styles.stepper}>
          {APPLICATION_STEPS.map((label, index) => (
            <React.Fragment key={label}>
              <View style={styles.stepItem}>
                <View style={[styles.stepCircle, { width: circleSize, height: circleSize, borderRadius: circleSize / 2 }, index <= step && styles.stepCircleActive]}>
                  <Text style={[styles.stepNum, index <= step && styles.stepNumActive]}>{index < step ? '✓' : index + 1}</Text>
                </View>
                {!compactStepper ? <Text style={[styles.stepLabel, index === step && styles.stepLabelActive]}>{label}</Text> : null}
              </View>
              {index < APPLICATION_STEPS.length - 1 ? <View style={[styles.stepLine, index < step && styles.stepLineActive]} /> : null}
            </React.Fragment>
          ))}
        </View>
        {compactStepper ? <Text style={styles.progressCaption}>Step {step + 1} of 5 · {APPLICATION_STEPS[step]}</Text> : null}
        </View>

        </>}
        footer={
        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.sm }]}>
          {step < 4 ? <Btn onPress={continueToNextStep} loading={checking} disabled={checking || picking} style={styles.nextButton}>{step === 3 ? 'Review Application' : 'Continue →'}</Btn> : <Btn accessibilityHint="Creates a record for this app session only" loading={submitting} disabled={submitting || picking} onPress={submit} style={styles.nextButton}>Save Application</Btn>}
        </View>
        }>
          {errorSummary ? (
            <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.errorSummary}>
              <Ionicons name="alert-circle-outline" size={20} color={Colors.red600} />
              <Text style={styles.errorSummaryText}>{errorSummary}</Text>
            </View>
          ) : null}

          {step === 0 ? (
            <View style={styles.stepContent}>
              <Text accessibilityRole="header" style={styles.stepTitle}>Select a Room</Text>
              <Text style={styles.stepSub}>{property.name}</Text>
              <Text style={styles.availabilityNote}>Listed room information · Counts are not live vacancies</Text>
              {invalidSuppliedRoom ? <Text accessibilityRole="alert" style={styles.roomNotice}>The requested room is invalid or unavailable. Select an available room explicitly.</Text> : null}
              {!availableRooms.length ? <View style={styles.roomNoticeBox}><Text style={styles.roomNoticeText}>No rooms are currently listed as available.</Text></View> : null}
              {currentRooms.map((room) => {
                const selected = draft.selectedRoomId === room.id;
                const disabled = room.available <= 0;
                return (
                  <TouchableOpacity
                    key={room.id}
                    accessibilityRole="radio"
                    testID={`room-option-${room.id}`} accessibilityLabel={`${getRoomLabel(room)}, capacity ${room.capacity}, R${room.price.toLocaleString('en-ZA')} per month, ${room.available} rooms listed`}
                    accessibilityState={{ selected, disabled }}
                    activeOpacity={0.8}
                    disabled={disabled}
                    onPress={() => {
                      updateDraft({ selectedRoomId: room.id });
                      setErrors((current) => ({ ...current, selectedRoomId: undefined }));
                    }}
                    style={[styles.roomOption, selected && styles.roomOptionActive, disabled && styles.roomOptionDisabled]}
                  >
                    <View style={styles.optionTop}>
                      <View style={styles.optionCopy}>
                        <Text style={styles.optionTitle}>{getRoomLabel(room)}</Text>
                        <Text style={styles.optionMeta}>Capacity: {room.capacity} · {room.bathroom} · {room.furnished ? 'Furnished' : 'Unfurnished'}</Text>
                      </View>
                      <View style={[styles.radioCircle, selected && styles.radioCircleActive]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                    </View>
                    <Text style={styles.optionPrice}>R{room.price.toLocaleString()}/month</Text>
                    <Text style={[styles.availability, disabled && styles.unavailable]}>{room.available} rooms listed</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {step === 1 ? (
            <View style={styles.stepContent}>
              <Text accessibilityRole="header" style={styles.stepTitle}>Personal Information</Text>
              <Text style={styles.stepSub}>Information entered here remains in the current app session.</Text>
              {Object.values(profile).some(Boolean) ? <Btn variant="secondary" onPress={() => { setDraft((current) => ({ ...current, personal: { ...current.personal, ...Object.fromEntries(Object.entries(profile).filter(([, value]) => value.trim())) } })); setErrors({}); }}>Use saved profile details</Btn> : null}
              <Input label="Full name" placeholder="e.g. Alex Student" value={draft.personal.fullName} onChangeText={(value) => updatePersonal('fullName', value)} error={errors.fullName} required autoComplete="name" returnKeyType="next" style={styles.field} />
              <Input label="Student number" placeholder="e.g. 2021012345" value={draft.personal.studentNumber} onChangeText={(value) => updatePersonal('studentNumber', value)} error={errors.studentNumber} required keyboardType="number-pad" returnKeyType="next" style={styles.field} />
                <View style={styles.field}><SelectField label="University" required value={draft.personal.universityId} options={universities.map((university) => ({ value: university.id, label: university.name }))} placeholder="Select your university" onChange={(value) => updatePersonal('universityId', value)} error={errors.universityId} /></View>
              <Input label="Phone number" placeholder="e.g. +27 71 234 5678" value={draft.personal.phone} onChangeText={(value) => updatePersonal('phone', value)} error={errors.phone} required keyboardType="phone-pad" autoComplete="tel" returnKeyType="next" style={styles.field} />
              <Input label="Email address" placeholder="e.g. student@example.com" value={draft.personal.email} onChangeText={(value) => updatePersonal('email', value)} error={errors.email} required keyboardType="email-address" autoComplete="email" returnKeyType="done" style={styles.field} />
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.stepContent}>
              <Text accessibilityRole="header" style={styles.stepTitle}>Documents</Text>
              <Text style={styles.stepSub}>Choose PDF, JPG, JPEG or PNG files up to 10 MB each. Attachments are temporary and remain in this session. No files are sent to a provider.</Text>
              <View style={styles.reviewSection}>
                <Text accessibilityRole="header" style={styles.reviewTitle}>Funding Information</Text>
                <FundingFields funding={draft.funding} error={errors.funding} disabled={picking || checking} onChange={(funding) => { updateDraft({ funding }); setErrors((current) => ({ ...current, funding: undefined })); }} />
              </View>
              {DOCUMENT_CATEGORIES.map((category) => {
                const document = draft.attachments[category.id];
                const selected = document?.state === 'attached-local';
                return (
                  <View
                    key={category.id}
                    style={[styles.docCard, selected && styles.docCardSelected]}
                  >
                    <View style={styles.optionTop}>
                    <View style={[styles.docIcon, selected && styles.docIconSelected]}><Ionicons name={selected ? 'checkmark' : 'document-outline'} size={20} color={selected ? Colors.white : Colors.blue} /></View>
                    <View style={styles.optionCopy}>
                      <Text style={styles.docName}>{category.label}</Text>
                      <Text style={[styles.docStatus, selected && styles.docStatusSelected]}>{category.required ? 'Required' : 'Optional'} · {selected ? 'Attached locally' : document ? 'File unavailable · Replace or remove' : 'Not attached'}</Text>
                    </View></View>
                    {document ? <View accessibilityLiveRegion="polite"><Text style={styles.docName}>{document.name}</Text><Text style={styles.docStatus}>{formatDocumentType(document.mimeType)} · {formatDocumentSize(document.size)}</Text></View> : null}
                      {errors[`document.${category.id}`] ? <Text accessibilityRole="alert" style={styles.fieldError}>{errors[`document.${category.id}`]}</Text> : null}
                    <View style={styles.documentActions}>
                      <AttachmentSourceButton categoryLabel={category.label} replacing={!!document} disabled={picking || checking} onChoose={(source) => chooseFile(category.id, source)} />
                      {document ? <Btn variant="ghost" accessibilityLabel={`Remove ${category.label}`} disabled={picking || checking} onPress={() => removeFile(document)}>Remove</Btn> : null}
                      {document && selected && canPreviewDocument(draftId, document) ? <Btn variant="ghost" accessibilityLabel={`Preview ${category.label}`} onPress={() => openPreview(document)}>Preview</Btn> : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          {step === 3 ? (
            <View style={styles.stepContent}>
              <Text accessibilityRole="header" style={styles.stepTitle}>Emergency Contact</Text>
              <Text style={styles.stepSub}>This contact remains in the current app session and will not be contacted.</Text>
              <Input label="Full name" placeholder="e.g. Taylor Student" value={draft.emergency.fullName} onChangeText={(value) => updateEmergency('fullName', value)} error={errors['emergency.fullName']} required autoComplete="name" returnKeyType="next" style={styles.field} />
              <View style={styles.field}><SelectField label="Relationship" required value={draft.emergency.relationship} options={RELATIONSHIPS.map((relationship) => ({ value: relationship, label: relationship }))} placeholder="Select a relationship" onChange={(value) => updateEmergency('relationship', value)} error={errors['emergency.relationship']} /></View>
              <Input label="Phone number" placeholder="e.g. +27 83 456 7890" value={draft.emergency.phone} onChangeText={(value) => updateEmergency('phone', value)} error={errors['emergency.phone']} required keyboardType="phone-pad" autoComplete="tel" returnKeyType="done" style={styles.field} />
            </View>
          ) : null}

          {step === 4 && review ? (
            <View style={styles.stepContent}>
              <Text accessibilityRole="header" style={styles.stepTitle}>Review Application</Text>
              <Text style={styles.stepSub}>Confirm the information below. This will create a local record for the current session.</Text>
              <ReviewSection title="Accommodation" onEdit={() => editStep(0)}>
                <ReviewRow label="Property" value={review.propertyName} />
                <ReviewRow label="Room" value={review.roomType} />
                <ReviewRow label="Monthly price" value={`R${review.roomPrice.toLocaleString()}`} />
              </ReviewSection>
              <ReviewSection title="Personal information" onEdit={() => editStep(1)}>
                <ReviewRow label="Full name" value={review.personal.fullName} />
                <ReviewRow label="Student number" value={review.personal.studentNumber} />
                <ReviewRow label="University" value={universities.find((university) => university.id === review.personal.universityId)?.name ?? review.personal.universityId} />
                <ReviewRow label="Phone" value={review.personal.phone} />
                <ReviewRow label="Email" value={review.personal.email} />
              </ReviewSection>
              <ReviewSection title="Funding information" onEdit={() => editStep(2)}>
                <ReviewRow label="Funding source" value={fundingLabel(review.funding)} />
                <ReviewRow label="Funding status" value={fundingStatusLabel(review.funding)} />
                <ReviewRow label="Proof of Funding" value={draft.attachments.funding ? `${draft.attachments.funding.name} · Supporting document attached locally` : 'Not attached (optional)'} />
                <ReviewRow label="Declaration" value={review.funding.source ? 'Student-provided · Not verified' : 'Not declared'} />
                <ReviewRow label="Payment discussion" value={paymentDiscussionLabel(review.funding)} />
              </ReviewSection>
              <ReviewSection title="Documents" onEdit={() => editStep(2)}>
                {review.documents.map((document) => <ReviewRow key={document.id} label={`${document.label}${document.required ? ' (required)' : ' (optional)'}`} value={document.attachment ? `${document.attachment.name}\n${formatDocumentType(document.attachment.mimeType)} · ${formatDocumentSize(document.attachment.size)}\n${document.selected ? 'Attached locally' : 'File unavailable'}` : 'Not attached'} />)}
              </ReviewSection>
              <ReviewSection title="Emergency contact" onEdit={() => editStep(3)}>
                <ReviewRow label="Full name" value={review.emergency.fullName} />
                <ReviewRow label="Relationship" value={review.emergency.relationship} />
                <ReviewRow label="Phone" value={review.emergency.phone} />
              </ReviewSection>
              <View style={styles.reviewNote}><Text style={styles.reviewNoteText}>Saving creates a record for this session. No accommodation provider receives it, and it does not reserve or confirm a room.</Text></View>
            </View>
          ) : null}
      </KeyboardForm>
      <LocalDocumentPreview preview={preview} onClose={() => setPreview(null)} />
    </>
  );
}

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return <View style={styles.reviewSection}><View style={styles.reviewHeading}><Text accessibilityRole="header" style={styles.reviewTitle}>{title}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={`Edit ${title}`} onPress={onEdit} style={styles.editButton}><Text style={styles.editText}>Edit</Text></TouchableOpacity></View>{children}</View>;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale >= 1.3;
  return <View accessible accessibilityLabel={`${label}: ${value}`} style={[styles.reviewRow, stacked && { flexDirection: 'column', gap: 4 }]}><Text style={[styles.reviewLabel, stacked && { flex: 0 }]}>{label}</Text><Text style={[styles.reviewValue, stacked && { flex: 0, textAlign: 'left' }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.white },
  topBar: { minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.slate100 },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 16, lineHeight: 22, fontFamily: Fonts.heading, color: TextColors.primary },
  headerSpacer: { width: 44 },
  stepper: { minHeight: 70, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.slate100 },
  stepItem: { alignItems: 'center', gap: 4, minWidth: 28 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.slate100, alignItems: 'center', justifyContent: 'center' },
  stepCircleActive: { backgroundColor: Colors.blue },
  stepNum: { fontSize: 11, fontFamily: Fonts.bodySemi, color: Colors.slate500 },
  stepNumActive: { color: Colors.white },
  stepLabel: { maxWidth: 64, fontSize: 9, fontFamily: Fonts.body, color: Colors.slate500 },
  stepLabelActive: { color: Colors.blue, fontFamily: Fonts.bodySemi },
  stepLine: { flex: 1, height: 2, marginHorizontal: 4, backgroundColor: Colors.slate200 },
  stepLineActive: { backgroundColor: Colors.blue },
  progressCaption: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.sm, fontFamily: Fonts.bodySemi, fontSize: 12, lineHeight: 18, color: Colors.blue },
  selectionRow: { minHeight: 48, paddingVertical: Spacing.sm, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  selectionText: { flex: 1, fontFamily: Fonts.bodyMed, fontSize: 14, lineHeight: 21, color: TextColors.primary },
  documentActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.xl, paddingBottom: Spacing.xxl },
  stepContent: { gap: Spacing.md },
  stepTitle: { fontSize: 23, lineHeight: 30, fontFamily: Fonts.heading, color: TextColors.primary },
  stepSub: { fontSize: 14, lineHeight: 21, fontFamily: Fonts.body, color: TextColors.secondary },
  availabilityNote: { fontSize: 12, lineHeight: 18, fontFamily: Fonts.body, color: TextColors.muted },
  errorSummary: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.red100, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.red500 },
  errorSummaryText: { flex: 1, fontSize: 13, lineHeight: 19, fontFamily: Fonts.bodyMed, color: TextColors.danger },
  roomNotice: { padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.amber100, color: Colors.amber600, fontFamily: Fonts.bodyMed, lineHeight: 19 },
  roomNoticeBox: { padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.amber100 },
  roomNoticeText: { color: Colors.amber600, fontFamily: Fonts.bodyMed, lineHeight: 19 },
  roomOption: { padding: Spacing.lg, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.slate200, backgroundColor: Colors.white, gap: Spacing.sm, ...Shadow.sm },
  roomOptionActive: { borderWidth: 2, borderColor: Colors.blue, backgroundColor: Colors.blue50 },
  roomOptionDisabled: { opacity: 0.52 },
  optionTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  optionCopy: { flex: 1, minWidth: 0 },
  optionTitle: { fontSize: 16, fontFamily: Fonts.heading, color: TextColors.primary },
  optionMeta: { fontSize: 12, lineHeight: 18, fontFamily: Fonts.body, color: TextColors.muted, marginTop: 3 },
  optionPrice: { fontSize: 18, fontFamily: Fonts.heading, color: Colors.blue },
  availability: { fontSize: 12, fontFamily: Fonts.bodyMed, color: StatusColors.green.foreground },
  unavailable: { color: Colors.red600 },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.slate300, alignItems: 'center', justifyContent: 'center' },
  radioCircleActive: { borderColor: Colors.blue },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.blue },
  field: { marginTop: Spacing.xs },
  fieldError: { marginTop: 5, fontSize: 12, lineHeight: 17, fontFamily: Fonts.body, color: TextColors.danger },
  docCard: { minHeight: 92, gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.slate200, backgroundColor: Colors.white },
  docCardSelected: { borderColor: Colors.blue, backgroundColor: Colors.blue50 },
  docIcon: { width: 44, height: 44, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.blue100 },
  docIconSelected: { backgroundColor: Colors.blue },
  docName: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.bodySemi, color: TextColors.primary },
  docStatus: { fontSize: 12, lineHeight: 18, fontFamily: Fonts.body, color: TextColors.muted, marginTop: 2 },
  docStatusSelected: { color: Colors.blue },
  docAction: { minWidth: 54, textAlign: 'right', fontSize: 12, fontFamily: Fonts.bodySemi, color: Colors.blue },
  reviewSection: { padding: Spacing.lg, gap: Spacing.sm, borderRadius: Radius.xl, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.slate200 },
  reviewHeading: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  reviewTitle: { flex: 1, fontSize: 16, fontFamily: Fonts.heading, color: TextColors.primary },
  editButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.sm },
  editText: { fontSize: 13, fontFamily: Fonts.bodySemi, color: Colors.blue },
  reviewRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.lg, paddingVertical: 4 },
  reviewLabel: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: Fonts.body, color: TextColors.muted },
  reviewValue: { flex: 1.5, textAlign: 'right', fontSize: 13, lineHeight: 19, fontFamily: Fonts.bodySemi, color: TextColors.primary },
  reviewNote: { padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.blue50 },
  reviewNoteText: { fontSize: 12, lineHeight: 18, fontFamily: Fonts.body, color: Colors.blue },
  footer: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.slate100, backgroundColor: Colors.white },
  nextButton: { width: '100%' },
});
