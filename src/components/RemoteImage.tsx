import React, { useState } from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Image, ImageProps } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Radius, Spacing, TextColors } from '../theme';
import { IconButton } from './UI';

type AccessibilityProps =
  | { decorative: true; accessibilityLabel?: never }
  | { decorative?: false; accessibilityLabel: string };

type RemoteImageProps = AccessibilityProps & {
  source: ImageProps['source'] | null | undefined;
  style?: StyleProp<ViewStyle>;
  contentFit?: ImageProps['contentFit'];
  aspectRatio?: number;
  retryable?: boolean;
  fallbackLabel?: string;
};

export function RemoteImage({
  source,
  style,
  contentFit = 'cover',
  aspectRatio,
  decorative = false,
  accessibilityLabel,
  retryable = true,
  fallbackLabel = 'Image unavailable',
}: RemoteImageProps) {
  const [loading, setLoading] = useState(!!source);
  const [failed, setFailed] = useState(!source);
  const [attempt, setAttempt] = useState(0);

  const retry = () => {
    if (!source) return;
    setFailed(false);
    setLoading(true);
    setAttempt((value) => value + 1);
  };

  return (
    <View style={[styles.container, aspectRatio ? { aspectRatio } : null, style]}>
      {source && !failed ? (
        <Image
          key={attempt}
          source={source}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          transition={150}
          accessible={!decorative}
          accessibilityLabel={decorative ? undefined : accessibilityLabel}
          onLoadStart={() => setLoading(true)}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setFailed(true);
          }}
        />
      ) : null}

      {loading && !failed ? (
        <View
          accessible={!decorative}
          accessibilityRole={decorative ? undefined : 'progressbar'}
          accessibilityLabel={decorative ? undefined : accessibilityLabel ? `Loading ${accessibilityLabel}` : 'Loading image'}
          importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
          style={styles.overlay}
        >
          <ActivityIndicator color={Colors.blue} />
        </View>
      ) : null}

      {failed ? (
        <View
          accessible={!decorative}
          accessibilityRole={decorative ? undefined : 'alert'}
          accessibilityLabel={decorative ? undefined : fallbackLabel}
          importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
          style={styles.fallback}
        >
          <Ionicons name="image-outline" size={28} color={Colors.slate600} importantForAccessibility="no-hide-descendants" />
          <Text style={styles.fallbackText}>{fallbackLabel}</Text>
          {retryable && source ? (
            <IconButton
              icon="refresh"
              label="Retry image"
              hint="Attempts to load this image again"
              onPress={retry}
              color={Colors.blue}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: Colors.slate100,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.slate100,
  },
  fallback: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    gap: Spacing.xs,
    backgroundColor: Colors.slate100,
    borderRadius: Radius.md,
  },
  fallbackText: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: Fonts.bodyMed,
    color: TextColors.muted,
    textAlign: 'center',
  },
});
