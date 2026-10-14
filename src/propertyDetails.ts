import type { Property } from './data';
import { getCurrentRooms } from './rooms';

export function getPropertyAddress(property: Pick<Property, 'address' | 'city'>) {
  const address = property.address.trim();
  const city = property.city.trim();
  return !city || address.toLocaleLowerCase().endsWith(city.toLocaleLowerCase())
    ? address : `${address}${address ? ' · ' : ''}${city}`;
}

export function getPropertyImages(property: Pick<Property, 'images'>) {
  const images = property.images?.filter((image) => typeof image === 'string' && image.trim()) ?? [];
  return images.length ? images : [null];
}

export function getGalleryIndex(offset: number, width: number, count: number) {
  if (!Number.isFinite(offset) || !Number.isFinite(width) || width <= 0 || count <= 0) return 0;
  return Math.max(0, Math.min(count - 1, Math.round(offset / width)));
}

export function getStartingRoomPrice(property: Pick<Property, 'id' | 'rooms'>) {
  const prices = getCurrentRooms(property).filter((room) => room.available > 0 && Number.isFinite(room.price) && room.price > 0).map((room) => room.price);
  return prices.length ? Math.min(...prices) : undefined;
}

export function getRatingMetadata(property: Pick<Property, 'rating' | 'reviews'>) {
  return Number.isFinite(property.rating) && property.rating > 0 && property.rating <= 5
    && Number.isInteger(property.reviews) && property.reviews > 0
    ? { rating: property.rating, count: property.reviews } : undefined;
}

// Existing unassociated comments are retained as examples, never attached to a
// property or presented as authenticated testimonials. No date basis is known.
export const illustrativeReviewExamples = [
  { id: 'example-1', name: 'Luvuyo M.', rating: 5, originalTimeLabel: '2 weeks ago', text: 'Clean, safe, and very close to campus. The Wi-Fi is fast and staff are responsive.' },
  { id: 'example-2', name: 'Farai N.', rating: 5, originalTimeLabel: '1 month ago', text: "I've been here since Jan and it's been great. Study room is always available." },
  { id: 'example-3', name: 'Busisiwe K.', rating: 4, originalTimeLabel: '2 months ago', text: 'Good value for money. Water pressure could be better but overall a solid place.' },
] as const;

export type PropertyReview = { propertyId: string; id: string; name: string; rating: number; text: string };
const propertyReviewRecords: readonly PropertyReview[] = [];

export function getPropertyReviewRecords(propertyId: string, records = propertyReviewRecords) {
  return records.filter((record) => record.propertyId === propertyId && record.id.trim() && record.name.trim() && record.text.trim() && Number.isInteger(record.rating) && record.rating >= 1 && record.rating <= 5);
}
