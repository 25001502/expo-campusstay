import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Colors, Fonts, Radius, Shadow } from '../theme';
import { Badge, VerifiedBadge, StarRating } from '../components/UI';
import { properties, universities } from '../data';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Main'>;

const quickFilters = ['Near Campus', 'Under R5,000', 'Private Room', 'Shared Room', 'Available Now', 'Wi-Fi', 'Furnished'];

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>(['p1', 'p3']);

  const toggleFav = (id: string) =>
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Good morning </Text>
            <Text style={styles.heroName}>Hey, Siyanda!</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIcon}
              onPress={() => (navigation as any).navigate("Notifications")}
            >
              <Text style={styles.headerIconText}>
                <Ionicons
                  name="notifications-outline"
                  size={24}
                  color="#ffffff"
                />
              </Text>
              <View style={styles.notifDot} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.avatar}
              onPress={() => (navigation as any).navigate("Profile")}
            >
              <Text style={styles.avatarText}>SD</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.heroSub}>Find your perfect student home.</Text>

        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => (navigation as any).navigate("Explore")}
          activeOpacity={0.7}
        >
          <Text style={styles.searchIcon}><Ionicons name="search-outline" size={24} color={Colors.slate400} /></Text>
          <Text style={styles.searchPlaceholder}>
            Search by university, location...
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Filters */}
      <FlatList
        horizontal
        data={quickFilters}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setActiveFilter(activeFilter === item ? null : item)}
            style={[
              styles.filterChip,
              activeFilter === item && styles.filterChipActive,
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === item && styles.filterChipTextActive,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Featured */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Accommodation</Text>
          <TouchableOpacity
            onPress={() => (navigation as any).navigate("Explore")}
          >
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          horizontal
          data={properties.slice(0, 4)}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: 20, gap: 14 }}
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
                {item.verified && (
                  <View style={styles.cardBadge}>
                    <VerifiedBadge />
                  </View>
                )}
                <TouchableOpacity
                  style={[
                    styles.favBtn,
                    favorites.includes(item.id) && styles.favBtnActive,
                  ]}
                  onPress={() => toggleFav(item.id)}
                >
                  <Text style={styles.favIcon}>
                    {favorites.includes(item.id) ? <Ionicons name="heart" size={24} color="#fffefe" /> : <Ionicons name="heart-outline" size={24} color="#000" />}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.cardLocation}>
                  {item.city} · {item.distance} km from campus
                </Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardPrice}>
                    R{item.price.toLocaleString()}
                    <Text style={styles.cardPriceSub}>/mo</Text>
                  </Text>
                  <StarRating rating={item.rating} />
                </View>
                <Text style={styles.cardRooms}>
                  {item.available} rooms available
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Universities */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Browse by University</Text>
        <View style={styles.uniGrid}>
          {universities.slice(0, 4).map((u) => (
            <TouchableOpacity
              key={u.id}
              style={styles.uniCard}
              onPress={() => (navigation as any).navigate("Explore")}
              activeOpacity={0.8}
            >
              <View style={styles.uniIconBox}>
                <Text style={styles.uniShort}>{u.short}</Text>
              </View>
              <Text style={styles.uniName}>{u.short}</Text>
              <Text style={styles.uniCity}>{u.city}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Promo Banner */}
      <View style={styles.promoSection}>
        <Image
          source={{
            uri: "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=800&h=300&fit=crop&auto=format",
          }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />
        <View style={styles.promoOverlay} />
        <View style={styles.promoContent}>
          <Text style={styles.promoLabel}>NEW LISTINGS</Text>
          <Text style={styles.promoTitle}>Properties near UNIVEN</Text>
          <TouchableOpacity
            onPress={() => (navigation as any).navigate("Explore")}
          >
            <Text style={styles.promoAction}>Explore now →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.navy,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  greeting: { color: Colors.slate400, fontSize: 13, fontFamily: Fonts.body },
  heroName: { color: Colors.white, fontSize: 24, fontFamily: Fonts.heading },
  heroSub: {
    color: Colors.slate300,
    fontSize: 13,
    fontFamily: Fonts.body,
    marginBottom: 14,
  },
  headerActions: { flexDirection: "row", gap: 10, alignItems: "center" },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconText: { fontSize: 18 },
  notifDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.red500,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: Colors.white, fontSize: 13, fontFamily: Fonts.bodySemi },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  searchIcon: { fontSize: 16 },
  searchPlaceholder: {
    color: Colors.slate300,
    fontSize: 14,
    fontFamily: Fonts.body,
  },
  filtersContainer: { paddingHorizontal: 20, paddingVertical: 16, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  filterChipActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  filterChipText: {
    fontSize: 13,
    fontFamily: Fonts.bodyMed,
    color: Colors.slate700,
  },
  filterChipTextActive: { color: Colors.white },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
  },
  seeAll: { fontSize: 13, fontFamily: Fonts.bodyMed, color: Colors.blue },
  card: {
    width: 280,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    overflow: "hidden",
    ...Shadow.sm,
    marginRight: 4,
    marginBottom: 5,
    marginTop: 5,
  },
  cardImageWrapper: { position: "relative", height: 170 },
  cardImage: { width: "100%", height: "100%" },
  cardBadge: { position: "absolute", top: 10, left: 10 },
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
  favIcon: { fontSize: 15 },
  cardBody: { padding: 14 },
  cardName: {
    fontSize: 15,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
    marginBottom: 3,
  },
  cardLocation: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.slate500,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardPrice: {
    fontSize: 15,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
  },
  cardPriceSub: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.slate400,
  },
  cardRooms: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: Colors.slate400,
    marginTop: 4,
  },
  uniGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  uniCard: {
    width: (width - 52) / 2,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadow.sm,
  },
  uniIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.blue100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  uniShort: { fontSize: 12, fontFamily: Fonts.bodySemi, color: Colors.blue },
  uniName: { fontSize: 14, fontFamily: Fonts.heading, color: Colors.slate800 },
  uniCity: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.slate400,
    marginTop: 2,
  },
  promoSection: {
    marginHorizontal: 20,
    height: 130,
    borderRadius: Radius.xl,
    overflow: "hidden",
    marginBottom: 16,
  },
  promoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,27,45,0.72)",
  },
  promoContent: { padding: 20, flex: 1, justifyContent: "center" },
  promoLabel: {
    fontSize: 10,
    fontFamily: Fonts.bodySemi,
    color: "#93C5FD",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  promoTitle: {
    fontSize: 18,
    fontFamily: Fonts.heading,
    color: Colors.white,
    marginBottom: 6,
  },
  promoAction: { fontSize: 13, fontFamily: Fonts.bodyMed, color: "#93C5FD" },
});
