import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  StyleProp,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  ControlSize,
  Fonts,
  Interaction,
  Radius,
  Spacing,
  StatusColors,
  TextColors,
  Typography,
} from '../theme';

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeVariant = 'blue' | 'green' | 'purple' | 'amber' | 'red' | 'gray';

const badgeStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  blue:   { bg: StatusColors.blue.background,   text: StatusColors.blue.foreground },
  green:  { bg: StatusColors.green.background,  text: StatusColors.green.foreground },
  purple: { bg: StatusColors.purple.background, text: StatusColors.purple.foreground },
  amber:  { bg: StatusColors.amber.background,  text: StatusColors.amber.foreground },
  red:    { bg: StatusColors.red.background,    text: StatusColors.red.foreground },
  gray:   { bg: StatusColors.gray.background,   text: StatusColors.gray.foreground },
};

export function Badge({
  label,
  variant = 'blue',
  accessibilityLabel = label,
}: {
  label: string;
  variant?: BadgeVariant;
  accessibilityLabel?: string;
}) {
  const { bg, text } = badgeStyles[variant];
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={accessibilityLabel} style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: text }]}>{label}</Text>
    </View>
  );
}

export function VerifiedBadge() {
  return (
    <View accessible accessibilityRole="text" accessibilityLabel="Verified accommodation" style={[styles.badge, { backgroundColor: Colors.blue }]}>
      <Text style={[styles.badgeText, { color: Colors.white }]}>✓ Verified</Text>
    </View>
  );
}

type StatusCategory = 'approved' | 'active' | 'completed' | 'available' | 'pending' | 'under review' | 'upcoming' | 'cancelled' | 'rejected' | 'default';

const statusVariant: Record<StatusCategory, BadgeVariant> = {
  approved: 'green',
  active: 'green',
  completed: 'gray',
  available: 'green',
  pending: 'amber',
  'under review': 'blue',
  upcoming: 'blue',
  cancelled: 'red',
  rejected: 'red',
  default: 'gray',
};

export function StatusBadge({ label, variant }: { label: string; variant?: BadgeVariant }) {
  const normalized = label.toLowerCase() as StatusCategory;
  return (
    <Badge
      label={label}
      variant={variant ?? statusVariant[normalized] ?? statusVariant.default}
      accessibilityLabel={`Status: ${label}`}
    />
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
  accessibilityLabel,
  accessibilityHint,
  selected,
  testID,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: BtnVariant;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  selected?: boolean;
  testID?: string;
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
      onPress={disabled || loading ? undefined : onPress}
      disabled={disabled || loading}
      activeOpacity={Interaction.pressedOpacity}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (typeof children === 'string' ? children : undefined)}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading, selected }}
      testID={testID}
      style={[styles.btn, variantStyle[variant], (disabled || loading) && styles.btnDisabled, style]}
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

// ─── Icon Button ──────────────────────────────────────────────────────────────
export function IconButton({
  icon,
  label,
  onPress,
  hint,
  selected = false,
  disabled = false,
  color = Colors.slate700,
  selectedColor = Colors.white,
  backgroundColor = 'transparent',
  selectedBackgroundColor = Colors.blue,
  iconSize = 22,
  style,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  hint?: string;
  selected?: boolean;
  disabled?: boolean;
  color?: string;
  selectedColor?: string;
  backgroundColor?: string;
  selectedBackgroundColor?: string;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      activeOpacity={Interaction.pressedOpacity}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled, selected }}
      hitSlop={Spacing.xs}
      testID={testID}
      style={[
        styles.iconButton,
        { backgroundColor: selected ? selectedBackgroundColor : backgroundColor },
        disabled && styles.btnDisabled,
        style,
      ]}
    >
      <Ionicons
        name={icon}
        size={iconSize}
        color={selected ? selectedColor : color}
        importantForAccessibility="no-hide-descendants"
      />
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
  helperText,
  error,
  required = false,
  disabled = false,
  autoComplete,
  textContentType,
  returnKeyType,
  passwordVisibilityToggle = false,
  accessibilityLabel,
  onFocus,
  onBlur,
  testID,
}: {
  label?: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  style?: StyleProp<ViewStyle>;
  multiline?: boolean;
  helperText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  returnKeyType?: TextInputProps['returnKeyType'];
  passwordVisibilityToggle?: boolean;
  accessibilityLabel?: string;
  onFocus?: TextInputProps['onFocus'];
  onBlur?: TextInputProps['onBlur'];
  testID?: string;
}) {
  const [focused, setFocused] = React.useState(false);
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  const accessibleLabel = `${accessibilityLabel ?? label ?? placeholder ?? 'Text input'}${required ? ', required' : ''}`;
  const supportingText = error ?? helperText;

  return (
    <View style={[styles.inputWrapper, style]}>
      {label && (
        <Text style={styles.inputLabel}>
          {label}{required ? <Text style={styles.requiredMark}> *</Text> : null}
        </Text>
      )}
      <View style={[styles.inputContainer, focused && styles.inputFocused, !!error && styles.inputError, disabled && styles.inputDisabled]}>
        <TextInput
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !passwordVisible}
          keyboardType={keyboardType}
          multiline={multiline}
          autoComplete={autoComplete}
          textContentType={textContentType}
          returnKeyType={returnKeyType}
          editable={!disabled}
          placeholderTextColor={Colors.slate500}
          accessibilityLabel={accessibleLabel}
          accessibilityHint={error ? `Error: ${error}` : helperText}
          accessibilityState={{ disabled }}
          aria-invalid={!!error}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          testID={testID}
          style={[styles.input, multiline && styles.inputMultiline]}
        />
        {secureTextEntry && passwordVisibilityToggle ? (
          <IconButton
            icon={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
            label={passwordVisible ? 'Hide password' : 'Show password'}
            onPress={() => setPasswordVisible((visible) => !visible)}
            color={Colors.slate600}
            style={styles.passwordToggle}
          />
        ) : null}
      </View>
      {supportingText ? (
        <Text
          accessibilityRole={error ? 'alert' : 'text'}
          accessibilityLiveRegion={error ? 'polite' : 'none'}
          style={[styles.helperText, !!error && styles.errorText]}
        >
          {supportingText}
        </Text>
      ) : null}
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

// ─── Screen Header ────────────────────────────────────────────────────────────
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  backLabel = 'Go back',
  trailingAction,
  style,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  trailingAction?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.screenHeader, style]}>
      {onBack ? (
        <IconButton icon="arrow-back" label={backLabel} onPress={onBack} style={styles.screenHeaderSide} />
      ) : (
        <View style={styles.screenHeaderSide} />
      )}
      <View style={styles.screenHeaderCopy}>
        <Text accessibilityRole="header" style={styles.screenHeaderTitle}>{title}</Text>
        {subtitle ? <Text style={styles.screenHeaderSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.screenHeaderSide}>{trailingAction}</View>
    </View>
  );
}

// ─── Empty and Error States ──────────────────────────────────────────────────
export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  style,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.stateContainer, style]}>
      {icon ? <View importantForAccessibility="no-hide-descendants" style={styles.stateIcon}>{icon}</View> : null}
      <Text accessibilityRole="header" style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateDescription}>{description}</Text>
      {actionLabel && onAction ? <Btn onPress={onAction} style={styles.stateAction}>{actionLabel}</Btn> : null}
    </View>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  retryLabel = 'Try Again',
  onRetry,
  style,
}: {
  title?: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.stateContainer, style]}>
      <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.stateCopy}>
        <Ionicons name="alert-circle-outline" size={36} color={TextColors.danger} importantForAccessibility="no-hide-descendants" />
        <Text accessibilityRole="header" style={styles.stateTitle}>{title}</Text>
        <Text style={styles.stateDescription}>{message}</Text>
      </View>
      {onRetry ? <Btn variant="secondary" onPress={onRetry} style={styles.stateAction}>{retryLabel}</Btn> : null}
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
    fontSize: 12,
    lineHeight: 17,
    fontFamily: Fonts.bodyMed,
  },
  starRating: {
    color: Colors.amber,
    fontSize: 13,
    fontFamily: Fonts.bodySemi,
  },
  btn: {
    minHeight: ControlSize.minimumTouchTarget,
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
    lineHeight: 20,
    fontFamily: Fonts.bodySemi,
    textAlign: 'center',
    flexShrink: 1,
  },
  btnDisabled: {
    opacity: Interaction.disabledOpacity,
  },
  iconButton: {
    width: ControlSize.iconButton,
    height: ControlSize.iconButton,
    minWidth: ControlSize.minimumTouchTarget,
    minHeight: ControlSize.minimumTouchTarget,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: Fonts.bodyMed,
    color: TextColors.secondary,
  },
  requiredMark: {
    color: TextColors.danger,
  },
  inputContainer: {
    minHeight: ControlSize.inputMinimumHeight,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: Radius.lg,
  },
  inputFocused: {
    borderColor: Interaction.focusBorderColor,
    borderWidth: Interaction.focusBorderWidth,
  },
  inputError: {
    borderColor: TextColors.danger,
  },
  inputDisabled: {
    backgroundColor: Colors.slate100,
    opacity: Interaction.disabledOpacity,
  },
  input: {
    flex: 1,
    minHeight: ControlSize.inputMinimumHeight - 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.body,
    color: Colors.slate800,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  passwordToggle: {
    marginRight: 2,
  },
  helperText: {
    ...Typography.caption,
    color: TextColors.muted,
  },
  errorText: {
    color: TextColors.danger,
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
    color: TextColors.link,
  },
  screenHeader: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  screenHeaderSide: {
    width: ControlSize.iconButton,
    minHeight: ControlSize.minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenHeaderCopy: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  screenHeaderTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts.heading,
    color: TextColors.primary,
    textAlign: 'center',
    flexShrink: 1,
  },
  screenHeaderSubtitle: {
    ...Typography.caption,
    color: TextColors.muted,
    textAlign: 'center',
    marginTop: Spacing.xxs,
  },
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxxl,
    gap: Spacing.sm,
  },
  stateCopy: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  stateIcon: {
    marginBottom: Spacing.xs,
  },
  stateTitle: {
    ...Typography.sectionTitle,
    color: TextColors.primary,
    textAlign: 'center',
  },
  stateDescription: {
    ...Typography.body,
    color: TextColors.muted,
    textAlign: 'center',
    maxWidth: 360,
  },
  stateAction: {
    marginTop: Spacing.sm,
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
