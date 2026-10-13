import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Divider, Input } from '../components/UI';
import { AUTH_FEEDBACK, validateLogin, type LoginFields } from '../demoAuth';
import type { RootStackParamList } from '../navigation/types';
import { Colors, Fonts, Radius, Spacing, TextColors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [fields, setFields] = useState<LoginFields>({ email: '', password: '' });
  const [errors, setErrors] = useState<ReturnType<typeof validateLogin>>({});
  const [submitting, setSubmitting] = useState(false);
  const update = (key: keyof LoginFields, value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };
  const submit = () => {
    if (submitting) return;
    const nextErrors = validateLogin(fields);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSubmitting(true);
    requestAnimationFrame(() => navigation.replace('Main'));
  };
  const openManagerWorkspace = () => Alert.alert(
    'Open manager workspace?',
    AUTH_FEEDBACK.manager,
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Open workspace', onPress: () => navigation.replace('Manager') }],
  );

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.xxl }]}>
          <View style={styles.logo}><Text style={styles.logoIcon}>🏠</Text></View>
          <Text style={styles.brand}>CampusStay</Text>
          <Text accessibilityRole="header" style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to manage your accommodation</Text>
        </View>
        <View style={styles.form}>
          <View accessibilityRole="text" style={styles.accessNote}><Text style={styles.accessNoteText}>{AUTH_FEEDBACK.login}</Text></View>
          <Btn variant="secondary" onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'Home' } }] })} style={styles.continueButton}>Continue without signing in</Btn>
          <Input label="Email address" placeholder="student@university.ac.za" value={fields.email} onChangeText={(value) => update('email', value)} error={errors.email} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" returnKeyType="next" required />
          <Input label="Password" placeholder="••••••••" value={fields.password} onChangeText={(value) => update('password', value)} error={errors.password} secureTextEntry passwordVisibilityToggle autoComplete="current-password" textContentType="password" returnKeyType="done" required style={styles.field} />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Forgot password" style={styles.forgotButton} onPress={() => navigation.navigate('Forgot')}><Text style={styles.forgotText}>Forgot password?</Text></TouchableOpacity>
          <Btn loading={submitting} disabled={submitting} onPress={submit} style={styles.primaryButton}>Continue to CampusStay</Btn>
          <View style={styles.dividerRow}><Divider style={styles.divider} /><Text style={styles.orText}>or</Text><Divider style={styles.divider} /></View>
          <Btn variant="secondary" onPress={() => Alert.alert('Google sign-in', AUTH_FEEDBACK.google)} style={styles.googleButton}>Continue with Google</Btn>
          <View style={styles.registerRow}><Text style={styles.registerText}>Don&apos;t have an account? </Text><TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('Register')}><Text style={styles.registerLink}>Create account</Text></TouchableOpacity></View>
          <TouchableOpacity accessibilityRole="button" accessibilityHint={AUTH_FEEDBACK.manager} style={styles.managerButton} onPress={openManagerWorkspace}><Text style={styles.managerText}>Manager workspace →</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, container: { flex: 1, backgroundColor: Colors.white }, scroll: { flexGrow: 1 },
  header: { backgroundColor: Colors.navy, paddingHorizontal: Spacing.xxl, paddingBottom: Spacing.xxxl },
  logo: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  logoIcon: { fontSize: 22 }, brand: { color: Colors.white, fontSize: 20, fontFamily: Fonts.heading, marginBottom: Spacing.md },
  title: { color: Colors.white, fontSize: 28, fontFamily: Fonts.heading, marginBottom: Spacing.xs }, subtitle: { color: Colors.slate300, fontSize: 14, fontFamily: Fonts.body },
  form: { padding: Spacing.xxl, paddingBottom: 40 }, accessNote: { backgroundColor: Colors.blue50, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.xl },
  accessNoteText: { color: TextColors.link, fontSize: 12, lineHeight: 18, fontFamily: Fonts.body }, continueButton: { marginBottom: Spacing.lg }, field: { marginTop: Spacing.md },
  forgotButton: { minHeight: 44, alignSelf: 'flex-end', justifyContent: 'center', marginBottom: Spacing.md }, forgotText: { color: TextColors.link, fontSize: 13, fontFamily: Fonts.bodyMed },
  primaryButton: { marginBottom: Spacing.lg }, dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg }, divider: { flex: 1 }, orText: { color: TextColors.muted, fontSize: 13 },
  googleButton: { marginBottom: Spacing.xxl }, registerRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: Spacing.md }, registerText: { fontSize: 14, color: TextColors.muted }, registerLink: { fontSize: 14, fontFamily: Fonts.bodySemi, color: TextColors.link },
  managerButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, managerText: { fontSize: 13, fontFamily: Fonts.bodyMed, color: Colors.purple600 },
});
