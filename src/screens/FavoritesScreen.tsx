import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Colors, Fonts, Radius, Shadow } from '../theme';
import { Btn, StarRating } from '../components/UI';
import { properties } from '../data';

type Props = NativeStackScreenProps<RootStackParamList, 'Main'>;

export default function FavoritesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [favorites, setFavorites] = useState<string[]>(['p1', 'p3', 'p2']);
  const [selected, setSelected] = useState<string[]>([]);

  const favProps = properties.filter((p) => favorites.includes(p.id));

  const toggleSelect = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );

  const removeFav = (id: string) => {
    setFavorites((prev) => prev.filter((x) => x !== id));
    setSelected((prev) => prev.filter((x) => x !== id));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved</Text>
        {selected.length >= 2 && (
          <Btn
            onPress={() => (navigation as any).navigate('Compare', { ids: selected })}
            style={styles.compareBtn}
          >
            Compare {selected.length}
          </Btn>
        )}
      </View>
      {favProps.length > 0 && (
        <Text style={styles.hint}>Select up to 3 properties to compare</Text>
      )}

      <FlatList
        data={favProps}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🤍</Text>
            <Text style={styles.emptyTitle}>No saved accommodation yet</Text>
            <Text style={styles.emptySub}>Save properties you love to find them later.</Text>
            <Btn onPress={() => (navigation as any).navigate('Explore')} style={styles.exploreBtn}>
              Explore Accommodation
            </Btn>
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = selected.includes(item.id);
          return (
            <TouchableOpacity
              style={[styles.card, isSelected && styles.cardSelected]}
              activeOpacity={0.85}
              onPress={() => toggleSelect(item.id)}
            >
              <View style={styles.cardImageWrapper}>
                <Image source={{ uri: item.images[0] }} style={styles.cardImage} contentFit="cover" />
                {isSelected && (
                  <View style={styles.checkOverlay}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeFav(item.id)}>
                  <Text style={styles.removeText}>❤️</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardLocation}>{item.city} · {item.distance} km from campus</Text>
                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.cardPrice}>R{item.price.toLocaleString()}</Text>
                    <Text style={styles.cardPriceSub}>/month</Text>
                  </View>
                  <Btn
                    variant="secondary"
                    onPress={() => (navigation as any).navigate('Property', { property: item })}
                    style={styles.viewBtn}
                  >
                    View
                  </Btn>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  
  headerTitle: {
    fontSize: 24,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
  },
  compareBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  hint: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.slate400,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  list: { padding: 16, gap: 14, paddingBottom: 100 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Fonts.heading,
    color: Colors.slate700,
  },
  emptySub: { fontSize: 13, fontFamily: Fonts.body, color: Colors.slate400 },
  exploreBtn: { marginTop: 8, paddingHorizontal: 24 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    overflow: "hidden",
    ...Shadow.sm,
    borderWidth: 2,
    borderColor: "transparent",
  },
  cardSelected: { borderColor: Colors.blue },
  cardImageWrapper: { height: 160, position: "relative" },
  cardImage: { width: "100%", height: "100%" },
  checkOverlay: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: { color: Colors.white, fontSize: 14, fontFamily: Fonts.bodySemi },
  removeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.red500,
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: { fontSize: 15 },
  cardBody: { padding: 16, gap: 4 },
  cardName: { fontSize: 16, fontFamily: Fonts.heading, color: Colors.slate900 },
  cardLocation: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.slate500,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  cardPrice: {
    fontSize: 18,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
  },
  cardPriceSub: {
    fontSize: 12,
    color: Colors.slate400,
    fontFamily: Fonts.body,
  },
  viewBtn: { paddingVertical: 8, paddingHorizontal: 14 },
});
