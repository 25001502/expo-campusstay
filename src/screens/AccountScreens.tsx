import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { KeyboardForm } from '../components/KeyboardForm';
import { Btn, Input } from '../components/UI';
import { Feedback } from '../components/Feedback';
import { canPreviewManager } from '../auth/account';
import { useAuth } from '../state/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { Colors, Fonts, Radius, Spacing, TextColors } from '../theme';
import ManagerScreen from './ManagerScreen';
import { useManagerVerification } from '../verification/useManagerVerification';
import { ManagerVerificationForm } from '../components/ManagerVerificationForm';

function AccountLayout({ title, children, showError = true }: { title: string; children: React.ReactNode; showError?: boolean }) {
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  return <KeyboardForm style={styles.screen} contentContainerStyle={[styles.scroll, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl, paddingLeft: insets.left + Spacing.xl, paddingRight: insets.right + Spacing.xl }]}>
    <StatusBar style="dark" />
    <View style={styles.card}><Text style={styles.brand}>CampusStay</Text><Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {showError ? <Feedback message={auth.error} /> : null}{children}
    </View>
  </KeyboardForm>;
}
export function AccountUnavailableScreen() {
  return <AccountLayout title="Account access unavailable" showError={false}>
    <Feedback message="Sign-in and account creation are currently unavailable. Please check back later." tone="status" />
  </AccountLayout>;
}
export function AccountStatusScreen() {
  const auth = useAuth();
  return <AccountLayout title={auth.phase === 'loading' ? 'Opening your account' : 'Account unavailable'}>
    {auth.phase === 'loading' ? <ActivityIndicator accessibilityLabel="Checking your account" color={Colors.blue} /> : <>
      <Text style={styles.body}>We couldn&apos;t open your account. You can return to sign in.</Text>
      {auth.problem?.retryable !== false ? <Btn loading={auth.busy} onPress={() => { void auth.account.start(); }}>Try again</Btn> : null}
      <Btn variant="secondary" loading={auth.busy} onPress={() => { void auth.account.backToSignIn(); }}>Sign out on this device</Btn>
    </>}
  </AccountLayout>;
}
export function VerificationScreen() {
  const auth = useAuth();
  const [resent, setResent] = useState(false);
  return <AccountLayout title="Confirm your email">
    {auth.intent === 'manager' ? <Text style={styles.step}>Step 1 of 2 · Email confirmation</Text> : null}
    <Text style={styles.body}>Check {auth.email || 'your inbox'} for a confirmation link. Open the latest email on the device where you created your account.</Text>
    <Text style={styles.body}>If this address can be registered, a confirmation email will be sent. Already have an account? Return to sign in.</Text>
    {resent && !auth.error ? <Feedback message="Another confirmation email has been requested. Delivery may take a few minutes." tone="status" /> : null}
    <Btn loading={auth.busy} disabled={!auth.email || !auth.configured} onPress={() => { setResent(false); void auth.account.resend().then((ok) => { if (ok) setResent(true); }); }}>Resend confirmation email</Btn>
    <Btn variant="secondary" loading={auth.busy} onPress={() => { void auth.account.backToSignIn(); }}>Back to sign in</Btn>
  </AccountLayout>;
}
export function PasswordResetScreen() {
  const auth = useAuth();
  const [password, setPassword] = useState(''), [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const changed = auth.problem?.code === 'passwordUpdated';
  const submit = () => {
    if (auth.busy || changed) return;
    const next = { ...(password.length < 8 ? { password: 'Use at least 8 characters.' } : {}), ...(password !== confirm ? { confirm: 'Passwords do not match.' } : {}) };
    setErrors(next);
    if (!Object.keys(next).length) void auth.account.updatePassword(password);
  };
  return <AccountLayout title="Choose a new password">
    <Text style={styles.body}>Save your new password, then sign in again.</Text>
    <Input label="New password" value={password} disabled={auth.busy || changed} onChangeText={(value) => { setPassword(value); setErrors({}); auth.account.clearError(); }} secureTextEntry passwordVisibilityToggle autoComplete="new-password" required error={errors.password} />
    <Input label="Confirm new password" value={confirm} disabled={auth.busy || changed} onChangeText={(value) => { setConfirm(value); setErrors({}); auth.account.clearError(); }} secureTextEntry passwordVisibilityToggle autoComplete="new-password" required error={errors.confirm} />
    {changed ? <Btn loading={auth.busy} onPress={() => { void auth.account.backToSignIn(); }}>Finish signing out</Btn> : <Btn loading={auth.busy} onPress={submit}>Save password</Btn>}
    <Btn variant="ghost" loading={auth.busy} onPress={() => { void auth.account.backToSignIn(); }}>Cancel and sign out</Btn>
  </AccountLayout>;
}
export function ManagerRequestScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'ManagerRequest'>) {
  const auth = useAuth();
  const verification = useManagerVerification();
  const preview = verification.phase === 'unavailable' && !verification.data?.application && canPreviewManager(__DEV__, process.env.EXPO_PUBLIC_ENABLE_MANAGER_PREVIEW, auth.phase === 'authenticated' && !!auth.user);
  if (verification.phase === 'ready' && verification.data?.ready) return <AccountLayout title="Manager verification">
    <ManagerVerificationForm value={verification} controller={verification.controller} fullName={auth.user?.name ?? ''} onWorkspace={() => navigation.navigate('Manager')} onHome={() => navigation.replace('Main', { screen: 'Home' })} onSignOut={() => { void auth.account.signOut(); }} onHelp={() => navigation.navigate('HelpSupport')} />
  </AccountLayout>;
  return <AccountLayout title="Manager verification">
    {verification.phase === 'loading' ? <ActivityIndicator color={Colors.blue} accessibilityLabel="Checking manager verification setup" /> : null}
    <Feedback message={verification.error} />
    <Text style={styles.step}>Step 2 of 2 · Accommodation manager verification</Text>
    <Text style={styles.body}>Signed in as {auth.user?.email}. This is your existing CampusStay account. Opening manager access does not change your permissions.</Text>
    <Feedback tone="status" message="Manager verification is currently unavailable. Any saved application cannot be checked right now. No new submission is confirmed." />
    <Text accessibilityRole="header" style={styles.sectionTitle}>What verification will require</Text>
    <Text style={styles.body}>Contact number</Text>
    <Text style={styles.body}>Accommodation or business name</Text>
    <Text style={styles.body}>Property address or location</Text>
    <Text style={styles.body}>Whether you are the owner or an authorised manager</Text>
    <Text style={styles.body}>Private supporting proof of ownership or management authority</Text>
    <Text style={styles.body}>These details and documents are not collected here while verification is unavailable. When secure verification is available, you can save and submit your details privately. Workspace access requires separate CampusStay approval.</Text>
    <Btn disabled={auth.busy} onPress={() => navigation.replace('Main', { screen: 'Home' })}>Find accommodation</Btn>
    <Btn variant="secondary" disabled={!!verification.busy} onPress={() => { void verification.controller.refresh(); }}>Check verification availability</Btn>
    <Btn variant="ghost" loading={auth.busy} onPress={() => { void auth.account.signOut(); }}>Sign out</Btn>
    {preview ? <Btn variant="secondary" onPress={() => navigation.navigate('Manager')}>Open development workspace preview</Btn> : null}
  </AccountLayout>;
}
export function ManagerAccessScreen(props: NativeStackScreenProps<RootStackParamList, 'Manager'>) {
  const auth = useAuth();
  const verification = useManagerVerification();
  if (verification.phase === 'ready' && verification.data?.ready && verification.data.access.authorized && auth.phase === 'authenticated' && auth.user) return <View style={styles.preview}>
    <Text style={styles.previewLabel}>Workspace portfolio data remains local to this app session.</Text>
    <View style={styles.preview} pointerEvents={verification.busy || !verification.foreground ? 'none' : 'auto'} accessibilityElementsHidden={!!verification.busy || !verification.foreground} importantForAccessibility={verification.busy || !verification.foreground ? 'no-hide-descendants' : 'auto'}><ManagerScreen {...props} /></View>
    {verification.busy ? <ActivityIndicator style={styles.checking} color={Colors.blue} accessibilityLabel="Checking manager permissions" /> : null}
  </View>;
  if (verification.data?.access.state === 'suspended' || verification.data?.access.state === 'revoked') return <AccountLayout title="Manager access unavailable"><Text style={styles.body}>Your manager access is {verification.data.access.state}.</Text><Btn onPress={() => props.navigation.replace('ManagerRequest')}>View verification status</Btn></AccountLayout>;
  if (!(verification.phase === 'unavailable' && !verification.data?.application && canPreviewManager(__DEV__, process.env.EXPO_PUBLIC_ENABLE_MANAGER_PREVIEW, auth.phase === 'authenticated' && !!auth.user))) return <AccountLayout title="Manager access unavailable">
    <Text style={styles.body}>The manager workspace is not available yet. Manager access requires separate CampusStay approval.</Text>
    <Btn onPress={() => props.navigation.replace('ManagerRequest')}>About manager access</Btn>
  </AccountLayout>;
  return <View style={styles.preview}><Text style={styles.previewLabel}>Development preview · Illustrative local portfolio</Text><ManagerScreen {...props} /></View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background }, scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl },
  card: { width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.lg },
  brand: { color: Colors.blue, fontFamily: Fonts.headingSemi, fontSize: 18, lineHeight: 25 }, title: { color: Colors.navy, fontFamily: Fonts.heading, fontSize: 26, lineHeight: 34 },
  body: { color: TextColors.secondary, fontFamily: Fonts.body, fontSize: 14, lineHeight: 22 },
  step: { color: TextColors.link, fontFamily: Fonts.bodySemi, fontSize: 13, lineHeight: 20 },
  sectionTitle: { color: Colors.navy, fontFamily: Fonts.headingSemi, fontSize: 18, lineHeight: 25 },
  preview: { flex: 1 }, previewLabel: { color: TextColors.secondary, backgroundColor: Colors.blue50, fontFamily: Fonts.bodyMed, fontSize: 12, lineHeight: 18, padding: Spacing.sm, textAlign: 'center' },
  checking: { position: 'absolute', top: '50%', alignSelf: 'center' },
});
