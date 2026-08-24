import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ScrollView,
} from 'react-native';
import Slider from "@react-native-community/slider";
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Colors, Fonts, Radius, Shadow } from '../theme';
import { Badge, VerifiedBadge, StarRating, Btn } from '../components/UI';
import { properties } from '../data';
import { installFormDataPatch } from 'expo/build/winter/FormData';
import { Ionicons } from '@expo/vector-icons';
type Props = NativeStackScreenProps<RootStackParamList, 'Main'>;

const amenityOptions = ['Wi-Fi', 'Security', 'Parking', 'Laundry', 'Study Area', 'Kitchen', 'Gym'];
const sortOptions = ['Recommended', 'Price: Low', 'Price: High', 'Rating', 'Distance'];

export default function ExploreScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState('Recommended');
  const [priceMax, setPriceMax] = useState(10000);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>(['p1', 'p3']);

  const toggleFav = (id: string) =>
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleAmenity = (a: string) =>
    setSelectedAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const filtered = properties.filter((p) => {
    const q = query.toLowerCase();
    return (!q || p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q)) && p.price <= priceMax;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
      </View>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.slate400} />
          <TextInput
            style={styles.searchInput}
            placeholder="University, city or property..."
            placeholderTextColor={Colors.slate400}
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, showFilters && styles.filterBtnActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="filter" size={20} color={Colors.slate400} />
        </TouchableOpacity>
      </View>

      {/* Filter panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <Text style={styles.filterLabel}>
            Max price: R{priceMax.toLocaleString()}/month
          </Text>

          {/* Price Slider */}
          <View style={styles.sliderContainer}>
            {/* Thick blue track */}
            <View
              style={[
                styles.sliderTrack,
                {
                  width: `${((priceMax - 1000) / 9000) * 100}%`,
                },
              ]}
            />

            {/* Slider for dragging */}
            <Slider
              style={styles.priceSlider}
              minimumValue={1000}
              maximumValue={10000}
              value={priceMax}
              step={500}
              minimumTrackTintColor="transparent"
              maximumTrackTintColor="#E5E7EB"
              thumbTintColor="#2563EB"
              onValueChange={(value) => setPriceMax(value)}
            />
          </View>

          {/* Price labels */}
          <View style={styles.priceRow}>
            <Text style={styles.priceHint}>R1,000</Text>
            <Text style={styles.priceHint}>R10,000</Text>
          </View>

          <Text style={styles.filterLabel}>Amenities</Text>

          <View style={styles.amenityRow}>
            {amenityOptions.map((a) => (
              <TouchableOpacity
                key={a}
                onPress={() => toggleAmenity(a)}
                style={[
                  styles.amenityChip,
                  selectedAmenities.includes(a) && styles.amenityChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.amenityText,
                    selectedAmenities.includes(a) && styles.amenityTextActive,
                  ]}
                >
                  {a}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.filterActions}>
            <Btn
              variant="secondary"
              onPress={() => {
                setPriceMax(10000);
                setSelectedAmenities([]);
              }}
              style={styles.filterActionBtn}
            >
              Clear all
            </Btn>

            <Btn
              onPress={() => setShowFilters(false)}
              style={styles.filterActionBtn}
            >
              Apply
            </Btn>
          </View>
        </View>
      )}
      {/* Sort chips */}
      <View style={styles.sortContainer}>
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.sortRow}
  >
    <Text style={styles.sortLabel}>Sort: </Text>

    {sortOptions.map((s) => (
      <TouchableOpacity
        key={s}
        onPress={() => setSort(s)}
        style={[
          styles.sortChip,
          sort === s && styles.sortChipActive,
        ]}
      >
        <Text
          style={[
            styles.sortChipText,
            sort === s && styles.sortChipTextActive,
          ]}
        >
          {s}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
</View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}
        ListHeaderComponent={
          <Text style={styles.resultsCount}>
            {filtered.length} properties found
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() =>
              (navigation as any).navigate("Property", { property: item })
            }
          >
            <View style={styles.cardImageWrapper}>
              <Image
                source={{ uri: item.images[0] }}
                style={styles.cardImage}
                contentFit="cover"
              />
              <View style={styles.cardBadges}>
                {item.verified && <VerifiedBadge />}
                {item.available > 0 && (
                  <Badge label={`${item.available} rooms`} variant="green" />
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.favBtn,
                  favorites.includes(item.id) && styles.favBtnActive,
                ]}
                onPress={() => toggleFav(item.id)}
              >
                <Text>
                  {favorites.includes(item.id) ? (
                    <Ionicons name="heart" size={24} color="#fffefe" />
                  ) : (
                    <Ionicons name="heart-outline" size={24} color="#000" />
                  )}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {item.name}
                </Text>
                <StarRating rating={item.rating} />
              </View>
              <Text style={styles.cardLocation}>
                {item.city} · {item.distance} km from campus
              </Text>
              <View style={styles.tagsRow}>
                {item.tags.slice(0, 3).map((t) => (
                  <Badge key={t} label={t} variant="gray" />
                ))}
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.cardPrice}>
                  R{item.price.toLocaleString()}
                  <Text style={styles.cardPriceSub}>/month</Text>
                </Text>
                <Btn
                  onPress={() =>
                    (navigation as any).navigate("Property", { property: item })
                  }
                  style={styles.viewBtn}
                >
                  View →
                </Btn>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchRow: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  sliderContainer: {
    width: "100%",
    height: 40,
    justifyContent: "center",
    position: "relative",
  },

  sliderTrack: {
    position: "absolute",
    left: 0,
    height: 8,
    backgroundColor: "#2563EB",
    borderRadius: 10,
  },

  priceSlider: {
    width: "100%",
    height: 40,
    marginTop: 4,
    marginBottom: 2,
  },

  slider: {
    width: "100%",
    height: 40,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.slate100,
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
  },
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 0,
    borderBottomColor: Colors.slate100,
  },
  searchIcon: { fontSize: 15 },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.slate800,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.slate200,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBtnActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  filterBtnText: { fontSize: 18 },
  filterPanel: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
    padding: 16,
    gap: 10,
  },
  filterLabel: {
    fontSize: 13,
    fontFamily: Fonts.bodySemi,
    color: Colors.slate700,
  },
  priceRow: { flexDirection: "row", justifyContent: "space-between" },
  priceHint: { fontSize: 11, color: Colors.slate400 },
  amenityRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  amenityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.slate200,
    backgroundColor: Colors.white,
  },
  amenityChipActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  amenityText: {
    fontSize: 12,
    fontFamily: Fonts.bodyMed,
    color: Colors.slate600,
  },
  amenityTextActive: { color: Colors.white },
  filterActions: { flexDirection: "row", gap: 10 },
  filterActionBtn: { flex: 1, paddingVertical: 10 },
  sortContainer: {
  height: 48,
  backgroundColor: Colors.white,
  borderBottomWidth: 4,
  borderBottomColor: Colors.slate100,
},

sortRow: {
  paddingHorizontal: 16,
  alignItems: "center",
  gap: 8,
  minHeight: 44,
},
  sortLabel: { fontSize: 12, color: Colors.slate400, fontFamily: Fonts.body },
  sortChip: {
  paddingHorizontal: 12,
  paddingVertical: 7,
  borderRadius: Radius.full,
  backgroundColor: Colors.slate100,
  justifyContent: "center",
  alignItems: "center",
  },
  sortChipActive: { backgroundColor: Colors.slate900 },
  sortChipText: {
    fontSize: 12,
    color: Colors.slate600,
    lineHeight: 16,
  },
  sortChipTextActive: { color: Colors.white, },
  resultsCount: {
    fontSize: 12,
    color: Colors.slate400,
    fontFamily: Fonts.body,
    marginBottom: 8,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    overflow: "hidden",
    ...Shadow.sm,
  },
  cardImageWrapper: { height: 180, position: "relative" },
  cardImage: { width: "100%", height: "100%" },
  cardBadges: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    gap: 6,
  },
  favBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  favBtnActive: { backgroundColor: Colors.red500 },
  cardBody: { padding: 16, gap: 6 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardName: {
    fontSize: 16,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
    flex: 1,
    marginRight: 8,
  },
  cardLocation: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.slate500,
  },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  cardPrice: {
    fontSize: 18,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
  },
  cardPriceSub: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.slate400,
  },
  viewBtn: { paddingVertical: 8, paddingHorizontal: 16 },
});
