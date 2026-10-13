import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors, Fonts, Radius } from '../theme';
import { Btn } from '../components/UI';
import { RemoteImage } from '../components/RemoteImage';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const slides = [
  {
    image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&h=1000&fit=crop&auto=format',
    title: 'Find accommodation that fits your student life.',
    subtitle: 'Discover verified student accommodation near your campus, with everything you need to succeed.',
  },
  {
    image: 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800&h=1000&fit=crop&auto=format',
    title: 'Search smarter.',
    subtitle: 'Filter by distance, price, room type, amenities and availability to find your perfect match.',
  },
  {
    image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=1000&fit=crop&auto=format',
    title: 'Apply with clarity.',
    subtitle: 'Review accommodation details, compare room options, and follow a clear application journey.',
  },
];

export default function OnboardingScreen({ navigation }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const next = () => {
    if (index < slides.length - 1) {
      const next = index + 1;
      flatRef.current?.scrollToIndex({ index: next });
      setIndex(next);
    } else {
      navigation.replace('Main');
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatRef}
        data={slides}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={{ width, height }}>
            <RemoteImage
              source={{ uri: item.image }}
              style={StyleSheet.absoluteFill}
              accessibilityLabel={`${item.title} onboarding image`}
            />
            <View style={styles.overlay} />
          </View>
        )}
      />

      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Skip onboarding" style={[styles.skipBtn, { top: insets.top + 12 }]} onPress={() => navigation.replace('Main')}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.dotsRow}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <Text style={styles.title}>{slides[index].title}</Text>
        <Text style={styles.subtitle}>{slides[index].subtitle}</Text>

        <Btn onPress={next} style={styles.btn}>
          {index < slides.length - 1 ? 'Next →' : 'Get Started'}
        </Btn>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15,27,45,0.55)",
  },
  skipBtn: {
    position: "absolute",
    top: 60,
    right: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  skipText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontFamily: Fonts.bodyMed,
  },
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 28,
    paddingBottom: 48,
  },
  dotsRow: { flexDirection: "row", gap: 6, marginBottom: 20 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  dotActive: { width: 28, backgroundColor: "#60A5FA" },
  title: {
    fontSize: 30,
    fontFamily: Fonts.heading,
    color: Colors.white,
    marginBottom: 10,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts.body,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 22,
    marginBottom: 28,
  },
  btn: { borderRadius: Radius.xl },
});
