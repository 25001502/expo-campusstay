import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
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
  const { favoriteIds, isFavorite, removeFavorite } = useFavorites();
  const [selected, setSelected] = useState<string[]>([]);
  const favoriteProperties = useMemo(
    () => properties.filter((property) => favoriteIds.includes(property.id)),
    [favoriteIds],
  );

  const validSelected = useMemo(
    () => pruneComparisonSelection(selected, favoriteIds),
    [favoriteIds, selected],
  );

  const toggleComparison = (id: string) => {
    setSelected((current) => {
      const validCurrent = pruneComparisonSelection(current, favoriteIds);
      if (!validCurrent.includes(id) && validCurrent.length >= 3) return validCurrent;
      return toggleStableId(validCurrent, id);
    });
  };

  const removeSavedProperty = (id: string) => {
    removeFavorite(id);
    setSelected((current) => current.filter((value) => value !== id));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.headerTitle}>Favorites</Text>
          {favoriteProperties.length ? <Text style={styles.headerSubtitle}>{favoriteProperties.length} saved</Text> : null}
        </View>
        {favoriteProperties.length ? (
          <Btn
            accessibilityLabel={validSelected.length >= 2 ? `Compare ${validSelected.length} selected properties` : 'Select at least two properties to compare'}
            accessibilityHint={validSelected.length < 2 ? 'Choose comparison controls on two or three property cards' : undefined}
            disabled={validSelected.length < 2}
            onPress={() => navigation.navigate('Compare', { ids: validSelected })}
            style={styles.compareButton}
          >
            {`Compare ${validSelected.length}`}
          </Btn>
        ) : null}
      </View>
      {favoriteProperties.length ? <Text style={styles.hint}>Select two or three properties to compare.</Text> : null}

      <FlatList
        data={favoriteProperties}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, !favoriteProperties.length && styles.emptyList]}
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
            onOpen={() => navigation.navigate('Property', { property: item })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { minHeight: 72, backgroundColor: Colors.white, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.slate100 },
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 24, lineHeight: 31, fontFamily: Fonts.heading, color: TextColors.primary },
  headerSubtitle: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.body, color: TextColors.muted },
  compareButton: { minWidth: 112, paddingHorizontal: Spacing.md },
  hint: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.body, color: TextColors.muted, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md },
  list: { padding: Spacing.lg, gap: 14, paddingBottom: 100 },
  emptyList: { flexGrow: 1 },
});
