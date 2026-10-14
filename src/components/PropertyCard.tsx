import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import type { Property } from '../data';
import { Colors, Fonts, Radius, Shadow, Spacing, TextColors } from '../theme';
import { Badge, Btn, IconButton, StarRating } from './UI';
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
  const rating = Number.isFinite(property.rating) && property.rating >= 0 && property.rating <= 5 ? property.rating : undefined;
  const distance = Number.isFinite(property.distance) && property.distance >= 0 ? property.distance : undefined;
  const price = Number.isFinite(property.price) && property.price >= 0 ? property.price : undefined;
  const availability = Number.isInteger(property.available) && property.available >= 0 ? property.available : undefined;

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
            source={property.images?.[0] ? { uri: property.images[0] } : null}
            style={styles.image}
            decorative
            fallbackLabel={`${property.name} image unavailable`}
          />
        </TouchableOpacity>

        {!isSaved ? (
          <View style={styles.badges} pointerEvents="none">
            {property.type ? <Badge label={property.type} /> : null}
            {variant === 'list' && availability !== undefined ? <Badge label={`${availability} rooms listed`} variant={availability > 0 ? 'green' : 'gray'} /> : null}
          </View>
        ) : null}

        {isSaved ? (
          <IconButton
            icon={comparisonSelected ? 'checkmark-circle' : 'ellipse-outline'}
            label={comparisonSelected ? `Remove ${property.name} from comparison` : `Add ${property.name} to comparison`}
            hint={comparisonSelected ? 'Selected for comparison. Activate again to deselect.' : 'Select for comparison. Choose 2 or 3 properties.'}
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

      <View style={[styles.body, isFeatured && styles.featuredBody]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`View details for ${property.name}`}
          activeOpacity={0.75}
          onPress={onOpen}
          style={[styles.detailsAction, isFeatured && styles.featuredDetails]}
        >
          <View style={styles.titleRow}>
            <Text style={styles.name}>{property.name}</Text>
            {!isFeatured && rating !== undefined ? <StarRating rating={rating} /> : null}
          </View>
          <Text style={styles.location}>{[property.city, distance !== undefined ? `${distance} km from campus` : undefined].filter(Boolean).join(' · ') || 'Location unavailable'}</Text>
          {variant === 'list' ? (
            <View style={styles.tags}>
              {property.tags.filter((tag) => tag !== 'Available Now').slice(0, 3).map((tag) => <Badge key={tag} label={tag} variant="gray" />)}
            </View>
          ) : null}
        </TouchableOpacity>

        <View style={styles.footer}>
          <View style={styles.priceGroup}>
            <Text style={styles.price}>{price !== undefined ? `R${price.toLocaleString()}` : 'Price unavailable'}</Text>
            {price !== undefined ? <Text style={styles.priceSuffix}>/month</Text> : null}
          </View>
          {isFeatured ? (rating !== undefined ? <StarRating rating={rating} /> : null) : (
            <Btn variant={isSaved ? 'secondary' : 'primary'} accessibilityLabel={`View property details for ${property.name}`} onPress={onOpen} style={styles.viewButton}>
              View
            </Btn>
          )}
        </View>
        <Text style={styles.availability}>
          {availability === undefined ? 'Availability unavailable' : availability > 0 ? `${availability} rooms listed` : 'No rooms listed'}
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
  featuredCard: { width: 280, alignSelf: 'stretch' },
  selectedCard: { borderColor: Colors.blue },
  imageWrapper: { height: 180, position: 'relative', backgroundColor: Colors.slate100 },
  featuredImage: { height: undefined, aspectRatio: 300 / 170 },
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
  featuredBody: { flexGrow: 1 },
  detailsAction: { gap: 4 },
  featuredDetails: { flexGrow: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  name: { flex: 1, minWidth: 0, fontSize: 16, lineHeight: 22, fontFamily: Fonts.heading, color: TextColors.primary },
  location: { fontSize: 13, lineHeight: 19, fontFamily: Fonts.body, color: TextColors.muted },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.xs },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs },
  priceGroup: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', flexShrink: 1, minWidth: 0 },
  price: { fontSize: 18, lineHeight: 24, fontFamily: Fonts.heading, color: TextColors.primary },
  priceSuffix: { fontSize: 12, fontFamily: Fonts.body, color: TextColors.muted },
  viewButton: { minWidth: 84, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  availability: { fontSize: 12, lineHeight: 17, fontFamily: Fonts.body, color: TextColors.muted },
});
