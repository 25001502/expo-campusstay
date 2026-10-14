import React, { useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StudentTabScreenProps } from '../navigation/types';
import { Colors, Fonts, Interaction, Radius, Spacing, TextColors } from '../theme';
import { Btn, EmptyState, IconButton } from '../components/UI';
import { PropertyCard } from '../components/PropertyCard';
import { properties, universities, type Property } from '../data';
import {
  createDefaultDiscoveryFilters,
  DEFAULT_MAXIMUM_PRICE,
  MINIMUM_PRICE,
  PRICE_STEP,
  filterAndSortProperties,
  formatDiscoveryPrice,
  normalizeMaximumPrice,
  type DiscoverySort,
} from '../discovery';
import { useFavorites } from '../state/FavoritesContext';

type Props = StudentTabScreenProps<'Explore'>;

const amenityOptions = ['Wi-Fi', 'Security', 'Parking', 'Laundry', 'Study Area', 'Kitchen', 'Gym'];
const searchPlaceholder = 'University, city or property...';
const sortOptions: { value: DiscoverySort; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price-low', label: 'Price: Low' },
  { value: 'price-high', label: 'Price: High' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'distance', label: 'Nearest' },
];

export default function ExploreScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const isFocused = useIsFocused();
  const listRef = useRef<FlatList<Property>>(null);
  const { isFavorite, toggleFavorite } = useFavorites();
  const defaults = createDefaultDiscoveryFilters();
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<DiscoverySort>(defaults.sort);
  const [maximumPrice, setMaximumPrice] = useState(defaults.maximumPrice);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(defaults.amenities);
  const [searchFocused, setSearchFocused] = useState(false);
  const query = route.params?.query ?? defaults.query;
  const universityId = route.params?.universityId;
  const quickFilter = route.params?.quickFilter;
  const stackFilterActions = width < 360 || fontScale >= 1.5;
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
    if (!amenityOptions.includes(amenity)) return;
    setSelectedAmenities((current) => current.includes(amenity)
      ? current.filter((value) => value !== amenity)
      : [...current, amenity]);
  };

  const clearFilters = () => {
    const next = createDefaultDiscoveryFilters();
    setMaximumPrice(next.maximumPrice);
    setSelectedAmenities(next.amenities);
  };

  const clearAll = () => {
    clearFilters();
    navigation.setParams({ query: undefined, universityId: undefined, quickFilter: undefined });
    const next = createDefaultDiscoveryFilters();
    setSort(next.sort);
  };

  const collapseFilters = () => {
    setShowFilters(false);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };
  const openProperty = (id: string) => {
    const property = properties.find((item) => item.id === id);
    if (!property) {
      Alert.alert('Property unavailable', 'This listing is no longer available to view. Please choose another property.');
      return;
    }
    navigation.navigate('Property', { property });
  };

  // One vertical scroll owner keeps the entire inline panel reachable at any
  // text scale. A JSX header retains the input's identity while typing.
  const listHeader = (
    <View>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.headerTitle}>Explore</Text>
          <Text style={styles.headerSubtitle}>Find a place that fits you.</Text>
        </View>
        {(query.trim() || activeFilterCount > 0 || sort !== 'recommended') ? (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear all search and filters" onPress={clearAll} style={styles.headerClear}>
            <Text style={styles.headerClearText}>Clear all</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
          <Ionicons name="search" size={20} color={Colors.slate500} importantForAccessibility="no-hide-descendants" />
          <View style={styles.searchField}>
            <TextInput
              accessibilityLabel="Search accommodation"
              accessibilityHint={searchPlaceholder}
              style={styles.searchInput}
              value={query}
              onChangeText={(value) => updateRouteContext({ query: value })}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onSubmitEditing={Keyboard.dismiss}
              returnKeyType="search"
              autoCorrect={false}
              multiline={false}
              numberOfLines={1}
              textAlignVertical="center"
            />
            {!query ? (
              <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={styles.searchPlaceholder}>
                <Text numberOfLines={1} ellipsizeMode="tail" style={styles.searchPlaceholderText}>{searchPlaceholder}</Text>
              </View>
            ) : null}
          </View>
          {query ? <IconButton icon="close" label="Clear search" iconSize={18} onPress={() => updateRouteContext({ query: '' })} /> : null}
        </View>
        <IconButton
          icon="options-outline"
          label={activeFilterCount ? `Filters, ${activeFilterCount} active` : 'Filters'}
          hint={showFilters ? 'Hides filter options' : 'Shows filter options'}
          selected={showFilters || activeFilterCount > 0}
          expanded={showFilters}
          selectedColor={Colors.white}
          onPress={() => { Keyboard.dismiss(); if (showFilters) collapseFilters(); else setShowFilters(true); }}
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
        <View style={styles.filterPanel} testID="explore-filters">
          <Text style={styles.filterLabel}>Maximum price: {formatDiscoveryPrice(maximumPrice)}/month</Text>
          <Slider
            accessibilityLabel="Maximum monthly price"
            accessibilityValue={{ min: MINIMUM_PRICE, max: DEFAULT_MAXIMUM_PRICE, now: maximumPrice, text: `${formatDiscoveryPrice(maximumPrice)} per month` }}
            style={styles.priceSlider}
            minimumValue={MINIMUM_PRICE}
            maximumValue={DEFAULT_MAXIMUM_PRICE}
            value={maximumPrice}
            step={PRICE_STEP}
            minimumTrackTintColor={Colors.blue}
            maximumTrackTintColor={Colors.slate200}
            thumbTintColor={Colors.blue}
            onValueChange={(value) => setMaximumPrice((previous) => normalizeMaximumPrice(value, previous))}
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
                  accessibilityLabel={`${amenity} amenity`}
                  accessibilityState={{ selected }}
                  activeOpacity={Interaction.pressedOpacity}
                  onPress={() => toggleAmenity(amenity)}
                  style={[styles.amenityChip, selected && styles.amenityChipActive]}
                >
                  <Text style={[styles.amenityText, selected && styles.amenityTextActive]}>{amenity}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={[styles.filterActions, stackFilterActions && styles.filterActionsStacked]}>
            <Btn variant="secondary" onPress={clearFilters} style={[styles.filterActionButton, stackFilterActions && styles.filterActionButtonStacked]}>Clear filters</Btn>
            <Btn onPress={collapseFilters} style={[styles.filterActionButton, stackFilterActions && styles.filterActionButtonStacked]}>{`Show ${filtered.length}`}</Btn>
          </View>
        </View>
      ) : null}

      <View style={styles.sortContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort:</Text>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${option.label}`}
              accessibilityState={{ selected: sort === option.value }}
              activeOpacity={Interaction.pressedOpacity}
              onPress={() => setSort(option.value)}
              style={[styles.sortChip, sort === option.value && styles.sortChipActive]}
            >
              <Text style={[styles.sortChipText, sort === option.value && styles.sortChipTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <Text accessibilityLiveRegion="polite" style={styles.resultsCount}>{filtered.length ? `${filtered.length} ${filtered.length === 1 ? 'property' : 'properties'} found` : 'No properties found'}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      {isFocused ? <StatusBar style="dark" /> : null}
      <FlatList
        ref={listRef}
        data={filtered}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.list, { paddingBottom: Spacing.xxxl + insets.bottom }, !filtered.length && styles.emptyList]}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="search-outline" size={42} color={Colors.slate500} />}
            title="No accommodation found"
            description="Try a broader search, a higher price, or fewer amenities. Clear all to also remove your search and university or quick filters."
            actionLabel="Clear all"
            onAction={clearAll}
          />
        }
        renderItem={({ item }) => (
          <PropertyCard
            variant="list"
            property={item}
            favorite={isFavorite(item.id)}
            onToggleFavorite={() => { if (properties.some((property) => property.id === item.id)) toggleFavorite(item.id); }}
            onOpen={() => openProperty(item.id)}
            style={{ width: Math.max(0, width - insets.left - insets.right - Spacing.lg * 2), alignSelf: 'center' }}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.white, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  headerCopy: { flex: 1, minWidth: 0, gap: Spacing.xs },
  headerTitle: { flexShrink: 1, fontSize: 28, lineHeight: 35, letterSpacing: -0.5, fontFamily: Fonts.heading, color: TextColors.primary },
  headerSubtitle: { fontSize: 13, lineHeight: 20, fontFamily: Fonts.body, color: TextColors.muted },
  headerClear: { flexShrink: 1, minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  headerClearText: { fontSize: 13, fontFamily: Fonts.bodyMed, color: TextColors.link },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, backgroundColor: Colors.white },
  searchBar: { flex: 1, minWidth: 0, minHeight: 48, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.slate100, borderRadius: Radius.lg, borderWidth: Interaction.focusBorderWidth, borderColor: 'transparent', paddingHorizontal: Spacing.sm, gap: Spacing.xs },
  searchBarFocused: { borderColor: Interaction.focusBorderColor },
  searchField: { flex: 1, minWidth: 0 },
  searchInput: { minWidth: 0, minHeight: 48, fontSize: 14, lineHeight: 20, fontFamily: Fonts.body, color: TextColors.primary },
  // Android can wrap the native hint even on a single-line EditText. Render
  // the same hint separately so enlarged text ellipsizes on one complete line.
  searchPlaceholder: { ...StyleSheet.absoluteFill, justifyContent: 'center' },
  searchPlaceholderText: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.body, color: Colors.slate500 },
  filterButton: { width: 48, height: 48, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.slate200 },
  contextRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, backgroundColor: Colors.white },
  contextChip: { maxWidth: '100%', minHeight: 44, flexDirection: 'row', alignItems: 'center', paddingLeft: Spacing.md, borderRadius: Radius.full, backgroundColor: Colors.blue100 },
  contextText: { flexShrink: 1, paddingVertical: Spacing.sm, fontSize: 13, fontFamily: Fonts.bodyMed, color: TextColors.link },
  contextRemove: { width: 44, height: 44, minWidth: 44, minHeight: 44 },
  filterPanel: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.slate200, borderRadius: Radius.xl, marginHorizontal: Spacing.lg, marginVertical: Spacing.md, padding: Spacing.lg, gap: Spacing.md },
  filterLabel: { fontSize: 14, lineHeight: 21, fontFamily: Fonts.bodySemi, color: TextColors.primary },
  filterHelp: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.body, color: TextColors.muted, marginTop: 2 },
  priceSlider: { width: '100%', height: 44 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  priceHint: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.body, color: TextColors.muted },
  amenityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  amenityChip: { maxWidth: '100%', minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.slate200, backgroundColor: Colors.white },
  amenityChipActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  amenityText: { fontSize: 12, fontFamily: Fonts.bodyMed, color: TextColors.secondary },
  amenityTextActive: { color: Colors.white },
  filterActions: { flexDirection: 'row', gap: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.slate100 },
  filterActionsStacked: { flexDirection: 'column' },
  filterActionButton: { flex: 1, paddingHorizontal: Spacing.sm },
  filterActionButtonStacked: { flex: 0 },
  sortContainer: { minHeight: 52, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.slate200 },
  sortRow: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, alignItems: 'center', gap: Spacing.sm, minHeight: 48 },
  sortLabel: { fontSize: 12, color: TextColors.muted, fontFamily: Fonts.body },
  sortChip: { minHeight: 44, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.slate100, justifyContent: 'center', alignItems: 'center' },
  sortChipActive: { backgroundColor: Colors.navy },
  sortChipText: { fontSize: 12, color: TextColors.secondary, lineHeight: 17, fontFamily: Fonts.bodyMed },
  sortChipTextActive: { color: Colors.white },
  list: { gap: Spacing.lg },
  emptyList: { flexGrow: 1 },
  resultsCount: { fontSize: 13, lineHeight: 18, color: TextColors.secondary, fontFamily: Fonts.bodyMed, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
});
