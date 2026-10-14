import React, { useCallback, useState } from 'react';
import { FlatList, Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StudentTabScreenProps } from '../navigation/types';
import { Colors, Fonts, Interaction, Radius, Shadow, Spacing, TextColors } from '../theme';
import { EmptyState, IconButton } from '../components/UI';
import { PropertyCard } from '../components/PropertyCard';
import { RemoteImage } from '../components/RemoteImage';
import { properties, universities } from '../data';
import { createUniversityDiscoveryContext, quickFilters, type QuickFilter } from '../discovery';
import { useFavorites } from '../state/FavoritesContext';
import { useCommunication } from '../state/CommunicationContext';
import { useProfile } from '../state/ProfileContext';
import { getHomeIdentity, getTimeGreeting } from '../home';

type Props = StudentTabScreenProps<'Home'>;
const featuredProperties = properties.slice(0, 4);
const homeUniversities = universities.slice(0, 4);
const searchPlaceholder = 'Search by university, location...';

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { unreadNotificationCount } = useCommunication();
  const { profile } = useProfile();
  const isFocused = useIsFocused();
  const identity = getHomeIdentity(profile.fullName);
  const [hour, setHour] = useState(() => new Date().getHours());
  useFocusEffect(useCallback(() => { setHour(new Date().getHours()); }, []));
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const contentWidth = Math.max(0, width - insets.left - insets.right);
  const stackSectionHeader = contentWidth < 360 || fontScale >= 1.5;
  // Reserve a glimpse of the next card after the leading margin and card gap.
  const featuredWidth = Math.min(300, Math.max(0, contentWidth - Spacing.xl - Spacing.lg - Spacing.xxl));
  const universityGridWidth = Math.min(720, contentWidth);
  const universityWidth = (contentWidth < 360 || fontScale >= 1.5)
    ? universityGridWidth - Spacing.xl * 2
    : (universityGridWidth - Spacing.xl * 2 - Spacing.md) / 2;

  const openExplore = (params?: { query?: string; universityId?: string; quickFilter?: QuickFilter }) => {
    Keyboard.dismiss();
    navigation.navigate('Explore', { query: '', universityId: undefined, quickFilter: undefined, ...params });
  };
  const submitSearch = () => openExplore({ query: query.trim() });
  const chooseQuickFilter = (filter: QuickFilter) => {
    openExplore({ quickFilter: filter });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: Spacing.xxxl + insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {isFocused ? <StatusBar style="light" /> : null}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={[styles.headerTop, fontScale >= 1.5 && styles.headerTopStack]}>
          <View style={[styles.greetingGroup, fontScale >= 1.5 && styles.greetingGroupStack]}>
            <Text style={styles.greeting}>{getTimeGreeting(hour)} 👋</Text>
            <Text accessibilityRole="header" accessibilityLabel={identity.title} style={styles.heroName}>{identity.title}</Text>
          </View>
          <View style={[styles.headerActions, fontScale >= 1.5 && styles.headerActionsStack]}>
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
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open profile" accessibilityHint="Opens your personal details and settings" activeOpacity={Interaction.pressedOpacity} style={styles.avatar} onPress={() => navigation.navigate('Profile')}>
              {identity.initials ? <Text importantForAccessibility="no-hide-descendants" maxFontSizeMultiplier={1.3} style={styles.avatarText}>{identity.initials}</Text> : <Ionicons importantForAccessibility="no-hide-descendants" name="person-outline" size={22} color={Colors.white} />}
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.heroSub}>Find your perfect student home.</Text>

        <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
          <Ionicons name="search" size={20} color={Colors.slate300} importantForAccessibility="no-hide-descendants" />
          <View style={styles.searchField}>
            <TextInput
              accessibilityLabel="Search accommodation"
              accessibilityHint="Searches by property, university, location, or amenity"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={submitSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              returnKeyType="search"
              multiline={false}
              numberOfLines={1}
              textAlignVertical="center"
              style={styles.searchInput}
            />
            {!query ? (
              <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={styles.searchPlaceholder}>
                <Text numberOfLines={1} ellipsizeMode="tail" style={styles.searchPlaceholderText}>{searchPlaceholder}</Text>
              </View>
            ) : null}
          </View>
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
            accessibilityHint={item === 'Near Campus' ? 'Shows listings with a supplied campus distance of 1 km or less; no device location is used' : `Opens Explore with ${item} applied`}
            onPress={() => chooseQuickFilter(item)}
            style={styles.filterChip}
            activeOpacity={Interaction.pressedOpacity}
          >
            <Text style={styles.filterChipText}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      <View style={styles.section}>
        <View style={[styles.sectionHeader, stackSectionHeader && styles.sectionHeaderStacked]}>
          <Text accessibilityRole="header" style={[styles.sectionTitle, stackSectionHeader && styles.sectionTitleStacked]}>Featured Accommodation</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="See all accommodation" accessibilityHint="Opens the Explore listing" activeOpacity={Interaction.pressedOpacity} style={styles.seeAllAction} onPress={() => openExplore()}><Text style={styles.seeAll}>See all</Text></TouchableOpacity>
        </View>
        <FlatList
          horizontal
          data={featuredProperties}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredList}
          ListEmptyComponent={<EmptyState title="No featured accommodation" description="Browse the available listings in Explore." actionLabel="Explore accommodation" onAction={() => openExplore()} />}
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
        <Text accessibilityRole="header" style={styles.sectionTitleStandalone}>Browse by University</Text>
        <View style={[styles.universityGrid, { width: universityGridWidth }]}>
          {homeUniversities.map((university) => (
            <TouchableOpacity
              key={university.id}
              accessibilityRole="button"
              accessibilityLabel={`Explore accommodation for ${university.name}`}
              accessibilityHint={`Shows listings associated with ${university.short}, including an empty state when none are listed`}
              style={[styles.universityCard, { width: universityWidth }]}
              onPress={() => openExplore(createUniversityDiscoveryContext(university.id))}
              activeOpacity={Interaction.pressedOpacity}
            >
              <View importantForAccessibility="no-hide-descendants" style={styles.universityCardTop}>
                <View style={styles.universityIconBox}><Text maxFontSizeMultiplier={1.2} style={styles.universityShort}>{university.short}</Text></View>
                <Ionicons name="chevron-forward" size={18} color={Colors.slate500} />
              </View>
              <Text style={styles.universityName}>{university.name}</Text>
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
          <Text style={styles.promoLabel}>BROWSE ACCOMMODATION</Text>
          <Text style={styles.promoTitle}>Properties near UNIVEN</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Explore properties near UNIVEN" activeOpacity={Interaction.pressedOpacity} style={styles.promoActionTarget} onPress={() => openExplore(createUniversityDiscoveryContext('univen'))}>
            <Text style={styles.promoAction}>Explore now →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.navy, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  headerTopStack: { flexDirection: 'column', alignItems: 'stretch', gap: Spacing.sm },
  greetingGroup: { flex: 1, minWidth: 0 },
  greetingGroupStack: { flex: 0 },
  greeting: { color: Colors.slate300, fontSize: 13, lineHeight: 18, fontFamily: Fonts.body, marginBottom: Spacing.xs },
  heroName: { color: Colors.white, fontSize: 24, lineHeight: 31, letterSpacing: -0.45, fontFamily: Fonts.heading, flexShrink: 1 },
  heroSub: { color: Colors.slate300, fontSize: 13, lineHeight: 20, fontFamily: Fonts.body, marginTop: Spacing.xs, marginBottom: Spacing.xl },
  headerActions: { flexDirection: 'row', flexShrink: 0, gap: Spacing.md, alignItems: 'center' },
  headerActionsStack: { alignSelf: 'flex-end' },
  notificationControl: { position: 'relative' },
  notifDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.red500 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.white, fontSize: 13, fontFamily: Fonts.bodySemi },
  searchBar: { minHeight: 56, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.navy800, borderRadius: Radius.lg, borderWidth: Interaction.focusBorderWidth, borderColor: 'transparent', paddingLeft: Spacing.md, paddingRight: Spacing.xs, gap: Spacing.sm },
  searchBarFocused: { borderColor: Colors.blueLight },
  searchField: { flex: 1, minWidth: 0 },
  searchInput: { minWidth: 0, minHeight: 48, paddingVertical: Spacing.md, color: Colors.white, fontSize: 14, lineHeight: 20, fontFamily: Fonts.body },
  searchPlaceholder: { ...StyleSheet.absoluteFill, justifyContent: 'center' },
  searchPlaceholderText: { color: Colors.slate300, fontSize: 14, lineHeight: 20, fontFamily: Fonts.body },
  filtersContainer: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, gap: Spacing.sm },
  filterChip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.slate200 },
  filterChipText: { fontSize: 13, fontFamily: Fonts.bodyMed, color: TextColors.secondary },
  section: { marginBottom: Spacing.xxl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm },
  sectionHeaderStacked: { flexDirection: 'column', alignItems: 'flex-start', gap: 0 },
  sectionTitleStacked: { flex: 0, alignSelf: 'stretch' },
  sectionTitle: { flex: 1, minWidth: 0, fontSize: 18, lineHeight: 24, letterSpacing: -0.2, fontFamily: Fonts.heading, color: TextColors.primary },
  sectionTitleStandalone: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg, fontSize: 18, lineHeight: 24, letterSpacing: -0.2, fontFamily: Fonts.heading, color: TextColors.primary },
  seeAll: { fontSize: 13, fontFamily: Fonts.bodyMed, color: TextColors.link },
  seeAllAction: { minHeight: 44, minWidth: 44, flexShrink: 0, justifyContent: 'center', alignItems: 'center' },
  featuredList: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xs, alignItems: 'stretch', gap: Spacing.lg },
  universityGrid: { alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: Spacing.md, paddingHorizontal: Spacing.xl },
  universityCard: { minWidth: 0, backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.slate100, ...Shadow.sm },
  universityCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, marginBottom: Spacing.md },
  universityIconBox: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.blue100, alignItems: 'center', justifyContent: 'center' },
  universityShort: { fontSize: 12, fontFamily: Fonts.bodySemi, color: TextColors.link },
  universityName: { minWidth: 0, alignSelf: 'stretch', flexGrow: 1, flexShrink: 0, fontSize: 14, lineHeight: 20, fontFamily: Fonts.heading, color: TextColors.primary },
  universityCity: { minWidth: 0, flexShrink: 0, fontSize: 12, lineHeight: 17, fontFamily: Fonts.body, color: TextColors.muted, marginTop: 2 },
  promoSection: { marginHorizontal: Spacing.xl, minHeight: 130, borderRadius: Radius.xl, overflow: 'hidden', marginBottom: Spacing.lg },
  promoOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15,27,45,0.72)' },
  promoContent: { padding: Spacing.xl, minHeight: 130, justifyContent: 'center' },
  promoLabel: { fontSize: 10, fontFamily: Fonts.bodySemi, color: '#BFDBFE', letterSpacing: 1.5, marginBottom: 4 },
  promoTitle: { fontSize: 18, lineHeight: 24, fontFamily: Fonts.heading, color: Colors.white, marginBottom: 6 },
  promoAction: { minHeight: 44, textAlignVertical: 'center', fontSize: 13, fontFamily: Fonts.bodyMed, color: '#BFDBFE' },
  promoActionTarget: { minHeight: 44, justifyContent: 'center' },
});
