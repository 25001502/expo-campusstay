import React, { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StudentTabScreenProps } from '../navigation/types';
import { Colors, Fonts, Spacing, TextColors } from '../theme';
import { Btn, EmptyState } from '../components/UI';
import { PropertyCard } from '../components/PropertyCard';
import { properties } from '../data';
import { pruneComparisonSelection, toggleStableId } from '../discovery';
import { useFavorites } from '../state/FavoritesContext';

type Props = StudentTabScreenProps<'Favorites'>;

export default function FavoritesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const isFocused = useIsFocused();
  const stackHeader = width - insets.left - insets.right < 360 || fontScale >= 1.5;
  const { favoriteIds, isFavorite, removeFavorite } = useFavorites();
  const [selected, setSelected] = useState<string[]>([]);
  const favoriteProperties = useMemo(
    () => properties.filter((property) => typeof property.id === 'string' && property.id.trim() && favoriteIds.includes(property.id)),
    [favoriteIds],
  );

  const savedIds = useMemo(() => favoriteProperties.map((property) => property.id), [favoriteProperties]);
  const validSelected = useMemo(() => pruneComparisonSelection(selected, savedIds).slice(0, 3), [savedIds, selected]);

  // Forget removals from any screen so re-saving a property cannot silently
  // restore its previous comparison selection.
  if (selected.length !== validSelected.length) setSelected(validSelected);

  const guidance = validSelected.length === 0 ? 'Select 2 or 3 properties to compare.'
    : validSelected.length === 1 ? 'Select 1 more property to compare.'
      : validSelected.length === 2 ? 'Ready to compare. You can select 1 more.'
        : 'Maximum of 3 properties selected.';

  const toggleComparison = (id: string) => {
    if (!savedIds.includes(id)) return;
    if (!validSelected.includes(id) && validSelected.length >= 3) {
      Alert.alert('Comparison limit reached', 'You can compare up to 3 properties. Deselect one before choosing another.');
      return;
    }
    setSelected((current) => {
      const validCurrent = pruneComparisonSelection(current, savedIds);
      if (!validCurrent.includes(id) && validCurrent.length >= 3) return validCurrent;
      return toggleStableId(validCurrent, id);
    });
  };

  const removeSavedProperty = (id: string) => {
    if (!savedIds.includes(id)) return;
    removeFavorite(id);
    setSelected((current) => current.filter((value) => value !== id));
  };
  const openProperty = (id: string) => {
    const property = properties.find((item) => item.id === id && typeof id === 'string' && id.trim());
    if (!property) {
      Alert.alert('Property unavailable', 'This listing is no longer available to view. Please choose another property.');
      return;
    }
    navigation.navigate('Property', { property });
  };

  const listHeader = (
    <View>
      <View style={[styles.header, stackHeader && styles.headerStacked]}>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.headerTitle}>Favorites</Text>
          <Text accessibilityLiveRegion="polite" style={styles.headerSubtitle}>{favoriteProperties.length} saved</Text>
        </View>
          <Btn
            accessibilityLabel={`Compare ${validSelected.length} selected ${validSelected.length === 1 ? 'property' : 'properties'}`}
            accessibilityHint={validSelected.length < 2 ? guidance : 'Opens the comparison of your selected saved properties'}
            disabled={validSelected.length < 2}
            onPress={() => { if (validSelected.length >= 2 && validSelected.length <= 3) navigation.navigate('Compare', { ids: validSelected }); }}
            style={styles.compareButton}
          >
            {`Compare ${validSelected.length}`}
          </Btn>
      </View>
      {favoriteProperties.length ? <Text accessibilityLiveRegion="polite" style={styles.hint}>{guidance}</Text> : null}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      {isFocused ? <StatusBar style="dark" /> : null}
      <FlatList
        data={favoriteProperties}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: Spacing.xxxl + insets.bottom }, !favoriteProperties.length && styles.emptyList]}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="heart-outline" size={52} color={Colors.slate500} />}
            title="No favorites yet"
            description="Save accommodation from Home, Explore, or Property Details to keep it here."
            actionLabel="Explore Accommodation"
            onAction={() => navigation.navigate('Explore')}
          />
        }
        renderItem={({ item }) => (
          <PropertyCard
            variant="saved"
            property={item}
            favorite={isFavorite(item.id)}
            comparisonSelected={validSelected.includes(item.id)}
            onToggleComparison={() => toggleComparison(item.id)}
            onToggleFavorite={() => removeSavedProperty(item.id)}
            onOpen={() => openProperty(item.id)}
            style={styles.propertyCard}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { minHeight: 72, backgroundColor: Colors.white, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.slate100 },
  headerStacked: { flexDirection: 'column', alignItems: 'stretch', gap: Spacing.md },
  headerCopy: { flexShrink: 1, minWidth: 0, gap: Spacing.xs },
  headerTitle: { fontSize: 24, lineHeight: 31, letterSpacing: -0.4, fontFamily: Fonts.heading, color: TextColors.primary },
  headerSubtitle: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.body, color: TextColors.muted },
  compareButton: { minWidth: 112, maxWidth: '100%', alignSelf: 'flex-start', paddingHorizontal: Spacing.md },
  hint: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.body, color: TextColors.muted, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md },
  list: { gap: Spacing.lg },
  propertyCard: { width: 'auto', marginHorizontal: Spacing.lg },
  emptyList: { flexGrow: 1 },
});
