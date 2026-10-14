import type { Property } from './data';

export const BOOKING_TABS = ['Applications', 'Upcoming', 'Active', 'Completed', 'Cancelled'] as const;
export type BookingTab = typeof BOOKING_TABS[number];
export type BookingStatus = Exclude<BookingTab, 'Applications'>;
export type BookingRecord = {
  propertyId: string;
  room?: string;
  moveIn?: string;
  rent?: number;
  status: BookingStatus;
  ref: string;
};

export type BookingTabLayout = { x: number; width: number };

// Reveal the selected label with the smallest useful movement. Prefer boundaries
// between tabs over leaving a tiny fragment of a neighboring label at an edge.
export function getBookingTabOffset(
  selected: BookingTab,
  layouts: Partial<Record<BookingTab, BookingTabLayout>>,
  viewportWidth: number,
  contentWidth: number,
  currentOffset: number,
): number | undefined {
  const measured = BOOKING_TABS.map((tab) => layouts[tab]);
  if (![viewportWidth, contentWidth, currentOffset].every(Number.isFinite)
    || viewportWidth <= 0 || contentWidth <= 0
    || measured.some((layout) => !layout || !Number.isFinite(layout.x) || !Number.isFinite(layout.width) || layout.x < 0 || layout.width <= 0 || layout.x + layout.width > contentWidth + 1)) return undefined;
  const active = layouts[selected];
  if (!active) return undefined;
  const max = Math.max(0, contentWidth - viewportWidth);
  const clamp = (value: number) => Math.min(max, Math.max(0, value));
  const current = clamp(currentOffset);
  const lower = clamp(active.x + active.width - viewportWidth);
  const upper = clamp(active.x);
  // A label wider than its viewport can only be aligned to its start; manual
  // scrolling remains available. Never produce an invalid native offset.
  if (active.width > viewportWidth) return upper;
  const candidates = [current, lower, upper, 0, max];
  const fragmentCount = (offset: number) => measured.reduce((count, layout) => {
    if (!layout) return count;
    const visible = Math.min(layout.x + layout.width, offset + viewportWidth) - Math.max(layout.x, offset);
    return count + (visible > 1 && visible < Math.min(32, layout.width * 0.4) ? 1 : 0);
  }, 0);
  for (const layout of measured) if (layout) candidates.push(clamp(layout.x), clamp(layout.x + layout.width - viewportWidth));
  return candidates.filter((offset) => offset >= lower && offset <= upper)
    .sort((a, b) => fragmentCount(a) - fragmentCount(b) || Math.abs(a - current) - Math.abs(b - current))[0];
}

// Existing on-device records. Explicit fixture categories are not live stay dates.
const bookingRecords: readonly BookingRecord[] = [
  { propertyId: 'p1', room: 'Private Room', moveIn: '1 Feb 2025', rent: 3500, status: 'Active', ref: '#CS-20481' },
  { propertyId: 'p2', room: 'Studio Room', moveIn: '1 Aug 2025', rent: 5200, status: 'Upcoming', ref: '#CS-20522' },
  { propertyId: 'p3', room: 'Shared Room', moveIn: '1 Mar 2024', rent: 2600, status: 'Completed', ref: '#CS-19845' },
];

export function getBookingTab(section: string | undefined): BookingTab {
  return BOOKING_TABS.find((tab) => tab === section) ?? 'Applications';
}

export function getBookingItems(tab: BookingTab, properties: readonly Property[], records = bookingRecords) {
  return records.flatMap((booking) => {
    if (tab === 'Applications' || booking.status !== tab || !booking.ref.trim()) return [];
    const property = properties.find((item) => item.id === booking.propertyId);
    return property ? [{ booking, property }] : [];
  });
}

export function formatMonthlyRent(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? `R${value.toLocaleString('en-ZA')}/month`
    : 'Rent unavailable';
}
