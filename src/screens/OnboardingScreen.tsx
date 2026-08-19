import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, FlatList, Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Colors, Fonts, Radius } from '../theme';
import { Btn } from '../components/UI';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const { width, height } = Dimensions.get('window');

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
    title: 'Book with confidence.',
    subtitle: 'Verified accommodation, secure applications, and transparent pricing — no surprises.',
  },
];

export default function OnboardingScreen({ navigation }: Props) {
  const [index, setIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const next = () => {
    if (index < slides.length - 1) {
      const next = index + 1;
      flatRef.current?.scrollToIndex({ index: next });
      setIndex(next);
    } else {
      navigation.replace('Login');
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
            <Image source={{ uri: item.image }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
            <View style={styles.overlay} />
          </View>
        )}
      />

      <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.replace('Login')}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.bottom}>
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
    ...StyleSheet.absoluteFillObject,
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
