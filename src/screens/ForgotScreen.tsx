import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Input } from '../components/UI';
import { AUTH_FEEDBACK, maskEmail, validateForgotPassword } from '../demoAuth';
import type { RootStackParamList } from '../navigation/types';
import { Colors, Fonts, Radius, Spacing, TextColors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Forgot'>;

export default function ForgotScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [complete, setComplete] = useState(false);
  const submit = () => {
    const nextError = validateForgotPassword(email);
    setError(nextError);
    if (!nextError) setComplete(true);
  };
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={[styles.scroll, { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xl }]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to login" onPress={() => navigation.goBack()} style={styles.backButton}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
        {!complete ? (
          <View style={styles.content}><View style={styles.iconBox}><Text style={styles.icon}>🔔</Text></View><Text accessibilityRole="header" style={styles.title}>Forgot your password?</Text><Text style={styles.subtitle}>Enter your email address to review the reset request. Email delivery is not connected yet.</Text><Input label="Email address" placeholder="student@university.ac.za" value={email} onChangeText={(value) => { setEmail(value); setError(undefined); }} error={error} keyboardType="email-address" autoComplete="email" returnKeyType="done" required style={styles.input} /><Btn onPress={submit}>Review reset request</Btn></View>
        ) : (
          <View accessibilityRole="alert" style={[styles.content, styles.successContent]}><View style={[styles.iconBox, styles.successBox]}><Text style={styles.icon}>✓</Text></View><Text accessibilityRole="header" style={styles.title}>Request reviewed</Text><Text style={styles.subtitle}>{AUTH_FEEDBACK.forgot}</Text><Text style={styles.masked}>Entered address: {maskEmail(email)}</Text><Btn onPress={() => navigation.popTo('Login')} style={styles.backToLogin}>Back to sign in</Btn></View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, container: { flex: 1, backgroundColor: Colors.white }, scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl }, backButton: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', marginBottom: Spacing.lg }, backText: { color: TextColors.muted, fontSize: 14, fontFamily: Fonts.bodyMed }, content: { flex: 1, gap: Spacing.lg }, successContent: { alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: 72, height: 72, borderRadius: Radius.xl, backgroundColor: Colors.blue100, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm }, successBox: { borderRadius: Radius.full, backgroundColor: Colors.green100 }, icon: { fontSize: 32, color: Colors.green600 }, title: { fontSize: 24, fontFamily: Fonts.heading, color: TextColors.primary }, subtitle: { fontSize: 14, fontFamily: Fonts.body, color: TextColors.secondary, lineHeight: 21 }, input: { marginBottom: Spacing.xs }, masked: { fontSize: 13, fontFamily: Fonts.bodySemi, color: TextColors.primary }, backToLogin: { width: '100%', marginTop: Spacing.sm },
});
