import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Input } from '../components/UI';
import { universities } from '../data';
import { AUTH_FEEDBACK, validateRegistration, type RegistrationFields } from '../demoAuth';
import type { RootStackParamList } from '../navigation/types';
import { Colors, Fonts, Radius, Spacing, TextColors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;
const EMPTY: RegistrationFields = { fullName: '', email: '', phone: '', universityId: '', studentNumber: '', password: '', confirmPassword: '' };

export default function RegisterScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [fields, setFields] = useState(EMPTY);
  const [errors, setErrors] = useState<ReturnType<typeof validateRegistration>>({});
  const [complete, setComplete] = useState(false);
  const update = (key: keyof RegistrationFields, value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };
  const submit = () => {
    const nextErrors = validateRegistration(fields);
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) setComplete(true);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.xxl }]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to login" onPress={() => navigation.goBack()} style={styles.backButton}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
          <Text accessibilityRole="header" style={styles.title}>Create account</Text>
        </View>
        {complete ? (
          <View accessibilityRole="alert" style={styles.success}>
            <Text style={styles.successIcon}>✓</Text><Text accessibilityRole="header" style={styles.successTitle}>Information checked</Text>
            <Text style={styles.successText}>{AUTH_FEEDBACK.registration}</Text>
            <Text style={styles.successText}>CampusStay remains available without an account while account services are being connected.</Text>
            <Btn onPress={() => navigation.replace('Main')} style={styles.fullButton}>Go to CampusStay</Btn>
            <TouchableOpacity accessibilityRole="button" onPress={() => navigation.popTo('Login')}><Text style={styles.loginLink}>Back to sign in</Text></TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.infoBanner}><Text style={styles.infoTitle}>Account services unavailable</Text><Text style={styles.infoText}>You can complete this form, but nothing will be submitted or saved yet.</Text></View>
            <Input label="Full name" placeholder="Siyanda Dlamini" value={fields.fullName} onChangeText={(v) => update('fullName', v)} error={errors.fullName} autoComplete="name" required style={styles.field} />
            <Input label="Email address" placeholder="student@university.ac.za" value={fields.email} onChangeText={(v) => update('email', v)} error={errors.email} keyboardType="email-address" autoComplete="email" required style={styles.field} />
            <Input label="Phone number" placeholder="+27 71 234 5678" value={fields.phone} onChangeText={(v) => update('phone', v)} error={errors.phone} keyboardType="phone-pad" autoComplete="tel" required style={styles.field} />
            <View style={styles.field}><Text style={styles.pickerLabel}>University <Text style={styles.required}>*</Text></Text><View style={[styles.pickerWrapper, errors.universityId && styles.pickerError]}><Picker accessibilityLabel="University, required" selectedValue={fields.universityId} onValueChange={(v: string) => update('universityId', v)} style={styles.picker}><Picker.Item label="Select your university" value="" color={Colors.slate500} />{universities.map((u) => <Picker.Item key={u.id} label={u.name} value={u.id} />)}</Picker></View>{errors.universityId ? <Text accessibilityRole="alert" style={styles.error}>{errors.universityId}</Text> : null}</View>
            <Input label="Student number" placeholder="e.g. 2021012345" value={fields.studentNumber} onChangeText={(v) => update('studentNumber', v)} error={errors.studentNumber} required style={styles.field} />
            <Input label="Password" placeholder="At least 8 characters" value={fields.password} onChangeText={(v) => update('password', v)} error={errors.password} helperText="Use at least 8 characters. This value is never stored." secureTextEntry passwordVisibilityToggle autoComplete="new-password" required style={styles.field} />
            <Input label="Confirm password" placeholder="Repeat password" value={fields.confirmPassword} onChangeText={(v) => update('confirmPassword', v)} error={errors.confirmPassword} secureTextEntry passwordVisibilityToggle autoComplete="new-password" required style={styles.field} />
            <Text style={styles.terms}>Terms and Privacy content is not available yet, so no legal consent is requested or recorded.</Text>
            <Btn onPress={submit} style={styles.createButton}>Review registration</Btn>
            <View style={styles.loginRow}><Text style={styles.loginText}>Already have an account? </Text><TouchableOpacity accessibilityRole="button" onPress={() => navigation.popTo('Login')}><Text style={styles.loginLink}>Back to sign in</Text></TouchableOpacity></View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, container: { flex: 1, backgroundColor: Colors.white }, scroll: { flexGrow: 1 }, header: { backgroundColor: Colors.navy, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl },
  backButton: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', marginBottom: Spacing.xs }, backText: { color: Colors.slate300, fontSize: 14, fontFamily: Fonts.bodyMed }, title: { color: Colors.white, fontSize: 26, fontFamily: Fonts.heading },
  form: { padding: Spacing.xl }, infoBanner: { backgroundColor: Colors.blue50, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.lg }, infoTitle: { color: TextColors.link, fontSize: 14, fontFamily: Fonts.bodySemi }, infoText: { color: TextColors.secondary, fontSize: 12, lineHeight: 18, fontFamily: Fonts.body, marginTop: Spacing.xs },
  field: { marginBottom: Spacing.md }, pickerLabel: { fontSize: 13, fontFamily: Fonts.bodyMed, color: TextColors.secondary, marginBottom: 6 }, required: { color: TextColors.danger }, pickerWrapper: { minHeight: 48, borderWidth: 1, borderColor: Colors.slate200, borderRadius: Radius.lg, overflow: 'hidden' }, pickerError: { borderColor: TextColors.danger, borderWidth: 2 }, picker: { height: 48, color: TextColors.primary }, error: { color: TextColors.danger, fontSize: 12, marginTop: 6 },
  terms: { fontSize: 12, color: TextColors.muted, lineHeight: 18, marginBottom: Spacing.xl, fontFamily: Fonts.body }, createButton: { marginBottom: Spacing.lg }, loginRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }, loginText: { fontSize: 14, color: TextColors.muted }, loginLink: { fontSize: 14, fontFamily: Fonts.bodySemi, color: TextColors.link },
  success: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: Spacing.md }, successIcon: { width: 64, height: 64, textAlign: 'center', textAlignVertical: 'center', borderRadius: 32, backgroundColor: Colors.green100, color: Colors.green600, fontSize: 32 }, successTitle: { fontSize: 24, fontFamily: Fonts.heading, color: TextColors.primary }, successText: { maxWidth: 420, textAlign: 'center', color: TextColors.secondary, fontFamily: Fonts.body, lineHeight: 21 }, fullButton: { width: '100%', marginTop: Spacing.sm },
});
