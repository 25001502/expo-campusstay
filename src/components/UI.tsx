import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Fonts, Radius, Shadow } from '../theme';

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeVariant = 'blue' | 'green' | 'purple' | 'amber' | 'red' | 'gray';

const badgeStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  blue:   { bg: Colors.blue100,    text: Colors.blue },
  green:  { bg: Colors.green100,   text: Colors.green600 },
  purple: { bg: Colors.purple100,  text: Colors.purple600 },
  amber:  { bg: Colors.amber100,   text: Colors.amber600 },
  red:    { bg: Colors.red100,     text: Colors.red600 },
  gray:   { bg: Colors.slate100,   text: Colors.slate600 },
};

export function Badge({ label, variant = 'blue' }: { label: string; variant?: BadgeVariant }) {
  const { bg, text } = badgeStyles[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: text }]}>{label}</Text>
    </View>
  );
}

export function VerifiedBadge() {
  return (
    <View style={[styles.badge, { backgroundColor: Colors.blue }]}>
      <Text style={[styles.badgeText, { color: Colors.white }]}>✓ Verified</Text>
    </View>
  );
}

export function StarRating({ rating }: { rating: number }) {
  return (
    <Text style={styles.starRating}>★ {rating}</Text>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Btn({
  children,
  onPress,
  variant = 'primary',
  style,
  disabled = false,
  loading = false,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: BtnVariant;
  style?: ViewStyle;
  disabled?: boolean;
  loading?: boolean;
}) {
  const variantStyle: Record<BtnVariant, ViewStyle> = {
    primary:   { backgroundColor: Colors.blue },
    secondary: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.slate200 },
    ghost:     { backgroundColor: 'transparent' },
    danger:    { backgroundColor: Colors.red600 },
  };
  const textColor: Record<BtnVariant, string> = {
    primary:   Colors.white,
    secondary: Colors.slate800,
    ghost:     Colors.slate600,
    danger:    Colors.white,
  };
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[styles.btn, variantStyle[variant], disabled && styles.btnDisabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={textColor[variant]} size="small" />
      ) : typeof children === 'string' ? (
        <Text style={[styles.btnText, { color: textColor[variant] }]}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  style,
  multiline,
}: {
  label?: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  style?: ViewStyle;
  multiline?: boolean;
}) {
  return (
    <View style={[styles.inputWrapper, style]}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        placeholderTextColor={Colors.slate400}
        style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────
export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

// ─── Row ─────────────────────────────────────────────────────────────────────
export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontFamily: Fonts.bodyMed,
  },
  starRating: {
    color: Colors.amber,
    fontSize: 13,
    fontFamily: Fonts.bodySemi,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: Radius.lg,
    gap: 8,
  },
  btnText: {
    fontSize: 15,
    fontFamily: Fonts.bodySemi,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  inputWrapper: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: Fonts.bodyMed,
    color: Colors.slate700,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.slate800,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
  },
  sectionAction: {
    fontSize: 13,
    fontFamily: Fonts.bodyMed,
    color: Colors.blue,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.slate100,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
