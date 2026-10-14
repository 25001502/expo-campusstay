import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from './UI';
import { Colors, Fonts, Radius, Shadow, Spacing, TextColors } from '../theme';

export function ProfileLayout({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={[styles.page, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar style="dark" />
      <ScreenHeader title={title} onBack={onBack} backLabel="Back to Profile" />
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, Spacing.xxl) }]}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.card}><Text accessibilityRole="header" style={styles.heading}>{title}</Text>{children}</View>;
}

export const profileStyles = StyleSheet.create({
  card: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md, borderWidth: 1, borderColor: Colors.slate100, ...Shadow.sm },
  heading: { fontFamily: Fonts.headingSemi, fontSize: 18, lineHeight: 25, color: TextColors.primary },
  body: { fontFamily: Fonts.body, fontSize: 14, lineHeight: 22, color: TextColors.secondary },
  label: { fontFamily: Fonts.bodyMed, fontSize: 13, lineHeight: 19, color: TextColors.muted },
  value: { fontFamily: Fonts.bodyMed, fontSize: 15, lineHeight: 23, color: TextColors.primary },
  detail: { gap: Spacing.xs, paddingVertical: Spacing.sm },
  error: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 20, color: TextColors.danger },
  feedback: { fontFamily: Fonts.bodyMed, fontSize: 14, lineHeight: 22, color: TextColors.link },
  pickerBox: { borderWidth: 1, borderColor: Colors.slate200, borderRadius: Radius.md, overflow: 'hidden', minHeight: 48 },
});

const styles = StyleSheet.create({
  ...profileStyles,
  page: { flex: 1, backgroundColor: Colors.background },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: Spacing.lg, gap: Spacing.lg },
});
