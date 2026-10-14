import { retiredRoomOfferings, type Property, type Room } from './data';

export function isRetiredRoom(propertyId: string, roomId: string) {
  return retiredRoomOfferings.some((offering) => offering.propertyId === propertyId && offering.room.id === roomId);
}

// Also excludes retired IDs in a stale navigation/property snapshot.
export function getCurrentRooms(property: Pick<Property, 'id' | 'rooms'>) {
  return (property.rooms ?? []).filter((room) => !isRetiredRoom(property.id, room.id));
}

export function getHistoricalRoom(property: Property, roomId: string) {
  return retiredRoomOfferings.find((offering) => offering.propertyId === property.id && offering.room.id === roomId)?.room
    ?? property.rooms?.find((room) => room.id === roomId);
}

export const ROOM_TYPES = ['Single', 'Shared'] as const;
export type RoomType = typeof ROOM_TYPES[number];

export function isRoomType(value: string): value is RoomType {
  return ROOM_TYPES.some((type) => type === value);
}

export function classifyRoomCapacity(capacity: number): RoomType | undefined {
  if (!Number.isInteger(capacity) || capacity < 1) return undefined;
  return capacity === 1 ? 'Single' : 'Shared';
}

export function getRoomLabel(room: Pick<Room, 'type' | 'variant'>) {
  return `${room.type} Room${room.variant ? ` · ${room.variant} layout` : ''}`;
}

export function groupRoomOfferings(rooms: readonly Room[]) {
  return ROOM_TYPES.map((type) => ({ type, rooms: rooms.filter((room) => room.type === type) }));
}

export function getListedRoomCount(rooms: readonly Room[]) {
  return rooms.reduce((total, room) => total + (Number.isInteger(room.available) && room.available >= 0 ? room.available : 0), 0);
}

// Historical references have no room ID/occupancy. Preserve unsupported labels
// as attributes, without guessing a current offering or inventing capacity.
export function getHistoricalRoomLabel(label: string | undefined) {
  if (!label) return 'Room unavailable';
  if (label === 'Private Room') return 'Single Room';
  if (label === 'Single Room' || label === 'Shared Room') return label;
  return `Room type unavailable · ${label} (historical label)`;
}
