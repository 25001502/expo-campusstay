import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChoiceSheet } from './ChoiceSheet';
import { Colors, Fonts, Radius, Spacing, TextColors } from '../theme';

export type SelectOption = { value: string; label: string };
export function SelectField({ label, value, options, onChange, placeholder = 'Select an option', required = false, error, disabled = false }: {
  label: string; value: string; options: readonly SelectOption[]; onChange: (value: string) => void;
  placeholder?: string; required?: boolean; error?: string; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const trigger = useRef<React.ElementRef<typeof View>>(null);
  const wasOpen = useRef(false);
  const selected = options.find((option) => option.value === value);
  const display = selected?.label ?? placeholder;
  useEffect(() => {
    if (wasOpen.current && !open) {
      const frame = requestAnimationFrame(() => { trigger.current?.focus(); if (trigger.current) AccessibilityInfo.sendAccessibilityEvent(trigger.current, 'focus'); });
      wasOpen.current = false; return () => cancelAnimationFrame(frame);
    }
    wasOpen.current = open;
  }, [open]);
  const close = () => setOpen(false);
  return <View style={styles.group}>
    <Text style={styles.label}>{label}{required ? <Text style={styles.required}> *</Text> : null}</Text>
    <Pressable ref={trigger} accessibilityRole="button" accessibilityLabel={`${label}${required ? ', required' : ''}`} accessibilityValue={{ text: display }} accessibilityHint={error ?? `Opens ${label.toLowerCase()} options`} accessibilityState={{ expanded: open, disabled }} disabled={disabled}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onPress={() => { Keyboard.dismiss(); setOpen(true); }}
      style={({ pressed }) => [styles.field, (focused || open) && styles.focused, error && styles.invalid, pressed && styles.pressed]}>
      <Text style={[styles.value, !selected && styles.placeholder]}>{display}</Text>
      <Ionicons name="chevron-down" size={20} color={Colors.blue} importantForAccessibility="no" />
    </Pressable>
    {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    <ChoiceSheet visible={open} title={label} onClose={close}>
      {options.map((option) => <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ selected: option.value === value }} onPress={() => { onChange(option.value); close(); }} style={({ pressed }) => [styles.option, option.value === value && styles.selected, pressed && styles.pressed]}>
        <Text style={styles.value}>{option.label}</Text><Ionicons name={option.value === value ? 'radio-button-on' : 'radio-button-off'} color={option.value === value ? Colors.blue : Colors.slate500} size={24} importantForAccessibility="no" />
      </Pressable>)}
    </ChoiceSheet>
  </View>;
}
const styles = StyleSheet.create({
  group: { gap: 6 }, label: { fontFamily: Fonts.bodySemi, fontSize: 13, lineHeight: 19, color: TextColors.secondary }, required: { color: TextColors.danger },
  field: { minHeight: 52, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderColor: Colors.slate300, borderRadius: Radius.lg, backgroundColor: Colors.white },
  value: { flex: 1, minWidth: 0, fontFamily: Fonts.bodyMed, fontSize: 14, lineHeight: 22, color: TextColors.primary }, placeholder: { color: TextColors.muted },
  focused: { borderColor: Colors.blue, borderWidth: 2 }, invalid: { borderColor: TextColors.danger, borderWidth: 2 }, pressed: { opacity: 0.8 },
  option: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg }, selected: { backgroundColor: Colors.blue50 },
  error: { color: TextColors.danger, fontFamily: Fonts.body, fontSize: 12, lineHeight: 18 },
});
