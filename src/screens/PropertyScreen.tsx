import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Colors, Fonts, Radius, Shadow } from '../theme';
import { Badge, VerifiedBadge, StarRating, Btn, Divider } from '../components/UI';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Property'>;
const { width } = Dimensions.get('window');

const TABS = ['About', 'Rooms', 'Reviews'] as const;
type Tab = typeof TABS[number];

export default function PropertyScreen({ navigation, route }: Props) {
  const { property } = route.params;
  const insets = useSafeAreaInsets();
  const [imgIdx, setImgIdx] = useState(0);
  const [tab, setTab] = useState<Tab>('About');
  const [isFav, setIsFav] = useState(false);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Image gallery */}
        <View style={styles.gallery}>
          <FlatList
            horizontal
            pagingEnabled
            data={property.images}
            keyExtractor={(_, i) => String(i)}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setImgIdx(
                Math.round(e.nativeEvent.contentOffset.x / width)
              )
            }
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={{ width, height: 260 }}
                contentFit="cover"
              />
            )}
          />

          <View
            style={[
              styles.galleryTopBar,
              { paddingTop: insets.top + 8 },
            ]}
          >
            {/* Back button */}
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
            >
              <Ionicons
                name="arrow-back-outline"
                size={22}
                color={Colors.slate700}
              />
            </TouchableOpacity>

            {/* Favorite button */}
            <TouchableOpacity
              style={[
                styles.favBtn,
                isFav && styles.favBtnActive,
              ]}
              onPress={() => setIsFav(!isFav)}
            >
              <Text>
                {isFav ? (
                  <Ionicons
                    name="heart"
                    size={24}
                    color="#fffefe"
                  />
                ) : (
                  <Ionicons
                    name="heart-outline"
                    size={24}
                    color="#000"
                  />
                )}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Image dots */}
          <View style={styles.dots}>
            {property.images.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === imgIdx && styles.dotActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Property info */}
        <View style={styles.infoSection}>
          <View style={styles.badgeRow}>
            {property.verified && <VerifiedBadge />}
            <Badge label={property.type} variant="gray" />
          </View>

          <Text style={styles.name}>{property.name}</Text>

          <Text style={styles.address}>
            {property.address} · {property.distance} km from campus
          </Text>

          <View style={styles.ratingRow}>
            <StarRating rating={property.rating} />
            <Text style={styles.reviewCount}>
              ({property.reviews} reviews)
            </Text>
            <Text style={styles.dot2}>·</Text>
            <Badge
              label={`${property.available} available`}
              variant="green"
            />
          </View>

          <Text style={styles.price}>
            R{property.price.toLocaleString()}
            <Text style={styles.priceSub}>/month</Text>
          </Text>
        </View>

        <Divider />

        {/* Tabs */}
        <View style={styles.tabBar}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={styles.tabItem}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === t && styles.tabTextActive,
                ]}
              >
                {t}
              </Text>

              {tab === t && (
                <View style={styles.tabIndicator} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tabContent}>
          {/* About */}
          {tab === 'About' && (
            <View style={{ gap: 20 }}>
              <View>
                <Text style={styles.sectionTitle}>
                  About this accommodation
                </Text>

                <Text style={styles.desc}>
                  {property.description}
                </Text>
              </View>

              <View>
                <Text style={styles.sectionTitle}>
                  Amenities
                </Text>

                <View style={styles.amenitiesGrid}>
                  {property.amenities.map((a) => (
                    <View key={a} style={styles.amenityItem}>
                      <Text style={styles.amenityIcon}>✓</Text>
                      <Text style={styles.amenityText}>
                        {a}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View>
                <Text style={styles.sectionTitle}>
                  Location
                </Text>

                <View style={styles.mapPlaceholder}>
                  <Image
                    source={{
                      uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&h=200&fit=crop&auto=format',
                    }}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="cover"
                  />

                  <View style={styles.mapOverlay} />

                  <View style={styles.mapBadge}>
                    <Text style={styles.mapBadgeText}>
                      {property.distance} km from university
                    </Text>
                  </View>
                </View>
              </View>

              <View>
                <Text style={styles.sectionTitle}>
                  House Rules
                </Text>

                {property.rules.map((r) => (
                  <View key={r} style={styles.ruleItem}>
                    <View style={styles.ruleDot} />

                    <Text style={styles.ruleText}>
                      {r}
                    </Text>
                  </View>
                ))}
              </View>

              <View>
                <Text style={styles.sectionTitle}>
                  Property Manager
                </Text>

                <View style={styles.managerCard}>
                  <View style={styles.managerAvatar}>
                    <Text style={styles.managerAvatarText}>
                      {property.manager.name
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')}
                    </Text>
                  </View>

                  <View style={styles.managerInfo}>
                    <Text style={styles.managerName}>
                      {property.manager.name}
                    </Text>

                    <View style={styles.managerMeta}>
                      {property.manager.verified && (
                        <Badge
                          label="Verified"
                          variant="blue"
                        />
                      )}

                      <Text style={styles.managerResponse}>
                        Responds {property.manager.responseTime}
                      </Text>
                    </View>
                  </View>

                  <Btn
                    variant="secondary"
                    onPress={() =>
                      (navigation as any).navigate('Chat', {
                        convId: 'c1',
                      })
                    }
                    style={styles.msgBtn}
                  >
                    Message
                  </Btn>
                </View>
              </View>
            </View>
          )}

          {/* Rooms */}
          {tab === 'Rooms' && (
            <View style={{ gap: 12 }}>
              {property.rooms.map((r) => (
                <View key={r.id} style={styles.roomCard}>
                  <View style={styles.roomTop}>
                    <View>
                      <Text style={styles.roomType}>
                        {r.type} Room
                      </Text>

                      <Text style={styles.roomMeta}>
                        Capacity: {r.capacity} · {r.bathroom} ·{' '}
                        {r.furnished
                          ? 'Furnished'
                          : 'Unfurnished'}
                      </Text>
                    </View>

                    <Badge
                      label={
                        r.available > 0
                          ? `${r.available} left`
                          : 'Full'
                      }
                      variant={
                        r.available > 0
                          ? 'green'
                          : 'red'
                      }
                    />
                  </View>

                  <View style={styles.roomFooter}>
                    <Text style={styles.roomPrice}>
                      R{r.price.toLocaleString()}
                      <Text style={styles.roomPriceSub}>
                        /mo
                      </Text>
                    </Text>

                    <Btn
                      onPress={() =>
                        navigation.navigate('Apply', {
                          property,
                        })
                      }
                      disabled={r.available === 0}
                      style={styles.applyBtn}
                    >
                      Apply Now
                    </Btn>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Reviews */}
          {tab === 'Reviews' && (
            <View style={{ gap: 16 }}>
              <View style={styles.ratingOverview}>
                <View style={styles.ratingBig}>
                  <Text style={styles.ratingNumber}>
                    {property.rating}
                  </Text>

                  <Text style={styles.ratingStars}>
                    ★★★★★
                  </Text>

                  <Text style={styles.ratingCount}>
                    {property.reviews} reviews
                  </Text>
                </View>

                <View style={styles.ratingBars}>
                  {[5, 4, 3, 2, 1].map((s) => (
                    <View
                      key={s}
                      style={styles.ratingBar}
                    >
                      <Text style={styles.ratingBarLabel}>
                        {s}
                      </Text>

                      <View style={styles.ratingBarTrack}>
                        <View
                          style={[
                            styles.ratingBarFill,
                            {
                              width: `${
                                s === 5
                                  ? 65
                                  : s === 4
                                  ? 25
                                  : s === 3
                                  ? 7
                                  : 3
                              }%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {[
                {
                  name: 'Luvuyo M.',
                  time: '2 weeks ago',
                  rating: 5,
                  text: 'Clean, safe, and very close to campus. The Wi-Fi is fast and staff are responsive.',
                },
                {
                  name: 'Farai N.',
                  time: '1 month ago',
                  rating: 5,
                  text: "I've been here since Jan and it's been great. Study room is always available.",
                },
                {
                  name: 'Busisiwe K.',
                  time: '2 months ago',
                  rating: 4,
                  text: 'Good value for money. Water pressure could be better but overall a solid place.',
                },
              ].map((r) => (
                <View
                  key={r.name}
                  style={styles.reviewItem}
                >
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewAvatar}>
                      <Text style={styles.reviewAvatarText}>
                        {r.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </Text>
                    </View>

                    <View style={styles.reviewMeta}>
                      <Text style={styles.reviewName}>
                        {r.name}
                      </Text>

                      <Text style={styles.reviewTime}>
                        {r.time}
                      </Text>
                    </View>

                    <StarRating rating={r.rating} />
                  </View>

                  <Text style={styles.reviewText}>
                    {r.text}
                  </Text>

                  <Divider style={{ marginTop: 16 }} />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View
        style={[
          styles.ctaBar,
          { paddingBottom: insets.bottom + 12 },
        ]}
      >
        <Btn
          variant="secondary"
          onPress={() => setIsFav(!isFav)}
          style={styles.saveBtn}
        >
          {isFav ? (
            <Ionicons
              name="heart"
              size={24}
              color="#fe0000"
            />
          ) : (
            <Ionicons
              name="heart-outline"
              size={24}
              color="#000"
            />
          )}
        </Btn>

        <Btn
          onPress={() =>
            navigation.navigate('Apply', { property })
          }
          style={styles.applyNowBtn}
        >
          Apply Now →
        </Btn>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  favBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  favBtnActive: {
    backgroundColor: Colors.red500,
  },

  dots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
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
    color: Colors.slate400,
    marginHorizontal: 4,
  },

  infoSection: {
    padding: 20,
    gap: 8,
  },

  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },

  name: {
    fontSize: 24,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
  },

  address: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.slate500,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  reviewCount: {
    fontSize: 13,
    color: Colors.slate400,
    fontFamily: Fonts.body,
  },

  price: {
    fontSize: 30,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
    marginTop: 4,
  },

  priceSub: {
    fontSize: 16,
    fontFamily: Fonts.body,
    color: Colors.slate400,
  },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },

  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },

  tabText: {
    fontSize: 14,
    fontFamily: Fonts.bodyMed,
    color: Colors.slate400,
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
    alignItems: 'center',
    gap: 6,
    width: '45%',
  },

  amenityIcon: {
    color: Colors.blue,
    fontSize: 13,
  },

  amenityText: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.slate700,
  },

  mapPlaceholder: {
    height: 120,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
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
    color: Colors.slate400,
    fontFamily: Fonts.body,
  },

  msgBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
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
  },

  roomType: {
    fontSize: 15,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
  },

  roomMeta: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.slate500,
    marginTop: 2,
  },

  roomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  roomPrice: {
    fontSize: 17,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
  },

  roomPriceSub: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.slate400,
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
    color: Colors.slate400,
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
    width: 10,
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
  },

  reviewName: {
    fontSize: 14,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
  },

  reviewTime: {
    fontSize: 11,
    color: Colors.slate400,
    fontFamily: Fonts.body,
  },

  reviewText: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.slate600,
    lineHeight: 20,
  },

  ctaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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

  applyNowBtn: {
    flex: 2,
  },
});