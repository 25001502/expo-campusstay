import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Fonts, Spacing, TextColors } from '../theme';

export function Feedback({ message, tone = 'error' }: { message: string; tone?: 'error' | 'status' }) {
  if (!message) return null;
  return <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.text, { color: tone === 'error' ? TextColors.danger : TextColors.secondary }]}>{message}</Text>;
}
const styles = StyleSheet.create({ text: { flexShrink: 1, fontFamily: Fonts.body, fontSize: 14, lineHeight: 22, marginBottom: Spacing.md } });
