import React, { useEffect } from 'react';
import { View, Text, Animated, StyleSheet, useAnimatedValue } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Colors, Fonts } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  const opacity = useAnimatedValue(0);
  const translateY = useAnimatedValue(20);
  const scale = useAnimatedValue(0.8);

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 700, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]);
    animation.start();

    const timer = setTimeout(() => navigation.replace('Main'), 2400);
    return () => {
      clearTimeout(timer);
      animation.stop();
    };
  }, [navigation, opacity, scale, translateY]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity, transform: [{ translateY }, { scale }] }]}>
        <View style={styles.logoBox}>
          <Text style={styles.logoIcon}>🏠</Text>
        </View>
        <Text style={styles.appName}>CampusStay</Text>
        <Text style={styles.tagline}>Find your place. Live your campus life.</Text>
      </Animated.View>

      <View style={styles.dots}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: Colors.blue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: Colors.blue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  logoIcon: {
    fontSize: 36,
  },
  appName: {
    fontSize: 38,
    fontFamily: Fonts.heading,
    color: Colors.white,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    fontFamily: Fonts.body,
    color: "#93C5FD",
    textAlign: "center",
    lineHeight: 22,
  },
  dots: {
    position: "absolute",
    bottom: 60,
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(147,197,253,0.4)",
  },
  dotActive: {
    width: 24,
    backgroundColor: "#93C5FD",
  },
});
