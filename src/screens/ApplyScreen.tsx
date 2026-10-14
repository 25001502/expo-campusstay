import React, { useMemo, useRef, useState } from 'react';
import { getCurrentRooms, getRoomLabel } from '../rooms';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
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
import { Btn, IconButton, Input } from '../components/UI';
import { universities } from '../data';
import type { RootStackParamList } from '../navigation/types';
import { useApplications } from '../state/ApplicationContext';
import { Colors, Fonts, Radius, Shadow, Spacing, StatusColors, TextColors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Apply'>;
type PersonalKey = keyof ApplicationDraft['personal'];
type EmergencyKey = keyof ApplicationDraft['emergency'];

const RELATIONSHIPS = ['Parent', 'Sibling', 'Guardian', 'Spouse', 'Friend'];

export default function ApplyScreen({ navigation, route }: Props) {
  const { property, selectedRoomId } = route.params;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { submitApplication } = useApplications();
  const scrollRef = useRef<ScrollView>(null);
  const submissionStarted = useRef(false);
  const [draft, setDraft] = useState(() => createApplicationDraft(property, selectedRoomId));
  const [errors, setErrors] = useState<ApplicationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const invalidSuppliedRoom = !!selectedRoomId && draft.selectedRoomId === null;
  const currentRooms = getCurrentRooms(property);
  const availableRooms = currentRooms.filter((room) => room.available > 0);
  const review = useMemo(() => buildApplicationReview(draft, property), [draft, property]);
  const step = draft.currentStep;

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

  const toggleDocument = (id: DocumentCategoryId) => {
    setDraft((current) => ({
      ...current,
      selectedDocuments: current.selectedDocuments.includes(id)
        ? current.selectedDocuments.filter((documentId) => documentId !== id)
        : [...current.selectedDocuments, id],
    }));
    setErrors((current) => ({ ...current, documents: undefined, [`document.${id}`]: undefined }));
  };

  const showValidation = (nextErrors: ApplicationErrors) => {
    setErrors(nextErrors);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const goBack = () => {
    if (step === 0) navigation.goBack();
    else updateDraft({ currentStep: (step - 1) as ApplicationStep });
  };

  const continueToNextStep = () => {
    const nextErrors = validateApplicationStep(step, draft, property);
    if (Object.keys(nextErrors).length) {
      showValidation(nextErrors);
      return;
    }
    setErrors({});
    updateDraft({ currentStep: (step + 1) as ApplicationStep });
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const submit = () => {
    if (submissionStarted.current) return;
    const normalized = normalizeApplicationDraft(draft);
    const nextErrors = validateApplication(normalized, property);
    const invalidStep = firstInvalidApplicationStep(nextErrors);
    if (invalidStep !== undefined) {
      updateDraft({ currentStep: invalidStep });
      showValidation(nextErrors);
      return;
    }
    submissionStarted.current = true;
    setSubmitting(true);
    const application = submitApplication(normalized);
    navigation.replace('AppStatus', { property, applicationId: application.id });
  };

  const errorSummary = Object.values(errors).find(Boolean);
  const compactStepper = width < 360;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar style="dark" />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <IconButton icon="arrow-back-outline" label={step === 0 ? 'Leave application' : `Back to ${APPLICATION_STEPS[step - 1]}`} onPress={goBack} />
          <Text accessibilityRole="header" style={styles.topTitle}>Apply for Accommodation</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View accessible accessibilityRole="text" accessibilityLabel={`Application progress, step ${step + 1} of ${APPLICATION_STEPS.length}: ${APPLICATION_STEPS[step]}`} style={styles.stepper}>
          {APPLICATION_STEPS.map((label, index) => (
            <React.Fragment key={label}>
              <View style={styles.stepItem}>
                <View style={[styles.stepCircle, index <= step && styles.stepCircleActive]}>
                  <Text style={[styles.stepNum, index <= step && styles.stepNumActive]}>{index < step ? '✓' : index + 1}</Text>
                </View>
                {!compactStepper || index === step ? <Text numberOfLines={1} style={[styles.stepLabel, index === step && styles.stepLabelActive]}>{label}</Text> : null}
              </View>
              {index < APPLICATION_STEPS.length - 1 ? <View style={[styles.stepLine, index < step && styles.stepLineActive]} /> : null}
            </React.Fragment>
          ))}
        </View>

        <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
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
                    accessibilityLabel={`${getRoomLabel(room)}, offering ${room.id}, capacity ${room.capacity}, R${room.price.toLocaleString('en-ZA')} per month, ${room.available} rooms listed`}
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
              <Input label="Full name" placeholder="e.g. Alex Student" value={draft.personal.fullName} onChangeText={(value) => updatePersonal('fullName', value)} error={errors.fullName} required autoComplete="name" returnKeyType="next" style={styles.field} />
              <Input label="Student number" placeholder="e.g. 2021012345" value={draft.personal.studentNumber} onChangeText={(value) => updatePersonal('studentNumber', value)} error={errors.studentNumber} required keyboardType="number-pad" returnKeyType="next" style={styles.field} />
              <View style={styles.field}>
                <Text style={styles.pickerLabel}>University <Text style={styles.required}>*</Text></Text>
                <View style={[styles.pickerWrapper, errors.universityId && styles.pickerError]}>
                  <Picker accessibilityLabel="University, required" selectedValue={draft.personal.universityId} onValueChange={(value: string) => updatePersonal('universityId', value)} style={styles.picker}>
                    {universities.map((university) => <Picker.Item key={university.id} label={university.name} value={university.id} />)}
                  </Picker>
                </View>
                {errors.universityId ? <Text accessibilityRole="alert" style={styles.fieldError}>{errors.universityId}</Text> : null}
              </View>
              <Input label="Phone number" placeholder="e.g. +27 71 234 5678" value={draft.personal.phone} onChangeText={(value) => updatePersonal('phone', value)} error={errors.phone} required keyboardType="phone-pad" autoComplete="tel" returnKeyType="next" style={styles.field} />
              <Input label="Email address" placeholder="e.g. student@example.com" value={draft.personal.email} onChangeText={(value) => updatePersonal('email', value)} error={errors.email} required keyboardType="email-address" autoComplete="email" returnKeyType="done" style={styles.field} />
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.stepContent}>
              <Text accessibilityRole="header" style={styles.stepTitle}>Document Selection</Text>
              <Text style={styles.stepSub}>Select document categories below. No files are uploaded, stored, checked, or sent.</Text>
              {DOCUMENT_CATEGORIES.map((category) => {
                const selected = draft.selectedDocuments.includes(category.id);
                return (
                  <TouchableOpacity
                    key={category.id}
                    accessibilityRole="checkbox"
                    accessibilityLabel={`${category.label}, ${category.required ? 'required' : 'optional'} selection`}
                    accessibilityHint="Does not choose or upload a real file"
                    accessibilityState={{ checked: selected }}
                    onPress={() => toggleDocument(category.id)}
                    style={[styles.docCard, selected && styles.docCardSelected]}
                  >
                    <View style={[styles.docIcon, selected && styles.docIconSelected]}><Ionicons name={selected ? 'checkmark' : 'document-outline'} size={20} color={selected ? Colors.white : Colors.blue} /></View>
                    <View style={styles.optionCopy}>
                      <Text style={styles.docName}>{category.label}</Text>
                      <Text style={[styles.docStatus, selected && styles.docStatusSelected]}>{selected ? 'Selected' : category.required ? 'Required · Not selected' : 'Optional · Not selected'}</Text>
                      {errors[`document.${category.id}`] ? <Text accessibilityRole="alert" style={styles.fieldError}>{errors[`document.${category.id}`]}</Text> : null}
                    </View>
                    <Text style={styles.docAction}>{selected ? 'Remove' : 'Select'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {step === 3 ? (
            <View style={styles.stepContent}>
              <Text accessibilityRole="header" style={styles.stepTitle}>Emergency Contact</Text>
              <Text style={styles.stepSub}>This contact remains in the current app session and will not be contacted.</Text>
              <Input label="Full name" placeholder="e.g. Taylor Student" value={draft.emergency.fullName} onChangeText={(value) => updateEmergency('fullName', value)} error={errors['emergency.fullName']} required autoComplete="name" returnKeyType="next" style={styles.field} />
              <View style={styles.field}>
                <Text style={styles.pickerLabel}>Relationship <Text style={styles.required}>*</Text></Text>
                <View style={[styles.pickerWrapper, errors['emergency.relationship'] && styles.pickerError]}>
                  <Picker accessibilityLabel="Relationship, required" selectedValue={draft.emergency.relationship} onValueChange={(value: string) => updateEmergency('relationship', value)} style={styles.picker}>
                    {RELATIONSHIPS.map((relationship) => <Picker.Item key={relationship} label={relationship} value={relationship} />)}
                  </Picker>
                </View>
                {errors['emergency.relationship'] ? <Text accessibilityRole="alert" style={styles.fieldError}>{errors['emergency.relationship']}</Text> : null}
              </View>
              <Input label="Phone number" placeholder="e.g. +27 83 456 7890" value={draft.emergency.phone} onChangeText={(value) => updateEmergency('phone', value)} error={errors['emergency.phone']} required keyboardType="phone-pad" autoComplete="tel" returnKeyType="done" style={styles.field} />
            </View>
          ) : null}

          {step === 4 && review ? (
            <View style={styles.stepContent}>
              <Text accessibilityRole="header" style={styles.stepTitle}>Review Application</Text>
              <Text style={styles.stepSub}>Confirm the information below. This will create a local record for the current session.</Text>
              <ReviewSection title="Accommodation" onEdit={() => updateDraft({ currentStep: 0 })}>
                <ReviewRow label="Property" value={review.propertyName} />
                <ReviewRow label="Room" value={review.roomType} />
                <ReviewRow label="Monthly price" value={`R${review.roomPrice.toLocaleString()}`} />
              </ReviewSection>
              <ReviewSection title="Personal information" onEdit={() => updateDraft({ currentStep: 1 })}>
                <ReviewRow label="Full name" value={review.personal.fullName} />
                <ReviewRow label="Student number" value={review.personal.studentNumber} />
                <ReviewRow label="University" value={universities.find((university) => university.id === review.personal.universityId)?.name ?? review.personal.universityId} />
                <ReviewRow label="Phone" value={review.personal.phone} />
                <ReviewRow label="Email" value={review.personal.email} />
              </ReviewSection>
              <ReviewSection title="Document selections" onEdit={() => updateDraft({ currentStep: 2 })}>
                {review.documents.map((document) => <ReviewRow key={document.id} label={`${document.label}${document.required ? ' (required)' : ' (optional)'}`} value={document.selected ? 'Selected' : 'Not selected'} />)}
              </ReviewSection>
              <ReviewSection title="Emergency contact" onEdit={() => updateDraft({ currentStep: 3 })}>
                <ReviewRow label="Full name" value={review.emergency.fullName} />
                <ReviewRow label="Relationship" value={review.emergency.relationship} />
                <ReviewRow label="Phone" value={review.emergency.phone} />
              </ReviewSection>
              <View style={styles.reviewNote}><Text style={styles.reviewNoteText}>Saving creates a record for this session. No accommodation provider receives it, and it does not reserve or confirm a room.</Text></View>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.sm }]}>
          {step < 4 ? <Btn onPress={continueToNextStep} style={styles.nextButton}>{step === 3 ? 'Review Application' : 'Continue →'}</Btn> : <Btn accessibilityHint="Creates a record for this app session only" loading={submitting} disabled={submitting} onPress={submit} style={styles.nextButton}>Save Application</Btn>}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return <View style={styles.reviewSection}><View style={styles.reviewHeading}><Text accessibilityRole="header" style={styles.reviewTitle}>{title}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={`Edit ${title}`} onPress={onEdit} style={styles.editButton}><Text style={styles.editText}>Edit</Text></TouchableOpacity></View>{children}</View>;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return <View accessible accessibilityLabel={`${label}: ${value}`} style={styles.reviewRow}><Text style={styles.reviewLabel}>{label}</Text><Text style={styles.reviewValue}>{value}</Text></View>;
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
  pickerLabel: { fontSize: 13, lineHeight: 19, fontFamily: Fonts.bodySemi, color: TextColors.secondary, marginBottom: 6 },
  required: { color: Colors.red600 },
  pickerWrapper: { minHeight: 48, justifyContent: 'center', borderWidth: 1, borderColor: Colors.slate300, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: Colors.white },
  pickerError: { borderColor: Colors.red600, borderWidth: 2 },
  picker: { height: 48, color: TextColors.primary },
  fieldError: { marginTop: 5, fontSize: 12, lineHeight: 17, fontFamily: Fonts.body, color: TextColors.danger },
  docCard: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.slate200, backgroundColor: Colors.white },
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
