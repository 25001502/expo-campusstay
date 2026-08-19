import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Colors, Fonts, Radius, Shadow } from '../theme';
import { properties } from '../data';

type Props = NativeStackScreenProps<RootStackParamList, 'Compare'>;

const AMENITY_LIST = ['Wi-Fi', 'Security', 'Gym', 'Parking', 'Laundry', 'Study Area', 'Kitchen'];

export default function CompareScreen({ navigation, route }: Props) {
  const { ids } = route.params;
  const insets = useSafeAreaInsets();
  const props = properties.filter((p) => ids.includes(p.id));

  const attrs = [
    { label: 'Monthly Rent', getValue: (p: typeof props[0]) => `R${p.price.toLocaleString()}`, lower: true },
    { label: 'Distance', getValue: (p: typeof props[0]) => `${p.distance} km`, lower: true },
    { label: 'Rating', getValue: (p: typeof props[0]) => `${p.rating}★`, lower: false },
    { label: 'Available', getValue: (p: typeof props[0]) => `${p.available} rooms`, lower: false },
  ];

  const getBestIdx = (values: string[], lower: boolean) => {
    const nums = values.map((v) => parseFloat(v.replace(/[^0-9.]/g, '')));
    const best = lower ? Math.min(...nums) : Math.max(...nums);
    return nums.indexOf(best);
  };

  const COL_W = 140;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Compare Accommodation</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {/* Property headers */}
          <View style={styles.row}>
            <View style={[styles.labelCol]} />
            {props.map((p) => (
              <View key={p.id} style={[styles.col, { width: COL_W }]}>
                <Image source={{ uri: p.images[0] }} style={styles.propImage} contentFit="cover" />
                <Text style={styles.propName} numberOfLines={2}>{p.name}</Text>
                <Text style={styles.propCity}>{p.city}</Text>
              </View>
            ))}
          </View>

          {/* Attribute rows */}
          {attrs.map((attr) => {
            const vals = props.map((p) => attr.getValue(p));
            const bestIdx = getBestIdx(vals, attr.lower);
            return (
              <View key={attr.label} style={[styles.row, styles.attrRow]}>
                <View style={styles.labelCol}>
                  <Text style={styles.attrLabel}>{attr.label}</Text>
                </View>
                {props.map((p, i) => (
                  <View key={p.id} style={[styles.col, { width: COL_W }, i === bestIdx && styles.bestCol]}>
                    <Text style={[styles.attrVal, i === bestIdx && styles.attrValBest]}>
                      {attr.getValue(p)}
                    </Text>
                    {i === bestIdx && <Text style={styles.bestLabel}>Best</Text>}
                  </View>
                ))}
              </View>
            );
          })}

          {/* Amenities */}
          <Text style={styles.amenitiesTitle}>Amenities</Text>
          {AMENITY_LIST.map((a) => (
            <View key={a} style={[styles.row, styles.attrRow]}>
              <View style={styles.labelCol}>
                <Text style={styles.attrLabel}>{a}</Text>
              </View>
              {props.map((p) => (
                <View key={p.id} style={[styles.col, { width: COL_W }, p.amenities.includes(a) && styles.amenityHas]}>
                  <Text style={[styles.amenityCheck, p.amenities.includes(a) && styles.amenityCheckHas]}>
                    {p.amenities.includes(a) ? '✓' : '—'}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.slate100 },
  backText: { fontSize: 22, color: Colors.slate600, width: 24 },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontFamily: Fonts.heading, color: Colors.slate900 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  attrRow: { alignItems: 'center' },
  labelCol: { width: 100, justifyContent: 'center' },
  col: { borderRadius: Radius.lg, padding: 10, backgroundColor: Colors.white, alignItems: 'center', ...Shadow.sm },
  bestCol: { backgroundColor: Colors.blue },
  propImage: { width: '100%', height: 80, borderRadius: Radius.md, marginBottom: 8 },
  propName: { fontSize: 12, fontFamily: Fonts.heading, color: Colors.slate900, textAlign: 'center' },
  propCity: { fontSize: 11, fontFamily: Fonts.body, color: Colors.slate400, textAlign: 'center', marginTop: 2 },
  attrLabel: { fontSize: 12, fontFamily: Fonts.bodyMed, color: Colors.slate500 },
  attrVal: { fontSize: 14, fontFamily: Fonts.heading, color: Colors.slate800, textAlign: 'center' },
  attrValBest: { color: Colors.white },
  bestLabel: { fontSize: 10, fontFamily: Fonts.bodyMed, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  amenitiesTitle: { fontSize: 15, fontFamily: Fonts.heading, color: Colors.slate900, marginTop: 12, marginBottom: 8 },
  amenityHas: { backgroundColor: Colors.green100 },
  amenityCheck: { fontSize: 16, color: Colors.slate300 },
  amenityCheckHas: { color: Colors.green600 },
});
