import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import type { Property } from '../data';
import { Colors, Fonts, Radius, Shadow, Spacing, TextColors } from '../theme';
import { Badge, Btn, IconButton, StarRating, VerifiedBadge } from './UI';
import { RemoteImage } from './RemoteImage';

type CommonProps = {
  property: Property;
  favorite: boolean;
  onToggleFavorite: () => void;
  onOpen: () => void;
  style?: StyleProp<ViewStyle>;
};

type PropertyCardProps = CommonProps & (
  | { variant: 'featured' | 'list' }
  | {
      variant: 'saved';
      comparisonSelected: boolean;
      onToggleComparison: () => void;
    }
);

export function PropertyCard(props: PropertyCardProps) {
  const { property, favorite, onToggleFavorite, onOpen, variant, style } = props;
  const isFeatured = variant === 'featured';
  const isSaved = variant === 'saved';
  const comparisonSelected = isSaved ? props.comparisonSelected : false;

  return (
    <View style={[styles.card, isFeatured && styles.featuredCard, comparisonSelected && styles.selectedCard, style]}>
      <View style={[styles.imageWrapper, isFeatured && styles.featuredImage, isSaved && styles.savedImage]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`View ${property.name}`}
          activeOpacity={0.86}
          onPress={onOpen}
          style={StyleSheet.absoluteFill}
        >
          <RemoteImage
            source={property.images[0] ? { uri: property.images[0] } : null}
            style={styles.image}
            decorative
            fallbackLabel={`${property.name} image unavailable`}
          />
        </TouchableOpacity>

        {!isSaved ? (
          <View style={styles.badges} pointerEvents="none">
            {property.verified ? <VerifiedBadge /> : null}
            {variant === 'list' ? <Badge label={`${property.available} rooms`} variant={property.available > 0 ? 'green' : 'red'} /> : null}
          </View>
        ) : null}

        {isSaved ? (
          <IconButton
            icon={comparisonSelected ? 'checkmark-circle' : 'ellipse-outline'}
            label={comparisonSelected ? `Remove ${property.name} from comparison` : `Add ${property.name} to comparison`}
            hint="Select up to three properties"
            selected={comparisonSelected}
            onPress={props.onToggleComparison}
            backgroundColor="rgba(255,255,255,0.92)"
            style={styles.compareControl}
          />
        ) : null}

        <IconButton
          icon={favorite ? 'heart' : 'heart-outline'}
          label={favorite ? `Remove ${property.name} from favorites` : `Add ${property.name} to favorites`}
          selected={favorite}
          color={Colors.slate900}
          selectedColor={Colors.white}
          backgroundColor="rgba(255,255,255,0.92)"
          selectedBackgroundColor={Colors.red500}
          onPress={onToggleFavorite}
          style={styles.favoriteControl}
        />
      </View>

      <View style={styles.body}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`View details for ${property.name}`}
          activeOpacity={0.75}
          onPress={onOpen}
          style={styles.detailsAction}
        >
          <View style={styles.titleRow}>
            <Text style={styles.name}>{property.name}</Text>
            {!isFeatured ? <StarRating rating={property.rating} /> : null}
          </View>
          <Text style={styles.location}>{property.city} · {property.distance} km from campus</Text>
          {variant === 'list' ? (
            <View style={styles.tags}>
              {property.tags.slice(0, 3).map((tag) => <Badge key={tag} label={tag} variant="gray" />)}
            </View>
          ) : null}
        </TouchableOpacity>

        <View style={styles.footer}>
          <View style={styles.priceGroup}>
            <Text style={styles.price}>R{property.price.toLocaleString()}</Text>
            <Text style={styles.priceSuffix}>/month</Text>
          </View>
          {isFeatured ? <StarRating rating={property.rating} /> : (
            <Btn variant={isSaved ? 'secondary' : 'primary'} onPress={onOpen} style={styles.viewButton}>
              View
            </Btn>
          )}
        </View>
        <Text style={styles.availability}>
          {property.available > 0 ? `${property.available} rooms available` : 'Currently full'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadow.sm,
  },
  featuredCard: { width: 280 },
  selectedCard: { borderColor: Colors.blue },
  imageWrapper: { height: 180, position: 'relative', backgroundColor: Colors.slate100 },
  featuredImage: { height: 170 },
  savedImage: { height: 160 },
  image: { width: '100%', height: '100%' },
  badges: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    right: 60,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  favoriteControl: { position: 'absolute', top: Spacing.sm, right: Spacing.sm },
  compareControl: { position: 'absolute', top: Spacing.sm, left: Spacing.sm },
  body: { padding: Spacing.lg, gap: 6 },
  detailsAction: { gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  name: { flex: 1, minWidth: 0, fontSize: 16, lineHeight: 22, fontFamily: Fonts.heading, color: TextColors.primary },
  location: { fontSize: 13, lineHeight: 19, fontFamily: Fonts.body, color: TextColors.muted },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.xs },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs },
  priceGroup: { flexDirection: 'row', alignItems: 'baseline', flexShrink: 1 },
  price: { fontSize: 18, lineHeight: 24, fontFamily: Fonts.heading, color: TextColors.primary },
  priceSuffix: { fontSize: 12, fontFamily: Fonts.body, color: TextColors.muted },
  viewButton: { minWidth: 84, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  availability: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.body, color: TextColors.muted },
});
