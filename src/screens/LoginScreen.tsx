import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Feedback } from '../components/Feedback';
import { KeyboardForm } from '../components/KeyboardForm';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Input } from '../components/UI';
import { validateAccount } from '../auth/account';
import { useAuth } from '../state/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { Colors, Fonts, Interaction, Radius, Spacing, TextColors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login' | 'ManagerLogin'>;

export default function LoginScreen({ navigation, route }: Props) {
  const manager = route?.name === 'ManagerLogin';
  const insets = useSafeAreaInsets();
  const { height, fontScale } = useWindowDimensions();
  const compact = height < 720 || fontScale > 1.25;
  const auth = useAuth();
  useFocusEffect(useCallback(() => { auth.account.clearError(); }, [auth.account]));
  const [fields, setFields] = useState<{ email: string; password: string }>({ email: '', password: '' });
  const [errors, setErrors] = useState<ReturnType<typeof validateAccount>>({});
  const update = (key: 'email' | 'password', value: string) => {
    auth.account.clearError();
    setFields((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };
  const submit = () => {
    if (auth.busy) return;
    const nextErrors = validateAccount(fields);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    if (manager) void auth.account.signIn(fields.email, fields.password, 'manager');
    else void auth.account.signIn(fields.email, fields.password);
  };


  return (
    <KeyboardForm style={[styles.flex, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]} contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]} scrollStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: compact ? Spacing.xl : Spacing.xxl }]}>
          <View style={[styles.contentWidth, styles.headerContentWidth]}>
            {manager ? <TouchableOpacity disabled={auth.busy} accessibilityRole="button" accessibilityLabel="Back to student login" accessibilityState={{ disabled: auth.busy }} onPress={() => navigation.popTo('Login')} style={styles.backButton}><Text style={styles.backText}>← Student sign in</Text></TouchableOpacity> : null}
            <View style={styles.brandRow}>
              <View importantForAccessibility="no-hide-descendants" style={[styles.logo, compact && styles.logoCompact]}>{manager ? <Ionicons name="business-outline" size={24} color={Colors.white} /> : <Text maxFontSizeMultiplier={1.2} style={styles.logoIcon}>🏠</Text>}</View>
              <Text style={styles.brand}>CampusStay</Text>
            </View>
            <Text accessibilityRole="header" style={styles.title}>{manager ? 'Manager Portal' : 'Welcome back'}</Text>
            <Text style={styles.subtitle}>{manager ? 'Sign in to manage your accommodation properties.' : 'Sign in to continue to CampusStay.'}</Text>
          </View>
        </View>
        <View style={[styles.form, styles.contentWidth]}>
          <Input disabled={auth.busy} label="Email address" placeholder="you@example.com" value={fields.email} onChangeText={(value) => update('email', value)} error={errors.email} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" returnKeyType="next" multiline={false} required />
          <Input disabled={auth.busy} label="Password" placeholder="••••••••" value={fields.password} onChangeText={(value) => update('password', value)} error={errors.password} secureTextEntry passwordVisibilityToggle autoComplete="current-password" textContentType="password" returnKeyType="done" onSubmitEditing={submit} submitBehavior="blurAndSubmit" multiline={false} required style={styles.field} />
          <TouchableOpacity disabled={auth.busy} accessibilityState={{ disabled: auth.busy }} accessibilityRole="button" accessibilityLabel="Forgot password" activeOpacity={Interaction.pressedOpacity} style={styles.forgotButton} onPress={() => manager ? navigation.navigate('Forgot', { returnTo: 'ManagerLogin' }) : navigation.navigate('Forgot')}><Text style={styles.forgotText}>Forgot password?</Text></TouchableOpacity>
          <Feedback message={auth.error} />
          <Btn loading={auth.busy} disabled={!auth.configured} accessibilityHint={manager ? 'Signs in with your CampusStay account; manager approval is required separately' : 'Signs in with your verified CampusStay account'} onPress={submit} style={styles.primaryButton}>{manager ? 'Sign In as Manager' : 'Sign In'}</Btn>
          <View style={styles.footer}>
            <View style={styles.registerRow}><Text style={styles.registerText}>{manager ? 'New property manager?' : "Don't have an account?"}</Text><TouchableOpacity disabled={auth.busy} accessibilityState={{ disabled: auth.busy }} accessibilityRole="button" accessibilityLabel={manager ? 'Register as a property manager' : 'Create account'} activeOpacity={Interaction.pressedOpacity} style={styles.footerLink} onPress={() => navigation.navigate(manager ? 'ManagerRegister' : 'Register')}><Text style={styles.registerLink}>{manager ? 'Register here' : 'Create account'}</Text></TouchableOpacity></View>
            {!manager ? <TouchableOpacity disabled={auth.busy} accessibilityRole="button" accessibilityLabel="Manager Access" accessibilityHint="Opens the separate manager sign-in journey" accessibilityState={{ disabled: auth.busy }} activeOpacity={Interaction.pressedOpacity} onPress={() => navigation.navigate('ManagerLogin')} style={styles.managerAccess}>
              <Ionicons name="business-outline" size={19} color={TextColors.link} importantForAccessibility="no-hide-descendants" /><Text style={styles.managerAccessText}>Manager Access</Text><Ionicons name="chevron-forward" size={18} color={TextColors.muted} importantForAccessibility="no-hide-descendants" />
            </TouchableOpacity> : null}
          </View>
        </View>
      </KeyboardForm>
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
  field: { marginTop: Spacing.lg },
  forgotButton: { minHeight: 44, alignSelf: 'flex-end', justifyContent: 'center', paddingHorizontal: Spacing.xs, marginBottom: Spacing.sm },
  forgotText: { color: TextColors.link, fontSize: 13, lineHeight: 18, fontFamily: Fonts.bodyMed },
  primaryButton: { marginBottom: Spacing.xl, minHeight: 52 },
  footer: { borderTopWidth: 1, borderTopColor: Colors.slate100, paddingTop: Spacing.md },
  registerRow: { minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: Spacing.xs },
  registerText: { fontSize: 14, lineHeight: 21, fontFamily: Fonts.body, color: TextColors.muted, textAlign: 'center' },
  footerLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.xs },
  registerLink: { fontSize: 14, lineHeight: 21, fontFamily: Fonts.bodySemi, color: TextColors.link },
  backButton: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', marginBottom: Spacing.sm },
  backText: { color: Colors.slate300, fontSize: 14, lineHeight: 21, fontFamily: Fonts.bodyMed },
  managerAccess: { borderTopWidth: 1, borderTopColor: Colors.slate100, marginTop: Spacing.md, paddingVertical: Spacing.md, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  managerAccessText: { flexShrink: 1, color: TextColors.link, fontSize: 14, lineHeight: 21, fontFamily: Fonts.bodyMed },
});
