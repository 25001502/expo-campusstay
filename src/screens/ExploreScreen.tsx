import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StudentTabScreenProps } from '../navigation/types';
import { Colors, Fonts, Radius, Spacing, TextColors } from '../theme';
import { Btn, EmptyState, IconButton } from '../components/UI';
import { PropertyCard } from '../components/PropertyCard';
import { properties, universities } from '../data';
import {
  createDefaultDiscoveryFilters,
  DEFAULT_MAXIMUM_PRICE,
  filterAndSortProperties,
  type DiscoverySort,
} from '../discovery';
import { useFavorites } from '../state/FavoritesContext';

type Props = StudentTabScreenProps<'Explore'>;

const amenityOptions = ['Wi-Fi', 'Security', 'Parking', 'Laundry', 'Study Area', 'Kitchen', 'Gym'];
const sortOptions: { value: DiscoverySort; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price-low', label: 'Price: Low' },
  { value: 'price-high', label: 'Price: High' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'distance', label: 'Nearest' },
];

export default function ExploreScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { isFavorite, toggleFavorite } = useFavorites();
  const defaults = createDefaultDiscoveryFilters();
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<DiscoverySort>(defaults.sort);
  const [maximumPrice, setMaximumPrice] = useState(defaults.maximumPrice);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(defaults.amenities);
  const query = route.params?.query ?? defaults.query;
  const universityId = route.params?.universityId;
  const quickFilter = route.params?.quickFilter;
  const updateRouteContext = (updates: Partial<NonNullable<Props['route']['params']>>) => {
    navigation.setParams({ ...route.params, ...updates });
  };

  const filtered = useMemo(() => filterAndSortProperties(properties, {
    query,
    maximumPrice,
    amenities: selectedAmenities,
    universityId,
    quickFilter,
    sort,
  }), [maximumPrice, query, quickFilter, selectedAmenities, sort, universityId]);

  const selectedUniversity = universities.find((university) => university.id === universityId);
  const activeFilterCount = selectedAmenities.length
    + (maximumPrice < DEFAULT_MAXIMUM_PRICE ? 1 : 0)
    + (universityId ? 1 : 0)
    + (quickFilter ? 1 : 0);

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((current) => current.includes(amenity)
      ? current.filter((value) => value !== amenity)
      : [...current, amenity]);
  };

  const clearFilters = () => {
    const next = createDefaultDiscoveryFilters();
    navigation.setParams({ query: undefined, universityId: undefined, quickFilter: undefined });
    setMaximumPrice(next.maximumPrice);
    setSelectedAmenities(next.amenities);
    setSort(next.sort);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.headerTitle}>Explore</Text>
        {(query.trim() || activeFilterCount > 0 || sort !== 'recommended') ? (
          <TouchableOpacity accessibilityRole="button" onPress={clearFilters} style={styles.headerClear}>
            <Text style={styles.headerClearText}>Clear all</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.slate500} importantForAccessibility="no-hide-descendants" />
          <TextInput
            accessibilityLabel="Search accommodation"
            style={styles.searchInput}
            placeholder="University, city or property..."
            placeholderTextColor={Colors.slate500}
            value={query}
            onChangeText={(value) => updateRouteContext({ query: value })}
            returnKeyType="search"
          />
        </View>
        <IconButton
          icon="options-outline"
          label={activeFilterCount ? `Filters, ${activeFilterCount} active` : 'Filters'}
          hint={showFilters ? 'Hides filter options' : 'Shows filter options'}
          selected={showFilters || activeFilterCount > 0}
          selectedColor={Colors.white}
          onPress={() => setShowFilters((visible) => !visible)}
          style={styles.filterButton}
        />
      </View>

      {(selectedUniversity || quickFilter) ? (
        <View style={styles.contextRow}>
          {selectedUniversity ? (
            <View style={styles.contextChip}>
              <Text style={styles.contextText}>{selectedUniversity.short}</Text>
              <IconButton icon="close" label={`Remove ${selectedUniversity.name} filter`} iconSize={16} onPress={() => updateRouteContext({ universityId: undefined })} style={styles.contextRemove} />
            </View>
          ) : null}
          {quickFilter ? (
            <View style={styles.contextChip}>
              <Text style={styles.contextText}>{quickFilter}</Text>
              <IconButton icon="close" label={`Remove ${quickFilter} filter`} iconSize={16} onPress={() => updateRouteContext({ quickFilter: undefined })} style={styles.contextRemove} />
            </View>
          ) : null}
        </View>
      ) : null}

      {showFilters ? (
        <ScrollView style={{ maxHeight: Math.max(240, height * 0.55) }} contentContainerStyle={styles.filterPanel} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          <Text style={styles.filterLabel}>Maximum price: R{maximumPrice.toLocaleString()}/month</Text>
          <Slider
            accessibilityLabel="Maximum monthly price"
            accessibilityValue={{ min: 1000, max: DEFAULT_MAXIMUM_PRICE, now: maximumPrice, text: `R${maximumPrice.toLocaleString()} per month` }}
            style={styles.priceSlider}
            minimumValue={1000}
            maximumValue={DEFAULT_MAXIMUM_PRICE}
            value={maximumPrice}
            step={500}
            minimumTrackTintColor={Colors.blue}
            maximumTrackTintColor={Colors.slate200}
            thumbTintColor={Colors.blue}
            onValueChange={setMaximumPrice}
          />
          <View style={styles.priceRow}><Text style={styles.priceHint}>R1,000</Text><Text style={styles.priceHint}>R10,000</Text></View>

          <View>
            <Text style={styles.filterLabel}>Amenities</Text>
            <Text style={styles.filterHelp}>Results must include all selected amenities.</Text>
          </View>
          <View style={styles.amenityRow}>
            {amenityOptions.map((amenity) => {
              const selected = selectedAmenities.includes(amenity);
              return (
                <TouchableOpacity
                  key={amenity}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => toggleAmenity(amenity)}
                  style={[styles.amenityChip, selected && styles.amenityChipActive]}
                >
                  <Text style={[styles.amenityText, selected && styles.amenityTextActive]}>{amenity}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.filterActions}>
            <Btn variant="secondary" onPress={clearFilters} style={styles.filterActionButton}>Clear Filters</Btn>
            <Btn onPress={() => setShowFilters(false)} style={styles.filterActionButton}>{`Show ${filtered.length}`}</Btn>
          </View>
        </ScrollView>
      ) : null}

      <View style={styles.sortContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort:</Text>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: sort === option.value }}
              onPress={() => setSort(option.value)}
              style={[styles.sortChip, sort === option.value && styles.sortChipActive]}
            >
              <Text style={[styles.sortChipText, sort === option.value && styles.sortChipTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.list, !filtered.length && styles.emptyList]}
        ListHeaderComponent={<Text accessibilityLiveRegion="polite" style={styles.resultsCount}>{filtered.length} {filtered.length === 1 ? 'property' : 'properties'} found</Text>}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="search-outline" size={42} color={Colors.slate500} />}
            title="No accommodation found"
            description="Try a broader search, a higher price, or fewer amenities."
            actionLabel="Clear Filters"
            onAction={clearFilters}
          />
        }
        renderItem={({ item }) => (
          <PropertyCard
            variant="list"
            property={item}
            favorite={isFavorite(item.id)}
            onToggleFavorite={() => toggleFavorite(item.id)}
            onOpen={() => navigation.navigate('Property', { property: item })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { minHeight: 60, backgroundColor: Colors.white, paddingHorizontal: Spacing.xl, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  headerTitle: { fontSize: 24, lineHeight: 31, fontFamily: Fonts.heading, color: TextColors.primary },
  headerClear: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  headerClearText: { fontSize: 13, fontFamily: Fonts.bodyMed, color: TextColors.link },
  searchRow: { flexDirection: 'row', gap: 10, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.slate100 },
  searchBar: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.slate100, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, gap: Spacing.sm },
  searchInput: { flex: 1, minWidth: 0, minHeight: 48, fontSize: 14, lineHeight: 20, fontFamily: Fonts.body, color: TextColors.primary },
  filterButton: { width: 48, height: 48, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.slate200 },
  contextRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, backgroundColor: Colors.white },
  contextChip: { minHeight: 44, flexDirection: 'row', alignItems: 'center', paddingLeft: Spacing.md, borderRadius: Radius.full, backgroundColor: Colors.blue100 },
  contextText: { fontSize: 13, fontFamily: Fonts.bodyMed, color: TextColors.link },
  contextRemove: { width: 44, height: 44, minWidth: 44, minHeight: 44 },
  filterPanel: { backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.slate100, padding: Spacing.lg, gap: 10 },
  filterLabel: { fontSize: 13, lineHeight: 18, fontFamily: Fonts.bodySemi, color: TextColors.secondary },
  filterHelp: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.body, color: TextColors.muted, marginTop: 2 },
  priceSlider: { width: '100%', height: 44 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  priceHint: { fontSize: 11, color: TextColors.muted },
  amenityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  amenityChip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.md, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.slate200, backgroundColor: Colors.white },
  amenityChipActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  amenityText: { fontSize: 12, fontFamily: Fonts.bodyMed, color: TextColors.secondary },
  amenityTextActive: { color: Colors.white },
  filterActions: { flexDirection: 'row', gap: 10 },
  filterActionButton: { flex: 1, paddingHorizontal: Spacing.sm },
  sortContainer: { minHeight: 52, backgroundColor: Colors.white, borderBottomWidth: 4, borderBottomColor: Colors.slate100 },
  sortRow: { paddingHorizontal: Spacing.lg, alignItems: 'center', gap: Spacing.sm, minHeight: 48 },
  sortLabel: { fontSize: 12, color: TextColors.muted, fontFamily: Fonts.body },
  sortChip: { minHeight: 44, paddingHorizontal: Spacing.md, borderRadius: Radius.full, backgroundColor: Colors.slate100, justifyContent: 'center', alignItems: 'center' },
  sortChipActive: { backgroundColor: Colors.slate900 },
  sortChipText: { fontSize: 12, color: TextColors.secondary, lineHeight: 17, fontFamily: Fonts.bodyMed },
  sortChipTextActive: { color: Colors.white },
  list: { padding: Spacing.lg, gap: 14, paddingBottom: 100 },
  emptyList: { flexGrow: 1 },
  resultsCount: { fontSize: 12, lineHeight: 17, color: TextColors.muted, fontFamily: Fonts.body, marginBottom: Spacing.sm },
});
