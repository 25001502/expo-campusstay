import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Btn, StatusBadge } from './UI';
import { FUNDING_LABELS, FUNDING_SOURCES, emptyFunding, normalizeFunding, type FundingDeclaration, type NsfasStatus } from '../funding';
import { Colors, Fonts, Spacing, TextColors } from '../theme';

const options: { value: NsfasStatus; label: string }[] = [
  { value: 'pending', label: 'Awaiting NSFAS confirmation' },
  { value: 'confirmed', label: 'NSFAS has confirmed my funding' },
  { value: 'unsuccessful', label: 'NSFAS application unsuccessful' },
];

export function FundingFields({ funding, onChange, disabled = false, error }: { funding: FundingDeclaration; onChange: (value: FundingDeclaration) => void; disabled?: boolean; error?: string }) {
  const value = normalizeFunding(funding);
  const radio = (label: string, selected: boolean, onPress: () => void) => <TouchableOpacity key={label} disabled={disabled} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ selected, disabled }} onPress={onPress} style={styles.row}>
    <View style={[styles.circle, selected && styles.active]}>{selected ? <View style={styles.dot} /> : null}</View><Text style={styles.option}>{label}</Text>
  </TouchableOpacity>;
  return <View style={styles.group}>
    <Text style={styles.body}>Declare how you intend to pay. This does not verify funding.</Text>
    {FUNDING_SOURCES.map((source) => radio(FUNDING_LABELS[source], value.source === source, () => onChange({ source, ...(source === 'nsfas' ? { nsfasStatus: value.source === 'nsfas' ? value.nsfasStatus : 'pending' as const } : {}), paymentDiscussionRequested: value.paymentDiscussionRequested })))}
    {value.source === 'nsfas' ? <View style={styles.group}>
      <Text accessibilityRole="header" style={styles.heading}>Your NSFAS status</Text>
      {options.map((option) => radio(option.label, value.nsfasStatus === option.value, () => onChange({ ...value, nsfasStatus: option.value })))}
      {value.nsfasStatus === 'pending' ? <><View style={styles.badge}><StatusBadge label="Funding pending" variant="amber" /></View><Text style={styles.body}>You can continue while waiting for your NSFAS outcome. Attach supporting information now or update your funding details later. Each residence sets its own funding requirements.</Text></> : null}
      {value.nsfasStatus === 'confirmed' ? <Text style={styles.body}>You report that NSFAS confirmed your funding. You can attach a confirmation letter below; it remains optional and is not independently verified.</Text> : null}
      {value.nsfasStatus === 'unsuccessful' ? <Text style={styles.body}>You can update how you plan to pay for accommodation. Each residence sets its own payment requirements. This declaration does not reject your accommodation application.</Text> : null}
    </View> : value.source === 'self-funded' ? <Text style={styles.body}>I will pay for my accommodation using my own funds. Proof of Funding is optional; no NSFAS letter is required.</Text> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {value.source ? <>
      <TouchableOpacity disabled={disabled} accessibilityRole="checkbox" accessibilityLabel="I would like to discuss payment arrangements" accessibilityState={{ checked: value.paymentDiscussionRequested, disabled }} onPress={() => onChange({ ...value, paymentDiscussionRequested: !value.paymentDiscussionRequested })} style={styles.row}>
        <Ionicons name={value.paymentDiscussionRequested ? 'checkbox' : 'square-outline'} size={24} color={Colors.blue} /><Text style={styles.option}>I would like to discuss payment arrangements.</Text>
      </TouchableOpacity>
      <Text style={styles.body}>This preference is recorded here only. No message is sent and no payment plan is created.</Text>
      <Btn variant="ghost" disabled={disabled} onPress={() => onChange(emptyFunding())}>Clear funding declaration</Btn>
    </> : <Text style={styles.body}>Funding declaration is optional at this stage.</Text>}
  </View>;
}
const styles = StyleSheet.create({
  group: { gap: Spacing.sm }, badge: { alignItems: 'flex-start' },
  heading: { fontFamily: Fonts.headingSemi, fontSize: 16, lineHeight: 23, color: TextColors.primary, marginTop: Spacing.sm },
  body: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 20, color: TextColors.secondary },
  option: { flex: 1, minWidth: 0, fontFamily: Fonts.bodyMed, fontSize: 14, lineHeight: 22, color: TextColors.primary },
  row: { minHeight: 48, paddingVertical: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  circle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.slate300, alignItems: 'center', justifyContent: 'center' }, active: { borderColor: Colors.blue }, dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.blue },
  error: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 20, color: TextColors.danger },
});
