import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Btn, Input } from './UI';
import { normalizeAmenities } from '../manager';
import { Colors, Fonts, Radius, Spacing } from '../theme';

const common = ['Wi-Fi', 'Electricity', 'Water', 'Security', 'Parking', 'Laundry', 'Study Area', 'Kitchen'];
export function ManagerAmenities({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [custom, setCustom] = useState('');
  const selected = normalizeAmenities(value);
  const options = normalizeAmenities([...selected, ...common].join(','));
  const toggle = (name: string) => onChange((selected.includes(name) ? selected.filter((item) => item !== name) : [...selected, name]).join(', '));
  return <View style={styles.section}>
    <Text accessibilityRole="header" style={styles.heading}>Amenities</Text>
    <View style={styles.chips}>{options.map((name) => <TouchableOpacity key={name.toLowerCase()} accessibilityRole="checkbox" accessibilityLabel={name} accessibilityState={{ checked: selected.includes(name) }} onPress={() => toggle(name)} style={[styles.chip, selected.includes(name) && styles.active]}><Text style={[styles.text, selected.includes(name) && styles.activeText]}>{name}</Text></TouchableOpacity>)}</View>
    <Input label="Custom amenity" value={custom} onChangeText={setCustom} placeholder="Add another amenity" />
    <Btn variant="secondary" disabled={!custom.trim()} onPress={() => { onChange(normalizeAmenities([...selected, custom].join(',')).join(', ')); setCustom(''); }}>Add Amenity</Btn>
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: Spacing.sm }, heading: { color: Colors.navy, fontFamily: Fonts.heading, fontSize: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.slate200, maxWidth: '100%' },
  active: { borderColor: Colors.blue, backgroundColor: Colors.blue50 },
  text: { color: Colors.slate600, fontFamily: Fonts.bodyMed, fontSize: 13 }, activeText: { color: Colors.blue, fontFamily: Fonts.bodySemi },
});
