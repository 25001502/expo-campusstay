import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import type { Property, Room } from '../data';
import { Colors, Fonts, Radius, Spacing, TextColors } from '../theme';
import { Badge, StarRating, Btn, Divider, IconButton, EmptyState } from '../components/UI';
import { Ionicons } from '@expo/vector-icons';
import { RemoteImage } from '../components/RemoteImage';
import { getConversationForProperty } from '../communication';
import { formatMonthlyRent } from '../bookings';
import { getCurrentRooms, getRoomLabel, groupRoomOfferings, getListedRoomCount, type RoomType } from '../rooms';
import { getPropertyAddress, getPropertyImages, getGalleryIndex, getStartingRoomPrice, getRatingMetadata, getPropertyReviewRecords, illustrativeReviewExamples } from '../propertyDetails';
import { useCommunication } from '../state/CommunicationContext';
import { useFavorites } from '../state/FavoritesContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Property'>;
const TABS = ['About', 'Rooms', 'Reviews'] as const;
type Tab = typeof TABS[number];
type DetailState = { propertyId: string; image: number; tab: Tab; roomId: string | null; examples: boolean };
const initialState = (propertyId: string): DetailState => ({ propertyId, image: 0, tab: 'About', roomId: null, examples: false });

export default function PropertyScreen({ navigation, route }: Props) {
  const { property } = route.params;
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const contentWidth = Math.max(1, width - insets.left - insets.right);
  const expanded = contentWidth < 360 || fontScale >= 1.3;
  const scrollableTabs = contentWidth < 400 && fontScale >= 1.7;
  const { isFavorite, toggleFavorite } = useFavorites();
  const { conversations } = useCommunication();
  const [state, setState] = useState(() => initialState(property.id));
  if (state.propertyId !== property.id) setState(initialState(property.id));
  const scrollRef = useRef<ScrollView>(null);
  const galleryRef = useRef<FlatList<string | null>>(null);
  const positions = useRef({ tabs: 0 });
  const scrollFrame = useRef<number | null>(null);
  useEffect(() => () => { if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current); }, [property.id]);
  const galleryImages = useMemo(() => getPropertyImages(property), [property]);
  const currentRooms = useMemo(() => getCurrentRooms(property), [property]);
  const groups = useMemo(() => groupRoomOfferings(currentRooms), [currentRooms]);
  const favorite = isFavorite(property.id);
  const imageIndex = Math.min(state.image, galleryImages.length - 1);
  const rating = getRatingMetadata(property);
  const address = getPropertyAddress(property);
  const startingPrice = getStartingRoomPrice(property);
  const selectedRoom = currentRooms.find((room) => room.id === state.roomId && room.available > 0);
  const propertyConversation = getConversationForProperty(conversations, property.id);
  const reviews = getPropertyReviewRecords(property.id);
  const galleryHeight = Math.max(260, insets.top + 112);
  const updateTab = (tab: Tab) => {
    setState((current) => ({ ...current, tab }));
    scrollRef.current?.scrollTo({ y: positions.current.tabs, animated: false });
  };
  const showRooms = () => {
    setState((current) => ({ ...current, tab: 'Rooms' }));
    if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = null;
      scrollRef.current?.scrollTo({ y: positions.current.tabs, animated: false });
    });
  };
  const applyRoom = (room: Room) => {
    if (!currentRooms.some((item) => item.id === room.id && item.available > 0)) return;
    setState((current) => ({ ...current, roomId: room.id }));
    navigation.navigate('Apply', { property, selectedRoomId: room.id });
  };
  const goToImage = (index: number) => {
    const next = getGalleryIndex(index * contentWidth, contentWidth, galleryImages.length);
    setState((current) => ({ ...current, image: next }));
    galleryRef.current?.scrollToOffset({ offset: next * contentWidth, animated: false });
  };
  const openConversation = () => {
    if (propertyConversation) navigation.navigate('Chat', { convId: propertyConversation.id });
    else Alert.alert('Conversation unavailable', 'No conversation is linked to this property. External messaging is not connected.');
  };

  return <View style={[styles.container, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
    <StatusBar style="dark" />
    <ScrollView key={property.id} ref={scrollRef} style={styles.flex} showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
      <View style={[styles.gallery, { height: galleryHeight }]}>
        <FlatList key={property.id} ref={galleryRef} horizontal pagingEnabled data={galleryImages} showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => `${property.id}-${item ?? 'fallback'}-${index}`}
          getItemLayout={(_, index) => ({ length: contentWidth, offset: contentWidth * index, index })}
          onLayout={() => galleryRef.current?.scrollToOffset({ offset: imageIndex * contentWidth, animated: false })}
          onMomentumScrollEnd={({ nativeEvent }) => setState((current) => ({ ...current, image: getGalleryIndex(nativeEvent.contentOffset.x, contentWidth, galleryImages.length) }))}
          renderItem={({ item, index }) => <RemoteImage key={`${property.id}-${index}-${item}`} source={item ? { uri: item } : null} style={{ width: contentWidth, height: galleryHeight }} contentFit="cover" accessibilityLabel={`${property.name} gallery image ${index + 1} of ${galleryImages.length}`} fallbackLabel={`${property.name} image unavailable`} />} />
        <View style={[styles.galleryTopBar, { paddingTop: Spacing.sm }]}>
          <IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} backgroundColor="rgba(255,255,255,0.92)" />
          <IconButton icon={favorite ? 'heart' : 'heart-outline'} label={favorite ? `Remove ${property.name} from favorites` : `Add ${property.name} to favorites`} selected={favorite} color={Colors.slate900} selectedColor={Colors.white} backgroundColor="rgba(255,255,255,0.92)" selectedBackgroundColor={Colors.red500} onPress={() => toggleFavorite(property.id)} />
        </View>
        <View style={styles.dots}>{galleryImages.map((_, index) => <TouchableOpacity key={index} accessibilityRole="button" accessibilityLabel={`View ${property.name} image ${index + 1} of ${galleryImages.length}`} accessibilityState={{ selected: imageIndex === index }} activeOpacity={0.7} onPress={() => goToImage(index)} style={styles.dotTarget}><View style={[styles.dot, imageIndex === index && styles.dotActive]} /></TouchableOpacity>)}</View>
      </View>
      <View style={styles.infoSection}>
        <View style={styles.badgeRow}><Badge label={property.type} variant="gray" /></View>
        <Text accessibilityRole="header" style={styles.name}>{property.name}</Text>
        <Text style={styles.address}>{address}{Number.isFinite(property.distance) && property.distance >= 0 ? ` · ${property.distance} km from campus` : ''}</Text>
        <View style={styles.ratingRow}>{rating ? <><StarRating rating={rating.rating} /><Text style={styles.reviewCount}>({rating.count} listed reviews)</Text></> : <Text style={styles.reviewCount}>No rating supplied</Text>}<Badge label={`${getListedRoomCount(currentRooms)} rooms listed`} variant="blue" /></View>
        <Text style={styles.price}>{startingPrice !== undefined ? <><Text style={styles.priceSub}>Rooms from </Text>{`R${startingPrice.toLocaleString('en-ZA')}`}<Text style={styles.priceSub}>/month</Text></> : 'Room prices unavailable'}</Text>
      </View>
      <Divider />
      <View onLayout={({ nativeEvent }) => { positions.current.tabs = nativeEvent.layout.y; }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.tabBar, { minWidth: contentWidth }]}>
          {TABS.map((tab) => <TouchableOpacity key={tab} onPress={() => updateTab(tab)} style={[styles.tabItem, scrollableTabs && styles.scrollableTabItem]} accessibilityRole="tab" accessibilityLabel={tab} accessibilityState={{ selected: state.tab === tab }} activeOpacity={0.7}>
            <Text style={[styles.tabText, state.tab === tab && styles.tabTextActive]}>{tab}</Text>
            {state.tab === tab ? <View style={styles.tabIndicator} /> : null}
          </TouchableOpacity>)}
        </ScrollView>
      </View>
      <View style={styles.tabContent}>
        {state.tab === 'About' ? <View style={styles.sections}>
          <View><Text accessibilityRole="header" style={styles.sectionTitle}>About this accommodation</Text><Text style={styles.desc}>{property.description}</Text></View>
          <View><Text accessibilityRole="header" style={styles.sectionTitle}>Amenities</Text><View style={styles.amenitiesGrid}>{property.amenities.map((amenity) => <View key={amenity} style={[styles.amenityItem, expanded && styles.amenitySingle]}><Text importantForAccessibility="no" style={styles.amenityIcon}>✓</Text><Text style={styles.amenityText}>{amenity}</Text></View>)}</View></View>
          <View><Text accessibilityRole="header" style={styles.sectionTitle}>Location</Text><View style={styles.mapPlaceholder}><Text style={styles.locationAddress}>{address}</Text>{Number.isFinite(property.distance) && property.distance >= 0 ? <View style={styles.mapBadge}><Text style={styles.mapBadgeText}>{property.distance} km from university</Text></View> : null}</View></View>
          <View><Text accessibilityRole="header" style={styles.sectionTitle}>House Rules</Text>{property.rules.map((rule) => <View key={rule} style={styles.ruleItem}><View style={styles.ruleDot} /><Text style={styles.ruleText}>{rule}</Text></View>)}</View>
          <View><Text accessibilityRole="header" style={styles.sectionTitle}>Property contact</Text><View style={[styles.managerCard, expanded && styles.managerCardCompact]}><View importantForAccessibility="no-hide-descendants" style={styles.managerAvatar}><Text maxFontSizeMultiplier={1.3} style={styles.managerAvatarText}>{property.manager.name.split(' ').map((name) => name[0]).join('')}</Text></View><View style={styles.managerInfo}><Text style={styles.managerName}>{property.manager.name}</Text><Text style={styles.managerResponse}>Listed contact information</Text></View><Btn variant="secondary" accessibilityHint={propertyConversation ? `Opens your illustrative conversation about ${property.name}` : 'Explains that no conversation is linked to this property'} onPress={openConversation} style={[styles.msgBtn, expanded && styles.msgBtnCompact]}>{propertyConversation ? 'Message' : 'Message unavailable'}</Btn></View></View>
        </View> : null}
        {state.tab === 'Rooms' ? <View style={styles.sections}><Text style={styles.contextNote}>Listed room information · Counts are not live vacancies</Text>{groups.map((group) => <RoomCategoryCard key={group.type} type={group.type} rooms={group.rooms} property={property} selectedRoomId={state.roomId} onSelect={(room) => setState((current) => ({ ...current, roomId: room.id }))} onApply={applyRoom} expanded={expanded} />)}</View> : null}
        {state.tab === 'Reviews' ? <View style={styles.sections}>
          <View style={[styles.ratingOverview, expanded && styles.ratingOverviewCompact]}>
            <View accessible accessibilityLabel={rating ? `Illustrative listing rating ${rating.rating} out of 5, ${rating.count} listed reviews. Not independently verified.` : 'No rating supplied'} style={styles.ratingBig}><Text style={styles.ratingNumber}>{rating?.rating ?? '—'}</Text>{rating ? <StarRating rating={rating.rating} /> : null}<Text style={styles.ratingCount}>{rating ? `${rating.count} listed reviews` : 'No rating supplied'}</Text></View>
            <View style={[styles.ratingBars, expanded && styles.ratingBarsCompact]}>{[5,4,3,2,1].map((stars) => <View key={stars} accessible accessibilityLabel={`${stars}-star breakdown not provided`} style={styles.ratingBar}><Text style={styles.ratingBarLabel}>{stars}</Text><View style={styles.ratingBarTrack} /><Text style={styles.ratingCount}>—</Text></View>)}<Text style={styles.contextNote}>Rating breakdown not provided</Text></View>
          </View>
          <Text style={styles.contextNote}>Illustrative listing metadata · Not independently verified</Text>
          {!reviews.length ? <EmptyState title="No property-linked reviews" description="No review records are associated with this property." /> : reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
          <Btn variant="secondary" onPress={() => setState((current) => ({ ...current, examples: !current.examples }))}>{state.examples ? 'Hide review examples' : 'View illustrative review examples'}</Btn>
          {state.examples ? <View style={styles.sections}><Text accessibilityRole="header" style={styles.sectionTitle}>Review examples</Text><Text style={styles.contextNote}>Unassociated examples, not reviews of this property. Review dates are not known.</Text>{illustrativeReviewExamples.map((review) => <ReviewCard key={review.id} review={review} />)}</View> : null}
        </View> : null}
      </View>
    </ScrollView>
    <View style={[styles.ctaBar, expanded && styles.ctaBarCompact, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
      <Btn variant="secondary" accessibilityLabel={favorite ? `Remove ${property.name} from favorites` : `Add ${property.name} to favorites`} selected={favorite} onPress={() => toggleFavorite(property.id)} style={[styles.saveBtn, expanded && styles.fullButton]}><Ionicons name={favorite ? 'heart' : 'heart-outline'} size={22} color={favorite ? Colors.red600 : Colors.slate900} /><Text style={styles.saveText}>{favorite ? 'Saved' : 'Save'}</Text></Btn>
      <Btn accessibilityLabel={selectedRoom ? `Continue application for ${getRoomLabel(selectedRoom)}, offering ${selectedRoom.id}` : 'Choose a room to apply'} accessibilityHint={selectedRoom ? 'Opens Apply with your exact selected room' : 'Opens Rooms so you can choose an offering and price'} onPress={() => selectedRoom ? applyRoom(selectedRoom) : showRooms()} style={[styles.applyNowBtn, expanded && styles.fullButton]}>Apply Now →</Btn>
    </View>
  </View>;
}

export function RoomCategoryCard({ type, rooms, property, selectedRoomId, onSelect, onApply, expanded }: { type: RoomType; rooms: Room[]; property: Property; selectedRoomId: string | null; onSelect: (room: Room) => void; onApply: (room: Room) => void; expanded: boolean }) {
  return <View style={styles.roomCard}>
    <View style={[styles.roomTop, expanded && styles.roomTopCompact]}><Text accessibilityRole="header" style={styles.roomType}>{type} Room</Text><Badge label={`${getListedRoomCount(rooms)} rooms listed`} variant="blue" /></View>
    {!rooms.length ? <Text style={styles.roomMeta}>No {type.toLowerCase()} room offerings listed.</Text> : rooms.map((room, index) => <View key={room.id} style={styles.offering}>
      {index ? <Divider /> : null}
      <TouchableOpacity accessibilityRole="radio" accessibilityLabel={`Select ${getRoomLabel(room)}, offering ${room.id}, capacity ${room.capacity}, ${room.bathroom}, ${room.furnished ? 'furnished' : 'unfurnished'}, ${formatMonthlyRent(room.price)}, ${room.available} rooms listed`} accessibilityState={{ checked: selectedRoomId === room.id, disabled: room.available <= 0 }} disabled={room.available <= 0} activeOpacity={0.7} onPress={() => onSelect(room)} style={styles.offeringSelect}>
        <View style={styles.roomCopy}><Text style={styles.offeringTitle}>{room.variant ? `${room.variant} layout` : `${type} occupancy`}{selectedRoomId === room.id ? ' · Selected' : ''}</Text><Text style={styles.roomMeta}>Capacity: {room.capacity} · {room.bathroom} · {room.furnished ? 'Furnished' : 'Unfurnished'}</Text></View><Ionicons name={selectedRoomId === room.id ? 'radio-button-on' : 'radio-button-off'} size={22} color={Colors.blue} importantForAccessibility="no" />
      </TouchableOpacity>
      <Text style={styles.roomMeta}>{room.available} rooms listed</Text>
      <View style={styles.roomFooter}><Text style={styles.roomPrice}>{formatMonthlyRent(room.price)}</Text><Btn accessibilityLabel={`Apply for ${getRoomLabel(room)} at ${property.name}, offering ${room.id}`} onPress={() => onApply(room)} disabled={room.available <= 0} style={styles.applyBtn}>Apply Now</Btn></View>
    </View>)}
  </View>;
}

export function ReviewCard({ review }: { review: { id: string; name: string; rating: number; text: string } }) {
  return <View style={styles.reviewItem}><View style={styles.reviewHeader}><View importantForAccessibility="no-hide-descendants" style={styles.reviewAvatar}><Text maxFontSizeMultiplier={1.3} style={styles.reviewAvatarText}>{review.name.split(' ').map((name) => name[0]).join('')}</Text></View><View style={styles.reviewMeta}><Text style={styles.reviewName}>{review.name}</Text><StarRating rating={review.rating} /></View></View><Text style={styles.reviewText}>{review.text}</Text><Divider style={{ marginTop: Spacing.lg }} /></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { paddingBottom: Spacing.xxl },
  sections: { gap: Spacing.xl },
  contextNote: { fontFamily: Fonts.body, fontSize: 12, lineHeight: 18, color: TextColors.muted },
  dotTarget: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  amenitySingle: { flexBasis: '100%' },
  locationAddress: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 20, color: TextColors.secondary, textAlign: 'center' },
  roomTopCompact: { flexDirection: 'column', alignItems: 'flex-start' },
  offering: { gap: Spacing.sm },
  offeringSelect: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  offeringTitle: { fontFamily: Fonts.bodySemi, color: TextColors.primary, fontSize: 14, lineHeight: 20 },
  ctaBarCompact: { flexDirection: 'column' },
  fullButton: { flex: 0, width: '100%' },
  ratingOverviewCompact: { flexDirection: 'column' },
  ratingBarsCompact: { flex: 0, width: '100%' },
  scrollableTabItem: { flex: 0, flexShrink: 0, paddingHorizontal: Spacing.lg },
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  gallery: {
    position: 'relative',
    height: 260,
  },

  galleryTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },

  dots: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 0,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },

  dotActive: {
    width: 18,
    backgroundColor: Colors.white,
  },

  dot2: {
    color: TextColors.muted,
    marginHorizontal: 4,
  },

  infoSection: {
    padding: 20,
    gap: 8,
  },

  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  name: {
    fontSize: 24,
    lineHeight: 31,
    letterSpacing: -0.4,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
  },

  address: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.body,
    color: TextColors.muted,
  },

  ratingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },

  reviewCount: {
    fontSize: 13,
    color: TextColors.muted,
    fontFamily: Fonts.body,
  },

  price: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
    marginTop: 4,
  },

  priceSub: {
    fontSize: 16,
    fontFamily: Fonts.body,
    color: TextColors.muted,
  },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },

  tabItem: {
    flex: 1,
    minHeight: 48,
    minWidth: 0,
    paddingHorizontal: 4,
    alignItems: 'center',
    paddingVertical: 14,
  },

  tabText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: Fonts.bodyMed,
    color: TextColors.muted,
  },

  tabTextActive: {
    color: Colors.blue,
    fontFamily: Fonts.bodySemi,
  },

  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    width: '60%',
    backgroundColor: Colors.blue,
    borderRadius: 1,
  },

  tabContent: {
    padding: 20,
  },

  sectionTitle: {
    fontSize: 17,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
    marginBottom: 10,
  },

  desc: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.slate600,
    lineHeight: 22,
  },

  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  amenityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 0,
  },

  amenityIcon: {
    color: Colors.blue,
    fontSize: 13,
  },

  amenityText: {
    flex: 1,
    lineHeight: 19,
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.slate700,
  },

  mapPlaceholder: {
    minHeight: 120,
    padding: Spacing.lg,
    gap: Spacing.md,
    backgroundColor: Colors.slate50,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  mapOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  mapBadge: {
    backgroundColor: Colors.blue,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },

  mapBadgeText: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: Fonts.bodySemi,
  },

  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },

  ruleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.slate300,
    marginTop: 6,
  },

  ruleText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.slate600,
    lineHeight: 20,
  },

  managerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.slate50,
    borderRadius: Radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },

  managerCardCompact: {
    flexWrap: 'wrap',
  },

  managerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },

  managerAvatarText: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.bodySemi,
  },

  managerInfo: {
    flex: 1,
    minWidth: 0,
  },

  managerName: {
    fontSize: 14,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
    marginBottom: 4,
  },

  managerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  managerResponse: {
    fontSize: 11,
    color: TextColors.muted,
    fontFamily: Fonts.body,
  },

  msgBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  msgBtnCompact: {
    width: '100%',
  },

  roomCard: {
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: Radius.xl,
    padding: 16,
    gap: 12,
  },

  roomTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },

  roomCopy: { flex: 1, minWidth: 0 },

  roomType: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
  },

  roomMeta: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: TextColors.muted,
    marginTop: 2,
    lineHeight: 18,
  },

  roomFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },

  roomPrice: {
    fontSize: 17,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
  },

  roomPriceSub: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: TextColors.muted,
  },

  applyBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },

  ratingOverview: {
    flexDirection: 'row',
    gap: 20,
    backgroundColor: Colors.slate50,
    borderRadius: Radius.xl,
    padding: 16,
  },

  ratingBig: {
    alignItems: 'center',
    gap: 4,
  },

  ratingNumber: {
    fontSize: 44,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
  },

  ratingStars: {
    color: Colors.amber,
    fontSize: 14,
  },

  ratingCount: {
    fontSize: 11,
    color: TextColors.muted,
    fontFamily: Fonts.body,
  },

  ratingBars: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },

  ratingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  ratingBarLabel: {
    fontSize: 11,
    color: Colors.slate500,
    minWidth: 14,
  },

  ratingBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.slate200,
    borderRadius: 3,
    overflow: 'hidden',
  },

  ratingBarFill: {
    height: '100%',
    backgroundColor: Colors.amber,
    borderRadius: 3,
  },

  reviewItem: {
    gap: 10,
  },

  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  reviewAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.blue100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  reviewAvatarText: {
    fontSize: 12,
    fontFamily: Fonts.bodySemi,
    color: Colors.blue,
  },

  reviewMeta: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xs,
  },

  reviewName: {
    fontSize: 14,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
  },

  reviewTime: {
    fontSize: 11,
    color: TextColors.muted,
    fontFamily: Fonts.body,
  },

  reviewText: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.slate600,
    lineHeight: 20,
  },

  ctaBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
  },

  saveBtn: {
    flex: 1,
  },

  saveText: {
    fontSize: 14,
    fontFamily: Fonts.bodySemi,
    color: Colors.slate900,
  },

  applyNowBtn: {
    flex: 2,
  },
});
