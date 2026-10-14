import React from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors, Fonts, Radius, Shadow, Spacing, TextColors } from '../theme';
import { Badge, Btn, EmptyState, ScreenHeader } from '../components/UI';
import { RemoteImage } from '../components/RemoteImage';
import { getBestPropertyIds, getPropertyById } from '../discovery';
import { useFavorites } from '../state/FavoritesContext';
import type { Property } from '../data';
import { getCurrentRooms } from '../rooms';

type Props = NativeStackScreenProps<RootStackParamList, 'Compare'>;

const AMENITY_LIST = ['Wi-Fi', 'Security', 'Gym', 'Parking', 'Laundry', 'Study Area', 'Kitchen'];

type Attribute = {
  label: string;
  direction: 'lower' | 'higher';
  numeric: (property: Property) => number | null | undefined;
  display: (property: Property) => string;
};

function validNumber(value: number | null | undefined, maximum = Infinity, integer = false) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= maximum && (!integer || Number.isInteger(value))
    ? value : undefined;
}

const ATTRIBUTES: Attribute[] = [
  { label: 'Monthly Rent', direction: 'lower', numeric: (property) => validNumber(property.price), display: (property) => `R${property.price.toLocaleString()}` },
  { label: 'Distance', direction: 'lower', numeric: (property) => validNumber(property.distance), display: (property) => `${property.distance} km` },
  { label: 'Rating', direction: 'higher', numeric: (property) => validNumber(property.rating, 5), display: (property) => `${property.rating}★` },
  { label: 'Rooms listed', direction: 'higher', numeric: (property) => validNumber(property.available, Infinity, true), display: (property) => `${property.available} rooms` },
];

export default function CompareScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { favoriteIds } = useFavorites();
  const uniqueIds = [...new Set(Array.isArray(route.params?.ids) ? route.params.ids : [])];
  const compared = uniqueIds.filter((id) => favoriteIds.includes(id))
    .map(getPropertyById).filter((property): property is Property => !!property).slice(0, 3);
  const columnWidth = Math.min(190, Math.max(150, width * 0.48));

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <StatusBar style="dark" />
      <ScreenHeader title="Compare Accommodation" onBack={() => navigation.goBack()} />
      {compared.length < 2 ? (
        <EmptyState
          icon={<Ionicons name="git-compare-outline" size={44} color={Colors.slate500} />}
          title="Choose at least two properties"
          description="Return to Favorites and select two or three saved properties to compare."
          actionLabel="Back to Favorites"
          onAction={() => navigation.goBack()}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + 32 }]}>
          <View style={styles.scrollHint}>
            <Ionicons name="swap-horizontal" size={18} color={Colors.slate600} />
            <Text style={styles.scrollHintText}>Swipe sideways to compare every property.</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.table}>
            <View>
              <View style={styles.row}>
                <View style={styles.labelColumn} />
                {compared.map((property) => {
                  const availableRooms = getCurrentRooms(property).filter((room) => room.available > 0);
                  return (
                    <View key={property.id} style={[styles.propertyColumn, { width: columnWidth }]}>
                      <RemoteImage
                        source={property.images?.[0] ? { uri: property.images[0] } : null}
                        style={styles.propertyImage}
                        accessibilityLabel={`${property.name} accommodation`}
                        fallbackLabel={`${property.name} image unavailable`}
                      />
                      <Text accessibilityRole="header" style={styles.propertyName}>{property.name}</Text>
                      <Text style={styles.propertyCity}>{property.city}</Text>
                      <Btn variant="secondary" onPress={() => navigation.navigate('Property', { property })} style={styles.columnAction}>View Property</Btn>
                      {availableRooms.length === 1 ? (
                        <Btn onPress={() => navigation.navigate('Apply', { property, selectedRoomId: availableRooms[0].id })} style={styles.columnAction}>Apply</Btn>
                      ) : null}
                    </View>
                  );
                })}
              </View>

              {ATTRIBUTES.map((attribute) => {
                const bestIds = getBestPropertyIds(compared, attribute.numeric, attribute.direction);
                return (
                  <View key={attribute.label} style={[styles.row, styles.attributeRow]}>
                    <View style={styles.labelColumn}><Text style={styles.attributeLabel}>{attribute.label}</Text></View>
                    {compared.map((property) => {
                      const value = attribute.numeric(property);
                      const isBest = value !== null && value !== undefined && bestIds.has(property.id);
                      return (
                        <View key={property.id} style={[styles.valueColumn, { width: columnWidth }, isBest && styles.bestColumn]}>
                          <Text style={[styles.attributeValue, isBest && styles.bestValue]}>{value === null || value === undefined ? 'Not provided' : attribute.display(property)}</Text>
                          {isBest ? <Badge label="Best" variant="blue" accessibilityLabel={`Best ${attribute.label}`} /> : null}
                        </View>
                      );
                    })}
                  </View>
                );
              })}

              <Text style={styles.amenitiesTitle}>Amenities</Text>
              {AMENITY_LIST.map((amenity) => (
                <View key={amenity} style={[styles.row, styles.attributeRow]}>
                  <View style={styles.labelColumn}><Text style={styles.attributeLabel}>{amenity}</Text></View>
                  {compared.map((property) => {
                    const available = property.amenities?.includes(amenity);
                    return (
                      <View key={property.id} style={[styles.valueColumn, { width: columnWidth }, available && styles.amenityAvailable]}>
                        <Ionicons name={available ? 'checkmark-circle' : 'remove'} size={22} color={available ? '#166534' : Colors.slate500} />
                        <Text style={styles.srValue}>{available === undefined ? 'Not provided' : available ? 'Included' : 'Not included'}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  page: { paddingVertical: Spacing.md },
  scrollHint: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  scrollHintText: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.body, color: TextColors.muted },
  table: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  row: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  attributeRow: { alignItems: 'stretch' },
  labelColumn: { width: 104, justifyContent: 'center', paddingHorizontal: Spacing.xs },
  propertyColumn: { borderRadius: Radius.lg, padding: 10, gap: Spacing.sm, backgroundColor: Colors.white, alignItems: 'stretch', ...Shadow.sm },
  propertyImage: { width: '100%', aspectRatio: 1.55, borderRadius: Radius.md },
  propertyName: { minHeight: 42, fontSize: 13, lineHeight: 18, fontFamily: Fonts.heading, color: TextColors.primary, textAlign: 'center' },
  propertyCity: { fontSize: 11, lineHeight: 16, fontFamily: Fonts.body, color: TextColors.muted, textAlign: 'center' },
  columnAction: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm },
  valueColumn: { minHeight: 72, borderRadius: Radius.lg, padding: 10, gap: 4, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', ...Shadow.sm },
  bestColumn: { backgroundColor: Colors.blue100, borderWidth: 1, borderColor: Colors.blue },
  attributeLabel: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.bodyMed, color: TextColors.secondary },
  attributeValue: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.heading, color: TextColors.primary, textAlign: 'center' },
  bestValue: { color: TextColors.link },
  amenitiesTitle: { fontSize: 15, lineHeight: 21, fontFamily: Fonts.heading, color: TextColors.primary, marginTop: Spacing.md, marginBottom: Spacing.sm, paddingLeft: Spacing.xs },
  amenityAvailable: { backgroundColor: Colors.green100 },
  srValue: { fontSize: 11, lineHeight: 16, fontFamily: Fonts.body, color: TextColors.secondary, textAlign: 'center' },
});
