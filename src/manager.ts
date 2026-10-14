import { properties as studentProperties, universities, type Property, type Room } from './data';
import { classifyRoomCapacity, getCurrentRooms, isRoomType } from './rooms';

export const MANAGER_PROPERTY_IDS = ['p1', 'p2'] as const;
export type ManagerPropertyFilter = 'all' | 'available' | 'full';
export type ManagerApplicationStatus = 'New' | 'In review' | 'Review complete';
export type ManagerApplicationFilter = 'All' | ManagerApplicationStatus;

export type ManagerApplication = {
  id: string;
  applicantName: string;
  propertyId: string;
  roomType: string;
  submittedLabel: string;
  documentSummary: string;
  status: ManagerApplicationStatus;
};

export type ManagerTenant = {
  id: string;
  name: string;
  propertyId: string;
  roomId: string;
  moveInLabel: string;
  status: 'Active';
};

export type PropertyFormFields = {
  name: string;
  city: string;
  address: string;
  university: string;
  description: string;
  type: string;
  roomType: string;
  roomPrice: string;
  roomCapacity: string;
  roomAvailable: string;
  amenities: string;
};

export type RoomEditFields = { price: string; available: string };
export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export type ManagerState = {
  properties: Property[];
  applications: ManagerApplication[];
  tenants: ManagerTenant[];
  reviewNotes: Record<string, string>;
  nextPropertySequence: number;
};

export type ManagerAction =
  | { type: 'add-property'; property: Property }
  | { type: 'update-property'; property: Property }
  | { type: 'update-room'; propertyId: string; room: Room }
  | { type: 'save-review-note'; applicationId: string; note: string }
  | { type: 'reset'; state: ManagerState };

export const managerApplications: ManagerApplication[] = [
  { id: 'ma-1', applicantName: 'Thabo Sithole', propertyId: 'p1', roomType: 'Private Room', submittedLabel: '2 days ago', documentSummary: '4 categories selected', status: 'New' },
  { id: 'ma-2', applicantName: 'Naledi Mokoena', propertyId: 'p1', roomType: 'Shared Room', submittedLabel: '1 day ago', documentSummary: '3 categories selected', status: 'In review' },
  { id: 'ma-3', applicantName: 'Keanu Williams', propertyId: 'p2', roomType: 'Studio Room', submittedLabel: '5 days ago', documentSummary: '4 categories selected', status: 'Review complete' },
];

export const managerTenants: ManagerTenant[] = [
  { id: 'mt-1', name: 'Luvuyo Mthembu', propertyId: 'p1', roomId: 'r1', moveInLabel: 'Feb 2024', status: 'Active' },
  { id: 'mt-2', name: 'Farai Ncube', propertyId: 'p1', roomId: 'r2', moveInLabel: 'Jan 2024', status: 'Active' },
  { id: 'mt-3', name: 'Keanu Williams', propertyId: 'p2', roomId: 'r2', moveInLabel: 'Mar 2024', status: 'Active' },
];

function cloneProperty(property: Property): Property {
  const rooms = getCurrentRooms(property).map((room) => ({ ...room }));
  return {
    ...property,
    images: [...property.images],
    amenities: [...property.amenities],
    rooms,
    available: rooms.reduce((total, room) => total + room.available, 0),
    price: rooms.length ? Math.min(...rooms.map((room) => room.price)) : property.price,
    manager: { ...property.manager },
    rules: [...property.rules],
    tags: [...property.tags],
  };
}

export function createManagerState(allProperties: readonly Property[] = studentProperties): ManagerState {
  const portfolio = allProperties
    .filter((property) => MANAGER_PROPERTY_IDS.includes(property.id as typeof MANAGER_PROPERTY_IDS[number]))
    .map(cloneProperty);
  const propertyIds = new Set(portfolio.map((property) => property.id));
  return {
    properties: portfolio,
    applications: managerApplications.filter((application) => propertyIds.has(application.propertyId)).map((application) => ({ ...application })),
    tenants: managerTenants.filter((tenant) => propertyIds.has(tenant.propertyId)).map((tenant) => ({ ...tenant })),
    reviewNotes: {},
    nextPropertySequence: 1,
  };
}

export function getPropertyAvailableRooms(property: Property) {
  return getCurrentRooms(property).reduce((total, room) => total + Math.max(0, room.available), 0);
}

export function getManagerMetrics(state: Pick<ManagerState, 'properties' | 'applications' | 'tenants'>) {
  const availableRooms = state.properties.reduce((total, property) => total + getPropertyAvailableRooms(property), 0);
  const propertyIds = new Set(state.properties.map((property) => property.id));
  const activeTenants = state.tenants.filter((tenant) => tenant.status === 'Active' && propertyIds.has(tenant.propertyId)).length;
  const awaitingReview = state.applications.filter((application) => propertyIds.has(application.propertyId) && application.status !== 'Review complete').length;
  const capacity = availableRooms + activeTenants;
  return {
    totalProperties: state.properties.length,
    availableRooms,
    occupiedRooms: activeTenants,
    awaitingReview,
    activeTenants,
    occupancyRate: capacity ? Math.round((activeTenants / capacity) * 100) : 0,
  };
}

export function filterManagerProperties(properties: readonly Property[], query: string, filter: ManagerPropertyFilter) {
  const normalized = query.trim().toLowerCase();
  return properties.filter((property) => {
    const available = getPropertyAvailableRooms(property);
    const matchesFilter = filter === 'all' || (filter === 'available' ? available > 0 : available === 0);
    if (!matchesFilter) return false;
    if (!normalized) return true;
    const university = universities.find((item) => item.id === property.university);
    return [property.name, property.city, property.address, property.university, university?.name, university?.short, property.type, ...property.amenities]
      .filter((value): value is string => !!value)
      .some((value) => value.toLowerCase().includes(normalized));
  });
}

export function filterManagerApplications(applications: readonly ManagerApplication[], propertyIds: readonly string[], filter: ManagerApplicationFilter) {
  const scoped = new Set(propertyIds);
  return applications.filter((application) => scoped.has(application.propertyId) && (filter === 'All' || application.status === filter));
}

export function filterManagerTenants(tenants: readonly ManagerTenant[], propertyIds: readonly string[], query: string, propertyId?: string) {
  const scoped = new Set(propertyIds);
  const normalized = query.trim().toLowerCase();
  return tenants.filter((tenant) => scoped.has(tenant.propertyId)
    && (!propertyId || tenant.propertyId === propertyId)
    && (!normalized || tenant.name.toLowerCase().includes(normalized)));
}

export function emptyPropertyForm(): PropertyFormFields {
  return { name: '', city: '', address: '', university: '', description: '', type: 'Residence', roomType: '', roomPrice: '', roomCapacity: '', roomAvailable: '', amenities: '' };
}

export function propertyToForm(property: Property): PropertyFormFields {
  const room = property.rooms[0];
  return {
    name: property.name,
    city: property.city,
    address: property.address,
    university: property.university,
    description: property.description,
    type: property.type,
    roomType: room?.type ?? '',
    roomPrice: room ? String(room.price) : '',
    roomCapacity: room ? String(room.capacity) : '',
    roomAvailable: room ? String(room.available) : '',
    amenities: property.amenities.join(', '),
  };
}

export function validatePropertyForm(fields: PropertyFormFields): FieldErrors<keyof PropertyFormFields> {
  const errors: FieldErrors<keyof PropertyFormFields> = {};
  if (!fields.name.trim()) errors.name = 'Enter a property name.';
  if (!fields.city.trim()) errors.city = 'Enter a city.';
  if (!fields.address.trim()) errors.address = 'Enter an address.';
  if (!fields.university.trim()) errors.university = 'Select a university.';
  if (!fields.description.trim()) errors.description = 'Enter a description.';
  if (!fields.type.trim()) errors.type = 'Enter a property type.';
  if (!isRoomType(fields.roomType)) errors.roomType = 'Select Single Room or Shared Room.';
  const capacity = Number(fields.roomCapacity);
  if (!fields.roomCapacity?.trim() || classifyRoomCapacity(capacity) !== fields.roomType) errors.roomCapacity = 'Use capacity 1 for Single Room or a whole number of 2 or more for Shared Room.';
  const price = Number(fields.roomPrice);
  if (!fields.roomPrice.trim() || !Number.isFinite(price) || price <= 0) errors.roomPrice = 'Enter a price greater than zero.';
  const available = Number(fields.roomAvailable);
  if (!fields.roomAvailable.trim() || !Number.isInteger(available) || available < 0) errors.roomAvailable = 'Enter a whole number of zero or more.';
  return errors;
}

export function createManagerProperty(fields: PropertyFormFields, sequence: number): Property {
  if (Object.keys(validatePropertyForm(fields)).length || !isRoomType(fields.roomType)) throw new Error('Valid property and room details are required.');
  const id = `manager-property-${sequence}`;
  const price = Number(fields.roomPrice);
  const available = Number(fields.roomAvailable);
  const amenities = fields.amenities.split(',').map((item) => item.trim()).filter(Boolean);
  return {
    id,
    name: fields.name.trim(),
    type: fields.type.trim(),
    university: fields.university,
    city: fields.city.trim(),
    address: fields.address.trim(),
    distance: 0,
    price,
    rating: 0,
    reviews: 0,
    available,
    verified: false,
    description: fields.description.trim(),
    images: [],
    amenities,
    rooms: [{ id: `${id}-room-1`, type: fields.roomType, capacity: Number(fields.roomCapacity), price, available, bathroom: 'Not specified', furnished: false }],
    manager: { name: 'Property Manager', responseTime: 'Not available', verified: false },
    rules: [],
    tags: [],
  };
}

export function updateManagerProperty(property: Property, fields: PropertyFormFields): Property {
  const amenities = fields.amenities.split(',').map((item) => item.trim()).filter(Boolean);
  return {
    ...property,
    name: fields.name.trim(),
    type: fields.type.trim(),
    university: fields.university,
    city: fields.city.trim(),
    address: fields.address.trim(),
    description: fields.description.trim(),
    amenities,
  };
}

export function validateRoomEdit(fields: RoomEditFields): FieldErrors<keyof RoomEditFields> {
  const errors: FieldErrors<keyof RoomEditFields> = {};
  const price = Number(fields.price);
  if (!fields.price.trim() || !Number.isFinite(price) || price <= 0) errors.price = 'Enter a price greater than zero.';
  const available = Number(fields.available);
  if (!fields.available.trim() || !Number.isInteger(available) || available < 0) errors.available = 'Enter a whole number of zero or more.';
  return errors;
}

export function updateManagerRoom(property: Property, roomId: string, fields: RoomEditFields): Property {
  const rooms = getCurrentRooms(property).map((room) => room.id === roomId
    ? { ...room, price: Number(fields.price), available: Number(fields.available) }
    : room);
  const available = rooms.reduce((total, room) => total + room.available, 0);
  const prices = rooms.map((room) => room.price);
  return { ...property, rooms, available, price: prices.length ? Math.min(...prices) : property.price };
}

export function getPropertyAnalytics(state: Pick<ManagerState, 'properties' | 'tenants'>) {
  return state.properties.map((property) => {
    const available = getPropertyAvailableRooms(property);
    const occupied = state.tenants.filter((tenant) => tenant.status === 'Active' && tenant.propertyId === property.id).length;
    const capacity = available + occupied;
    return { propertyId: property.id, propertyName: property.name, available, occupied, occupancyRate: capacity ? Math.round((occupied / capacity) * 100) : 0 };
  });
}

export function managerReducer(state: ManagerState, action: ManagerAction): ManagerState {
  if (action.type === 'add-property') {
    if (state.properties.some((property) => property.id === action.property.id)) return state;
    return { ...state, properties: [...state.properties, cloneProperty(action.property)], nextPropertySequence: state.nextPropertySequence + 1 };
  }
  if (action.type === 'update-property') {
    if (!state.properties.some((property) => property.id === action.property.id)) return state;
    return { ...state, properties: state.properties.map((property) => property.id === action.property.id ? cloneProperty(action.property) : property) };
  }
  if (action.type === 'update-room') {
    const property = state.properties.find((item) => item.id === action.propertyId);
    if (!property || !property.rooms.some((room) => room.id === action.room.id)) return state;
    const fields = { price: String(action.room.price), available: String(action.room.available) };
    if (Object.keys(validateRoomEdit(fields)).length) return state;
    const updated = updateManagerRoom(property, action.room.id, fields);
    return { ...state, properties: state.properties.map((item) => item.id === updated.id ? updated : item) };
  }
  if (action.type === 'save-review-note') {
    if (!state.applications.some((application) => application.id === action.applicationId)) return state;
    const note = action.note.trim();
    const reviewNotes = { ...state.reviewNotes };
    if (note) reviewNotes[action.applicationId] = note;
    else delete reviewNotes[action.applicationId];
    return { ...state, reviewNotes };
  }
  if (action.type === 'reset') return action.state;
  return state;
}
