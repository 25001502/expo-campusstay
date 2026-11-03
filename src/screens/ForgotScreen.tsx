import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feedback } from '../components/Feedback';
import { KeyboardForm } from '../components/KeyboardForm';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Btn, Input } from '../components/UI';
import { maskEmail, validateForgotPassword } from '../demoAuth';
import { useAuth } from '../state/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { Colors, Fonts, Radius, Spacing, TextColors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Forgot'>;

export default function ForgotScreen({ navigation, route }: Props) {
  const returnTo = route?.params?.returnTo === 'ManagerLogin' ? 'ManagerLogin' : 'Login';
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  useFocusEffect(useCallback(() => { auth.account.clearError(); }, [auth.account]));
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [complete, setComplete] = useState(false);
  const [requestedEmail, setRequestedEmail] = useState('');
  const pending = useRef(false);
  const submit = async () => {
    if (pending.current || auth.busy) return;
    const address = email.trim();
    const nextError = validateForgotPassword(address);
    setError(nextError);
    if (nextError) return;
    pending.current = true;
    try {
      const ok = returnTo === 'ManagerLogin' ? await auth.account.requestReset(address, 'manager') : await auth.account.requestReset(address);
      if (ok) { setRequestedEmail(address); setComplete(true); }
    } finally { pending.current = false; }
  };
  return (
    <KeyboardForm style={styles.flex} scrollStyle={styles.container} contentContainerStyle={[styles.scroll, { paddingLeft: insets.left + Spacing.xl, paddingRight: insets.right + Spacing.xl, paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xl }]}>
        <TouchableOpacity disabled={auth.busy} accessibilityState={{ disabled: auth.busy }} accessibilityRole="button" accessibilityLabel="Back to login" onPress={() => navigation.goBack()} style={styles.backButton}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
        <Feedback message={auth.error} />
        {!complete ? (
          <View style={styles.content}><View style={styles.iconBox}><Ionicons name="key-outline" size={32} color={Colors.blue} importantForAccessibility="no-hide-descendants" /></View><Text accessibilityRole="header" style={styles.title}>Forgot your password?</Text><Text style={styles.subtitle}>Enter the email address linked to your CampusStay account. We&apos;ll send you a link to reset your password.</Text><Input disabled={auth.busy} label="Email address" placeholder="you@example.com" value={email} onChangeText={(value) => { setEmail(value); setError(undefined); auth.account.clearError(); }} error={error} keyboardType="email-address" autoComplete="email" returnKeyType="done" required style={styles.input} /><Btn loading={auth.busy} disabled={!auth.configured} onPress={() => { void submit(); }}>Send reset link</Btn></View>
        ) : (
          <View accessibilityRole="alert" style={[styles.content, styles.successContent]}><View style={[styles.iconBox, styles.successBox]}><Text style={styles.icon}>✓</Text></View><Text accessibilityRole="header" style={styles.title}>Check your email</Text><Text style={styles.subtitle}>If an account is eligible for password recovery, you will receive a reset link. Open the latest email on this device.</Text><Text style={styles.masked}>Entered address: {maskEmail(requestedEmail)}</Text><Btn onPress={() => navigation.popTo(returnTo)} style={styles.backToLogin}>Back to sign in</Btn></View>
        )}
      </KeyboardForm>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, container: { flex: 1, backgroundColor: Colors.white }, scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl }, backButton: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', marginBottom: Spacing.lg }, backText: { color: TextColors.muted, fontSize: 14, fontFamily: Fonts.bodyMed }, content: { flex: 1, gap: Spacing.lg }, successContent: { alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: 72, height: 72, borderRadius: Radius.xl, backgroundColor: Colors.blue100, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm }, successBox: { borderRadius: Radius.full, backgroundColor: Colors.green100 }, icon: { fontSize: 32, color: Colors.green600 }, title: { fontSize: 24, fontFamily: Fonts.heading, color: TextColors.primary }, subtitle: { fontSize: 14, fontFamily: Fonts.body, color: TextColors.secondary, lineHeight: 21 }, input: { marginBottom: Spacing.xs }, masked: { fontSize: 13, fontFamily: Fonts.bodySemi, color: TextColors.primary }, backToLogin: { width: '100%', marginTop: Spacing.sm },
});
