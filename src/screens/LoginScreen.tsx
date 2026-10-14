import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Divider, Input } from '../components/UI';
import { AUTH_FEEDBACK, validateLogin, type LoginFields } from '../demoAuth';
import type { RootStackParamList } from '../navigation/types';
import { Colors, Fonts, Interaction, Radius, Spacing, TextColors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { height, fontScale } = useWindowDimensions();
  const compact = height < 720 || fontScale > 1.25;
  const [fields, setFields] = useState<LoginFields>({ email: '', password: '' });
  const [errors, setErrors] = useState<ReturnType<typeof validateLogin>>({});
  const update = (key: keyof LoginFields, value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };
  const submit = () => {
    const nextErrors = validateLogin(fields);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    Alert.alert('Sign-in unavailable', AUTH_FEEDBACK.login);
  };
  const openManagerWorkspace = () => Alert.alert(
    'Open manager workspace?',
    AUTH_FEEDBACK.manager,
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Open workspace', onPress: () => navigation.replace('Manager') }],
  );

  return (
    <KeyboardAvoidingView style={[styles.flex, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: compact ? Spacing.xl : Spacing.xxl }]}>
          <View style={[styles.contentWidth, styles.headerContentWidth]}>
            <View style={styles.brandRow}>
              <View importantForAccessibility="no-hide-descendants" style={[styles.logo, compact && styles.logoCompact]}><Text maxFontSizeMultiplier={1.2} style={styles.logoIcon}>🏠</Text></View>
              <Text style={styles.brand}>CampusStay</Text>
            </View>
            <Text accessibilityRole="header" style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to manage your accommodation</Text>
          </View>
        </View>
        <View style={[styles.form, styles.contentWidth]}>
          <Input label="Email address" placeholder="you@example.com" value={fields.email} onChangeText={(value) => update('email', value)} error={errors.email} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" returnKeyType="next" multiline={false} required />
          <Input label="Password" placeholder="••••••••" value={fields.password} onChangeText={(value) => update('password', value)} error={errors.password} secureTextEntry passwordVisibilityToggle autoComplete="current-password" textContentType="password" returnKeyType="done" onSubmitEditing={submit} submitBehavior="blurAndSubmit" multiline={false} required style={styles.field} />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Forgot password" activeOpacity={Interaction.pressedOpacity} style={styles.forgotButton} onPress={() => navigation.navigate('Forgot')}><Text style={styles.forgotText}>Forgot password?</Text></TouchableOpacity>
          <Btn accessibilityHint="Validates the form and explains sign-in availability" onPress={submit} style={styles.primaryButton}>Sign In</Btn>
          <View style={styles.dividerRow}><Divider style={styles.divider} /><Text style={styles.orText}>or</Text><Divider style={styles.divider} /></View>
          <Btn variant="secondary" accessibilityLabel="Sign in with Google" accessibilityHint="Explains Google sign-in availability" onPress={() => Alert.alert('Google sign-in unavailable', AUTH_FEEDBACK.google)} style={styles.googleButton}>
            <View style={styles.googleContent}>
              {/* Official artwork: https://developers.google.com/identity/branding-guidelines */}
              <Image source={require('../../assets/google-g.png')} style={styles.googleIcon} resizeMode="contain" accessible={false} importantForAccessibility="no-hide-descendants" />
              <Text style={styles.googleText}>Sign in with Google</Text>
            </View>
          </Btn>
          <Btn variant="secondary" accessibilityHint="Opens the student Home screen without credentials" onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'Home' } }] })} style={styles.continueButton}>Continue without signing in</Btn>
          <View style={styles.footer}>
            <View style={styles.registerRow}><Text style={styles.registerText}>Don&apos;t have an account?</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Create account" activeOpacity={Interaction.pressedOpacity} style={styles.footerLink} onPress={() => navigation.navigate('Register')}><Text style={styles.registerLink}>Create account</Text></TouchableOpacity></View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open manager workspace" accessibilityHint={AUTH_FEEDBACK.manager} activeOpacity={Interaction.pressedOpacity} style={styles.managerButton} onPress={openManagerWorkspace}><Text style={styles.managerText}>Manager workspace →</Text></TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.navy },
  container: { flex: 1, backgroundColor: Colors.white },
  scroll: { flexGrow: 1 },
  contentWidth: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  headerContentWidth: { maxWidth: 520 - Spacing.xxl * 2 },
  header: { backgroundColor: Colors.navy, paddingHorizontal: Spacing.xxl, paddingBottom: Spacing.xxxl, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xxl },
  logo: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center' },
  logoCompact: { width: 44, height: 44 },
  logoIcon: { fontSize: 22 },
  brand: { flexShrink: 1, color: Colors.white, fontSize: 18, lineHeight: 24, fontFamily: Fonts.headingSemi, letterSpacing: -0.2 },
  title: { color: Colors.white, fontSize: 28, lineHeight: 35, letterSpacing: -0.5, fontFamily: Fonts.heading, marginBottom: Spacing.sm },
  subtitle: { color: Colors.slate300, fontSize: 14, lineHeight: 22, fontFamily: Fonts.body },
  form: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.xxxl },
  continueButton: { backgroundColor: Colors.blue50, borderColor: Colors.blue100, marginBottom: Spacing.xxl },
  field: { marginTop: Spacing.lg },
  forgotButton: { minHeight: 44, alignSelf: 'flex-end', justifyContent: 'center', paddingHorizontal: Spacing.xs, marginBottom: Spacing.sm },
  forgotText: { color: TextColors.link, fontSize: 13, lineHeight: 18, fontFamily: Fonts.bodyMed },
  primaryButton: { marginBottom: Spacing.xl, minHeight: 52 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xl },
  divider: { flex: 1 },
  orText: { color: TextColors.muted, fontSize: 13, lineHeight: 18, fontFamily: Fonts.body },
  googleButton: { marginBottom: Spacing.md },
  googleContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, flexShrink: 1 },
  googleIcon: { width: 20, height: 20, flexShrink: 0 },
  googleText: { color: Colors.slate800, fontSize: 15, lineHeight: 20, fontFamily: Fonts.bodySemi, textAlign: 'center', flexShrink: 1 },
  footer: { borderTopWidth: 1, borderTopColor: Colors.slate100, paddingTop: Spacing.md },
  registerRow: { minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: Spacing.xs },
  registerText: { fontSize: 14, lineHeight: 21, fontFamily: Fonts.body, color: TextColors.muted, textAlign: 'center' },
  footerLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.xs },
  registerLink: { fontSize: 14, lineHeight: 21, fontFamily: Fonts.bodySemi, color: TextColors.link },
  managerButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xs },
  managerText: { fontSize: 13, lineHeight: 18, fontFamily: Fonts.bodyMed, color: Colors.purple600, textAlign: 'center' },
});
