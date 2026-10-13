import React, { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StudentTabScreenProps } from '../navigation/types';
import { Colors, Fonts, Radius, Shadow, Spacing, TextColors } from '../theme';
import { IconButton } from '../components/UI';
import { PropertyCard } from '../components/PropertyCard';
import { RemoteImage } from '../components/RemoteImage';
import { properties, universities } from '../data';
import { createUniversityDiscoveryContext, quickFilters, type QuickFilter } from '../discovery';
import { useFavorites } from '../state/FavoritesContext';
import { useCommunication } from '../state/CommunicationContext';

type Props = StudentTabScreenProps<'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { unreadNotificationCount } = useCommunication();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<QuickFilter>();
  const featuredWidth = Math.min(300, Math.max(220, width - 40));
  const universityWidth = width < 360 ? Math.max(0, width - 40) : (width - 52) / 2;

  const openExplore = (params?: { query?: string; universityId?: string; quickFilter?: QuickFilter }) => {
    navigation.navigate('Explore', params);
  };
  const submitSearch = () => openExplore({ query: query.trim() });
  const chooseQuickFilter = (filter: QuickFilter) => {
    setActiveFilter(filter);
    openExplore({ quickFilter: filter });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <View style={styles.greetingGroup}>
            <Text style={styles.greeting}>Good morning 👋</Text>
            <Text accessibilityRole="header" style={styles.heroName}>Hey, Siyanda!</Text>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.notificationControl}>
              <IconButton
                icon="notifications-outline"
                label={unreadNotificationCount ? `Notifications, ${unreadNotificationCount} unread` : 'Notifications, no unread items'}
                hint="Opens your notifications"
                color={Colors.white}
                backgroundColor="rgba(255,255,255,0.1)"
                onPress={() => navigation.navigate('Notifications')}
              />
              {unreadNotificationCount > 0 ? <View importantForAccessibility="no-hide-descendants" style={styles.notifDot} /> : null}
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open profile" style={styles.avatar} onPress={() => navigation.navigate('Profile')}>
              <Text style={styles.avatarText}>SD</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.heroSub}>Find your perfect student home.</Text>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.slate300} importantForAccessibility="no-hide-descendants" />
          <TextInput
            accessibilityLabel="Search accommodation"
            accessibilityHint="Searches by property, university, location, or amenity"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submitSearch}
            returnKeyType="search"
            placeholder="Search by university, location..."
            placeholderTextColor={Colors.slate300}
            style={styles.searchInput}
          />
          <IconButton icon="arrow-forward" label="Search accommodation" onPress={submitSearch} color={Colors.white} backgroundColor="rgba(255,255,255,0.12)" />
        </View>
      </View>

      <FlatList
        horizontal
        data={quickFilters}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Filter by ${item}`}
            accessibilityState={{ selected: activeFilter === item }}
            onPress={() => chooseQuickFilter(item)}
            style={[styles.filterChip, activeFilter === item && styles.filterChipActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, activeFilter === item && styles.filterChipTextActive]}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Accommodation</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => openExplore()}><Text style={styles.seeAll}>See all</Text></TouchableOpacity>
        </View>
        <FlatList
          horizontal
          data={properties.slice(0, 4)}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredList}
          renderItem={({ item }) => (
            <PropertyCard
              variant="featured"
              property={item}
              favorite={isFavorite(item.id)}
              onToggleFavorite={() => toggleFavorite(item.id)}
              onOpen={() => navigation.navigate('Property', { property: item })}
              style={{ width: featuredWidth }}
            />
          )}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitleStandalone}>Browse by University</Text>
        <View style={styles.universityGrid}>
          {universities.slice(0, 4).map((university) => (
            <TouchableOpacity
              key={university.id}
              accessibilityRole="button"
              accessibilityLabel={`Explore accommodation for ${university.name}`}
              style={[styles.universityCard, { width: universityWidth }]}
              onPress={() => openExplore(createUniversityDiscoveryContext(university.id))}
              activeOpacity={0.8}
            >
              <View style={styles.universityIconBox}><Text style={styles.universityShort}>{university.short}</Text></View>
              <Text style={styles.universityName}>{university.short}</Text>
              <Text style={styles.universityCity}>{university.city}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.promoSection}>
        <RemoteImage
          source={{ uri: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=800&h=300&fit=crop&auto=format' }}
          style={StyleSheet.absoluteFill}
          decorative
          retryable={false}
        />
        <View style={styles.promoOverlay} />
        <View style={styles.promoContent}>
          <Text style={styles.promoLabel}>NEW LISTINGS</Text>
          <Text style={styles.promoTitle}>Properties near UNIVEN</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Explore properties near UNIVEN" onPress={() => openExplore({ universityId: 'univen' })}>
            <Text style={styles.promoAction}>Explore now →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.navy, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  greetingGroup: { flex: 1, minWidth: 0 },
  greeting: { color: Colors.slate300, fontSize: 13, lineHeight: 18, fontFamily: Fonts.body },
  heroName: { color: Colors.white, fontSize: 24, lineHeight: 31, fontFamily: Fonts.heading, flexShrink: 1 },
  heroSub: { color: Colors.slate300, fontSize: 13, lineHeight: 18, fontFamily: Fonts.body, marginBottom: 14 },
  headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  notificationControl: { position: 'relative' },
  notifDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.red500 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.white, fontSize: 13, fontFamily: Fonts.bodySemi },
  searchBar: { minHeight: 52, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.lg, paddingLeft: 14, paddingRight: Spacing.xs, gap: Spacing.sm },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 12, color: Colors.white, fontSize: 14, lineHeight: 20, fontFamily: Fonts.body },
  filtersContainer: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, gap: Spacing.sm },
  filterChip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.slate200 },
  filterChipActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  filterChipText: { fontSize: 13, fontFamily: Fonts.bodyMed, color: TextColors.secondary },
  filterChipTextActive: { color: Colors.white },
  section: { marginBottom: Spacing.xxl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginBottom: 14 },
  sectionTitle: { flex: 1, minWidth: 0, fontSize: 18, lineHeight: 24, fontFamily: Fonts.heading, color: TextColors.primary },
  sectionTitleStandalone: { paddingHorizontal: Spacing.xl, marginBottom: 14, fontSize: 18, lineHeight: 24, fontFamily: Fonts.heading, color: TextColors.primary },
  seeAll: { fontSize: 13, fontFamily: Fonts.bodyMed, color: TextColors.link },
  featuredList: { paddingHorizontal: Spacing.xl, gap: 14 },
  universityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, paddingHorizontal: Spacing.xl },
  universityCard: { minWidth: 0, backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.slate100, ...Shadow.sm },
  universityIconBox: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.blue100, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  universityShort: { fontSize: 12, fontFamily: Fonts.bodySemi, color: TextColors.link },
  universityName: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.heading, color: TextColors.primary },
  universityCity: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.body, color: TextColors.muted, marginTop: 2 },
  promoSection: { marginHorizontal: Spacing.xl, minHeight: 130, borderRadius: Radius.xl, overflow: 'hidden', marginBottom: Spacing.lg },
  promoOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15,27,45,0.72)' },
  promoContent: { padding: Spacing.xl, minHeight: 130, justifyContent: 'center' },
  promoLabel: { fontSize: 10, fontFamily: Fonts.bodySemi, color: '#BFDBFE', letterSpacing: 1.5, marginBottom: 4 },
  promoTitle: { fontSize: 18, lineHeight: 24, fontFamily: Fonts.heading, color: Colors.white, marginBottom: 6 },
  promoAction: { minHeight: 44, textAlignVertical: 'center', fontSize: 13, fontFamily: Fonts.bodyMed, color: '#BFDBFE' },
});
