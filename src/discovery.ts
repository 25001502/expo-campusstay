import { properties, universities, type Property, type Room } from './data';

export const quickFilters = [
  'Near Campus',
  'Under R5,000',
  'Private Room',
  'Shared Room',
  'Available Now',
  'Wi-Fi',
  'Furnished',
] as const;

export type QuickFilter = typeof quickFilters[number];
export type DiscoverySort = 'recommended' | 'price-low' | 'price-high' | 'rating' | 'distance';

export type DiscoveryFilters = {
  query: string;
  maximumPrice: number;
  amenities: string[];
  universityId?: string;
  quickFilter?: QuickFilter;
  sort: DiscoverySort;
};

export const DEFAULT_MAXIMUM_PRICE = 10000;

export function createDefaultDiscoveryFilters(): DiscoveryFilters {
  return {
    query: '',
    maximumPrice: DEFAULT_MAXIMUM_PRICE,
    amenities: [],
    sort: 'recommended',
  };
}

function normalize(value: string | undefined) {
  return value?.trim().toLocaleLowerCase() ?? '';
}

export function propertyMatchesQuery(property: Property, query: string) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return true;

  const university = universities.find((item) => item.id === property.university);
  const searchable = [
    property.name,
    property.type,
    property.city,
    property.address,
    university?.name,
    university?.short,
    university?.city,
    ...property.amenities,
    ...property.tags,
  ];

  return searchable.some((value) => normalize(value).includes(normalizedQuery));
}

export function propertyMatchesQuickFilter(property: Property, filter?: QuickFilter) {
  if (!filter) return true;
  switch (filter) {
    case 'Near Campus':
      return property.distance <= 1;
    case 'Under R5,000':
      return property.price < 5000;
    case 'Private Room':
      return property.rooms.some((room) => room.type === 'Private' && room.available > 0);
    case 'Shared Room':
      return property.rooms.some((room) => room.type === 'Shared' && room.available > 0);
    case 'Available Now':
      return property.available > 0;
    case 'Wi-Fi':
      return property.amenities.includes('Wi-Fi');
    case 'Furnished':
      return property.rooms.some((room) => room.furnished && room.available > 0);
  }
}

export function filterAndSortProperties(
  source: readonly Property[],
  filters: DiscoveryFilters,
) {
  const indexed = source
    .map((property, index) => ({ property, index }))
    .filter(({ property }) =>
      propertyMatchesQuery(property, filters.query)
      && property.price <= filters.maximumPrice
      && (!filters.universityId || property.university === filters.universityId)
      && filters.amenities.every((amenity) => property.amenities.includes(amenity))
      && propertyMatchesQuickFilter(property, filters.quickFilter));

  const compare = (left: Property, right: Property) => {
    switch (filters.sort) {
      case 'price-low': return left.price - right.price;
      case 'price-high': return right.price - left.price;
      case 'rating': return right.rating - left.rating;
      case 'distance': return left.distance - right.distance;
      case 'recommended': return 0;
    }
  };

  return indexed
    .sort((left, right) => compare(left.property, right.property) || left.index - right.index)
    .map(({ property }) => property);
}

export function createUniversityDiscoveryContext(universityId: string) {
  return universities.some((university) => university.id === universityId)
    ? { universityId }
    : {};
}

export function resolveSelectedRoom(property: Property, roomId?: string): Room | undefined {
  if (!roomId) return undefined;
  return property.rooms.find((room) => room.id === roomId && room.available > 0);
}

export function toggleStableId(ids: readonly string[], id: string) {
  return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
}

export function addStableId(ids: readonly string[], id: string) {
  return ids.includes(id) ? [...ids] : [...ids, id];
}

export function removeStableId(ids: readonly string[], id: string) {
  return ids.filter((value) => value !== id);
}

export function pruneComparisonSelection(selected: readonly string[], favoriteIds: readonly string[]) {
  const favorites = new Set(favoriteIds);
  return selected.filter((id, index) => favorites.has(id) && selected.indexOf(id) === index);
}

export type FavoritesAction =
  | { type: 'toggle'; id: string }
  | { type: 'add'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'reset'; ids: string[] };

export function favoritesReducer(state: string[], action: FavoritesAction) {
  switch (action.type) {
    case 'toggle': return toggleStableId(state, action.id);
    case 'add': return addStableId(state, action.id);
    case 'remove': return removeStableId(state, action.id);
    case 'reset': return [...new Set(action.ids)];
  }
}

export function getBestPropertyIds(
  source: readonly Property[],
  getValue: (property: Property) => number | null | undefined,
  direction: 'lower' | 'higher',
) {
  const values = source
    .map((property) => ({ id: property.id, value: getValue(property) }))
    .filter((item): item is { id: string; value: number } =>
      typeof item.value === 'number' && Number.isFinite(item.value));
  if (!values.length) return new Set<string>();
  const best = direction === 'lower'
    ? Math.min(...values.map((item) => item.value))
    : Math.max(...values.map((item) => item.value));
  return new Set(values.filter((item) => item.value === best).map((item) => item.id));
}

export function getPropertyById(id: string) {
  return properties.find((property) => property.id === id);
}
