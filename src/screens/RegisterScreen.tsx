import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feedback } from '../components/Feedback';
import { KeyboardForm } from '../components/KeyboardForm';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Input } from '../components/UI';
import { validateAccountRegistration, type AccountRegistration } from '../auth/account';
import { useAuth } from '../state/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { Colors, Fonts, Radius, Spacing, TextColors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Register' | 'ManagerRegister'>;
const EMPTY: AccountRegistration = { fullName: '', email: '', password: '', confirmPassword: '' };
export default function RegisterScreen({ navigation, route }: Props) {
  const manager = route?.name === 'ManagerRegister';
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const stackFooter = fontScale >= 1.3 || width - insets.left - insets.right < 360;
  const auth = useAuth();
  useFocusEffect(useCallback(() => { auth.account.clearError(); }, [auth.account]));
  const [fields, setFields] = useState(EMPTY);
  const [errors, setErrors] = useState<ReturnType<typeof validateAccountRegistration>>({});
  const update = (key: keyof AccountRegistration, value: string) => {
    auth.account.clearError();
    setFields((current) => ({ ...current, [key]: value }));
    const next = validateAccountRegistration({ ...fields, [key]: value });
    setErrors((current) => ({ ...current, [key]: current[key] ? next[key] : undefined,
      ...(key === 'password' && current.confirmPassword ? { confirmPassword: next.confirmPassword } : {}) }));
  };
  const submit = () => {
    if (auth.busy) return;
    const next = validateAccountRegistration(fields); setErrors(next);
    if (!Object.keys(next).length) {
      if (manager) void auth.account.register(fields, 'manager');
      else void auth.account.register(fields);
    }
  };
  return <KeyboardForm style={[styles.flex, { paddingLeft: insets.left, paddingRight: insets.right }]} scrollStyle={styles.container} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.xxl }]}>
    <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
      <TouchableOpacity disabled={auth.busy} accessibilityState={{ disabled: auth.busy }} accessibilityRole="button" accessibilityLabel={manager ? 'Back to manager login' : 'Back to login'} onPress={() => manager ? navigation.popTo('ManagerLogin') : navigation.goBack()} style={styles.backButton}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
      <Text accessibilityRole="header" style={styles.title}>{manager ? 'Create manager account' : 'Create account'}</Text>
    </View>
    <View style={styles.form}>
      <View style={styles.infoBanner}><Text style={styles.infoTitle}>{manager ? 'Step 1 of 2 · Account information' : 'One account, more possibilities'}</Text><Text style={styles.infoText}>{manager ? 'Create your CampusStay account and confirm your email. Then continue to manager verification. Manager Workspace access requires separate CampusStay approval.' : 'Find student accommodation or apply to list your property with CampusStay.'}</Text></View>
      <Input disabled={auth.busy} label="Full name" placeholder="Siyanda Dlamini" value={fields.fullName} onChangeText={(value) => update('fullName', value)} error={errors.fullName} autoComplete="name" required style={styles.field} />
      <Input disabled={auth.busy} label="Email address" placeholder="you@example.com" value={fields.email} onChangeText={(value) => update('email', value)} error={errors.email} keyboardType="email-address" autoComplete="email" required style={styles.field} />
      <Input disabled={auth.busy} label="Password" placeholder="At least 8 characters" value={fields.password} onChangeText={(value) => update('password', value)} error={errors.password} helperText="Use a unique password with at least 8 characters." secureTextEntry passwordVisibilityToggle autoComplete="new-password" required style={styles.field} />
      <Input disabled={auth.busy} label="Confirm password" placeholder="Repeat password" value={fields.confirmPassword} onChangeText={(value) => update('confirmPassword', value)} error={errors.confirmPassword} secureTextEntry passwordVisibilityToggle autoComplete="new-password" required style={styles.field} />
      <Feedback message={auth.error} />
      <Btn loading={auth.busy} disabled={!auth.configured} onPress={submit} style={styles.createButton}>Create account</Btn>
      <View style={[styles.loginRow, stackFooter && styles.loginRowStacked]}><Text style={styles.loginText}>Already have an account?</Text><TouchableOpacity disabled={auth.busy} accessibilityState={{ disabled: auth.busy }} accessibilityRole="button" style={styles.loginButton} onPress={() => navigation.popTo(manager ? 'ManagerLogin' : 'Login')}><Text style={styles.loginLink}>Back to sign in</Text></TouchableOpacity></View>
    </View>
  </KeyboardForm>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, container: { flex: 1, backgroundColor: Colors.white }, scroll: { flexGrow: 1 }, header: { backgroundColor: Colors.navy, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl },
  backButton: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', marginBottom: Spacing.xs }, backText: { color: Colors.slate300, fontSize: 14, fontFamily: Fonts.bodyMed }, title: { color: Colors.white, fontSize: 26, fontFamily: Fonts.heading },
  form: { padding: Spacing.xl }, infoBanner: { backgroundColor: Colors.blue50, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.lg }, infoTitle: { color: TextColors.link, fontSize: 14, fontFamily: Fonts.bodySemi }, infoText: { color: TextColors.secondary, fontSize: 12, lineHeight: 18, fontFamily: Fonts.body, marginTop: Spacing.xs },
  field: { marginBottom: Spacing.md }, pickerLabel: { fontSize: 13, fontFamily: Fonts.bodyMed, color: TextColors.secondary, marginBottom: 6 }, required: { color: TextColors.danger }, pickerWrapper: { minHeight: 48, borderWidth: 1, borderColor: Colors.slate200, borderRadius: Radius.lg, overflow: 'hidden' }, pickerError: { borderColor: TextColors.danger, borderWidth: 2 }, picker: { height: 48, color: TextColors.primary }, error: { color: TextColors.danger, fontSize: 12, marginTop: 6 },
  terms: { fontSize: 12, color: TextColors.muted, lineHeight: 18, marginBottom: Spacing.xl, fontFamily: Fonts.body }, createButton: { marginBottom: Spacing.lg },
  loginRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
  loginRowStacked: { flexDirection: 'column' },
  loginText: { flexShrink: 1, fontSize: 14, lineHeight: 21, fontFamily: Fonts.body, color: TextColors.muted, textAlign: 'center' },
  loginLink: { fontSize: 14, lineHeight: 21, fontFamily: Fonts.bodySemi, color: TextColors.link, textAlign: 'center' },
  loginButton: { minHeight: 44, maxWidth: '100%', justifyContent: 'center', paddingHorizontal: Spacing.xs },
  success: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: Spacing.md }, successIcon: { width: 64, height: 64, textAlign: 'center', textAlignVertical: 'center', borderRadius: 32, backgroundColor: Colors.green100, color: Colors.green600, fontSize: 32 }, successTitle: { fontSize: 24, fontFamily: Fonts.heading, color: TextColors.primary }, successText: { maxWidth: 420, textAlign: 'center', color: TextColors.secondary, fontFamily: Fonts.body, lineHeight: 21 }, fullButton: { width: '100%', marginTop: Spacing.sm },
});
