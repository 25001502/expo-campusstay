import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

import { RootStackParamList } from '../../App';
import { Colors, Fonts, Radius, Shadow } from '../theme';
import { Btn, Input } from '../components/UI';
import { universities } from '../data';

type Props = NativeStackScreenProps<RootStackParamList, 'Apply'>;

const DOC_TYPES = [
  'Student ID',
  'Proof of Registration',
  'ID / Passport',
  'Proof of Funding',
];

const STEPS = [
  'Room',
  'Personal',
  'Documents',
  'Emergency',
  'Review',
];

export default function ApplyScreen({ navigation, route }: Props) {
  const { property } = route.params;
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);

  const toggleDoc = (doc: string) =>
    setUploadedDocs((prev) =>
      prev.includes(doc)
        ? prev.filter((d) => d !== doc)
        : [...prev, doc]
    );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[
          styles.container,
          { paddingTop: insets.top },
        ]}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() =>
              step === 0
                ? navigation.goBack()
                : setStep(step - 1)
            }
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-back-outline"
              size={22}
              color={Colors.slate600}
            />
          </TouchableOpacity>

          <Text style={styles.topTitle}>
            Apply for Accommodation
          </Text>

          {/* Keeps title centered */}
          <View style={styles.headerSpacer} />
        </View>

        {/* Stepper */}
        <View style={styles.stepper}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    i <= step && styles.stepCircleActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNum,
                      i <= step && styles.stepNumActive,
                    ]}
                  >
                    {i < step ? '✓' : i + 1}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.stepLabel,
                    i === step && styles.stepLabelActive,
                  ]}
                >
                  {s}
                </Text>
              </View>

              {i < STEPS.length - 1 && (
                <View
                  style={[
                    styles.stepLine,
                    i < step && styles.stepLineActive,
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Room */}
          {step === 0 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>
                Select a Room
              </Text>

              <Text style={styles.stepSub}>
                {property.name}
              </Text>

              {property.rooms.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.roomOption,
                    selectedRoom === r.id &&
                      styles.roomOptionActive,
                  ]}
                  onPress={() => setSelectedRoom(r.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.roomOptionTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.roomOptionTitle}>
                        {r.type} Room
                      </Text>

                      <Text style={styles.roomOptionMeta}>
                        {r.bathroom} ·{' '}
                        {r.furnished
                          ? 'Furnished'
                          : 'Unfurnished'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.radioCircle,
                        selectedRoom === r.id &&
                          styles.radioCircleActive,
                      ]}
                    >
                      {selectedRoom === r.id && (
                        <View style={styles.radioDot} />
                      )}
                    </View>
                  </View>

                  <Text style={styles.roomOptionPrice}>
                    R{r.price.toLocaleString()}/month
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Personal */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>
                Personal Information
              </Text>

              <Input
                label="Full name"
                placeholder="Siyanda Dlamini"
                style={styles.field}
              />

              <Input
                label="Student number"
                placeholder="2021012345"
                style={styles.field}
              />

              <View style={styles.field}>
                <Text style={styles.pickerLabel}>
                  University
                </Text>

                <View style={styles.pickerWrapper}>
                  <Picker
                    style={{
                      height: 48,
                      color: Colors.slate800,
                    }}
                  >
                    {universities.map((u) => (
                      <Picker.Item
                        key={u.id}
                        label={u.name}
                        value={u.id}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <Input
                label="Phone number"
                placeholder="+27 71 234 5678"
                keyboardType="phone-pad"
                style={styles.field}
              />

              <Input
                label="Email address"
                placeholder="student@university.ac.za"
                keyboardType="email-address"
                style={styles.field}
              />
            </View>
          )}

          {/* Documents */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>
                Upload Documents
              </Text>

              <Text style={styles.stepSub}>
                Upload the required documents to complete your
                application.
              </Text>

              {DOC_TYPES.map((doc) => {
                const done = uploadedDocs.includes(doc);

                return (
                  <View
                    key={doc}
                    style={[
                      styles.docCard,
                      done && styles.docCardDone,
                    ]}
                  >
                    <View
                      style={[
                        styles.docIcon,
                        done && styles.docIconDone,
                      ]}
                    >
                      <Text style={styles.docIconText}>
                        {done ? '✓' : '↑'}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.docName}>
                        {doc}
                      </Text>

                      <Text
                        style={[
                          styles.docStatus,
                          done && styles.docStatusDone,
                        ]}
                      >
                        {done
                          ? 'Uploaded ✓'
                          : 'PDF, JPG or PNG · Max 5MB'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.uploadBtn,
                        done && styles.uploadBtnDone,
                      ]}
                      onPress={() => toggleDoc(doc)}
                    >
                      <Text
                        style={[
                          styles.uploadBtnText,
                          done &&
                            styles.uploadBtnTextDone,
                        ]}
                      >
                        {done ? 'Done' : 'Upload'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Emergency */}
          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>
                Emergency Contact
              </Text>

              <Text style={styles.stepSub}>
                Who should we contact in an emergency?
              </Text>

              <Input
                label="Full name"
                placeholder="Nomsa Dlamini"
                style={styles.field}
              />

              <View style={styles.field}>
                <Text style={styles.pickerLabel}>
                  Relationship
                </Text>

                <View style={styles.pickerWrapper}>
                  <Picker
                    style={{
                      height: 48,
                      color: Colors.slate800,
                    }}
                  >
                    {[
                      'Parent',
                      'Sibling',
                      'Guardian',
                      'Spouse',
                      'Friend',
                    ].map((r) => (
                      <Picker.Item
                        key={r}
                        label={r}
                        value={r}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <Input
                label="Phone number"
                placeholder="+27 83 456 7890"
                keyboardType="phone-pad"
                style={styles.field}
              />
            </View>
          )}

          {/* Review */}
          {step === 4 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>
                Review Application
              </Text>

              <Text style={styles.stepSub}>
                Please review before submitting.
              </Text>

              {[
                {
                  label: 'Property',
                  value: property.name,
                },
                {
                  label: 'Room Type',
                  value:
                    (property.rooms[0]?.type ?? '') +
                    ' Room',
                },
                {
                  label: 'Monthly Rent',
                  value: `R${property.rooms[0]?.price.toLocaleString()}`,
                },
                {
                  label: 'Student',
                  value: 'Siyanda Dlamini',
                },
                {
                  label: 'University',
                  value: 'University of Venda',
                },
                {
                  label: 'Documents',
                  value: `${uploadedDocs.length}/${DOC_TYPES.length} uploaded`,
                },
                {
                  label: 'Emergency Contact',
                  value: 'Nomsa Dlamini (Parent)',
                },
              ].map(({ label, value }) => (
                <View
                  key={label}
                  style={styles.reviewRow}
                >
                  <Text style={styles.reviewLabel}>
                    {label}
                  </Text>

                  <Text style={styles.reviewValue}>
                    {value}
                  </Text>
                </View>
              ))}

              <View style={styles.reviewNote}>
                <Text style={styles.reviewNoteText}>
                  By submitting, you confirm all information
                  is accurate and agree to the accommodation
                  terms.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + 12 },
          ]}
        >
          {step < 4 ? (
            <Btn
              onPress={() => setStep(step + 1)}
              disabled={step === 0 && !selectedRoom}
              style={styles.nextBtn}
            >
              {step === 3
                ? 'Review Application'
                : 'Continue →'}
            </Btn>
          ) : (
            <Btn
              onPress={() =>
                navigation.replace('AppStatus', {
                  property,
                })
              }
              style={styles.nextBtn}
            >
              Submit Application →
            </Btn>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  /* Top bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },

  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  headerSpacer: {
    width: 40,
  },

  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
  },

  /* Stepper */
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },

  stepItem: {
    alignItems: 'center',
    gap: 4,
  },

  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepCircleActive: {
    backgroundColor: Colors.blue,
  },

  stepNum: {
    fontSize: 12,
    fontFamily: Fonts.bodySemi,
    color: Colors.slate400,
  },

  stepNumActive: {
    color: Colors.white,
  },

  stepLabel: {
    fontSize: 9,
    fontFamily: Fonts.bodyMed,
    color: Colors.slate400,
  },

  stepLabelActive: {
    color: Colors.blue,
  },

  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.slate200,
    marginBottom: 14,
  },

  stepLineActive: {
    backgroundColor: Colors.blue,
  },

  /* Scroll */
  scroll: {
    flex: 1,
  },

  scrollContent: {
    padding: 20,
    gap: 14,
  },

  stepContent: {
    gap: 12,
  },

  stepTitle: {
    fontSize: 22,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
  },

  stepSub: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.slate500,
  },

  /* Room */
  roomOption: {
    borderWidth: 2,
    borderColor: Colors.slate200,
    borderRadius: Radius.xl,
    padding: 16,
    gap: 8,
  },

  roomOptionActive: {
    borderColor: Colors.blue,
    backgroundColor: Colors.blue50,
  },

  roomOptionTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  roomOptionTitle: {
    fontSize: 16,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
  },

  roomOptionMeta: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.slate500,
    marginTop: 2,
  },

  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.slate300,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioCircleActive: {
    borderColor: Colors.blue,
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.blue,
  },

  roomOptionPrice: {
    fontSize: 15,
    fontFamily: Fonts.bodySemi,
    color: Colors.blue,
  },

  /* Fields */
  field: {
    marginBottom: 4,
  },

  pickerLabel: {
    fontSize: 13,
    fontFamily: Fonts.bodyMed,
    color: Colors.slate700,
    marginBottom: 6,
  },

  pickerWrapper: {
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.white,
  },

  /* Documents */
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.slate300,
    borderRadius: Radius.xl,
    padding: 14,
    gap: 12,
  },

  docCardDone: {
    borderStyle: 'solid',
    borderColor: Colors.green600,
    backgroundColor: Colors.green100,
  },

  docIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  docIconDone: {
    backgroundColor: Colors.green100,
  },

  docIconText: {
    fontSize: 18,
    color: Colors.slate500,
  },

  docName: {
    fontSize: 13,
    fontFamily: Fonts.bodySemi,
    color: Colors.slate900,
  },

  docStatus: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: Colors.slate400,
    marginTop: 2,
  },

  docStatusDone: {
    color: Colors.green600,
  },

  uploadBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.blue,
    borderRadius: Radius.md,
  },

  uploadBtnDone: {
    backgroundColor: Colors.green100,
  },

  uploadBtnText: {
    fontSize: 12,
    fontFamily: Fonts.bodySemi,
    color: Colors.white,
  },

  uploadBtnTextDone: {
    color: Colors.green600,
  },

  /* Review */
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },

  reviewLabel: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.slate500,
  },

  reviewValue: {
    fontSize: 13,
    fontFamily: Fonts.bodySemi,
    color: Colors.slate900,
  },

  reviewNote: {
    backgroundColor: Colors.blue50,
    borderRadius: Radius.lg,
    padding: 14,
    marginTop: 8,
  },

  reviewNoteText: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.blue,
    lineHeight: 18,
  },

  /* Footer */
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
    backgroundColor: Colors.white,
  },

  nextBtn: {},
});