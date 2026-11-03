import { properties as studentProperties, universities, type Property, type Room } from './data';
import { classifyRoomCapacity, getCurrentRooms, isRetiredRoom, isRoomType, ROOM_TYPES } from './rooms';
import { newLocalId } from './documents';
import { FUNDING_REVIEW_STATUSES, type FundingDeclaration, type FundingReviewStatus } from './funding';
import { propertyGallery, withPropertyGallery, type ManagedProperty } from './managerGallery';

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
  funding?: FundingDeclaration;
  fundingProof?: 'not-attached';
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
  rooms?: RoomFormFields[];
};

export type RoomFormFields = {
  draftId?: string;
  roomType: string;
  roomPrice: string;
  roomCapacity: string;
  roomAvailable: string;
};

export type RoomEditFields = { price: string; available: string };
export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export type ManagerState = {
  properties: ManagedProperty[];
  applications: ManagerApplication[];
  tenants: ManagerTenant[];
  reviewNotes: Record<string, string>;
  fundingReviews: Record<string, FundingReviewStatus>;
  nextPropertySequence: number;
};

export type ManagerAction =
  | { type: 'add-property'; property: Property }
  | { type: 'update-property'; property: Property }
  | { type: 'update-room'; propertyId: string; room: Room }
  | { type: 'add-room'; propertyId: string; fields: RoomFormFields }
  | { type: 'save-review-note'; applicationId: string; note: string }
  | { type: 'set-funding-review'; applicationId: string; status: FundingReviewStatus }
  | { type: 'reset'; state: ManagerState };

export type ManagerReviewAction = Extract<ManagerAction, { type: 'set-funding-review' | 'save-review-note' }>;

// Keep only saved review metadata alive when navigation remounts the portal.
// This memory belongs to the JavaScript session; nothing is written to storage.
export function createManagerReviewSession() {
  let saved: Pick<ManagerState, 'fundingReviews' | 'reviewNotes'> = { fundingReviews: {}, reviewNotes: {} };
  const restore = (state: ManagerState): ManagerState => {
    const ids = new Set(state.applications.map((application) => application.id));
    return {
      ...state,
      fundingReviews: Object.fromEntries(Object.entries(saved.fundingReviews).filter(([id]) => ids.has(id))),
      reviewNotes: Object.fromEntries(Object.entries(saved.reviewNotes).filter(([id]) => ids.has(id))),
    };
  };
  return {
    restore,
    clear() { saved = { fundingReviews: {}, reviewNotes: {} }; },
    save(state: ManagerState, action: ManagerReviewAction) {
      // Reuse reducer validation and trimming, applying each event to the latest
      // saved reviews so closely spaced edits cannot overwrite another record.
      const next = managerReducer(restore(state), action);
      saved = { fundingReviews: { ...next.fundingReviews }, reviewNotes: { ...next.reviewNotes } };
    },
  };
}

export const managerReviewSession = createManagerReviewSession();

export const managerApplications: ManagerApplication[] = [
  { id: 'ma-1', applicantName: 'Thabo Sithole', propertyId: 'p1', roomType: 'Private Room', submittedLabel: '2 days ago', documentSummary: '3 historical category selections · No files attached', status: 'New', funding: { source: 'self-funded', paymentDiscussionRequested: true }, fundingProof: 'not-attached' },
  { id: 'ma-2', applicantName: 'Naledi Mokoena', propertyId: 'p1', roomType: 'Shared Room', submittedLabel: '1 day ago', documentSummary: '3 historical category selections · No files attached', status: 'In review', funding: { source: 'nsfas', nsfasStatus: 'pending', paymentDiscussionRequested: false }, fundingProof: 'not-attached' },
  { id: 'ma-3', applicantName: 'Keanu Williams', propertyId: 'p2', roomType: 'Studio Room', submittedLabel: '5 days ago', documentSummary: '4 categories selected', status: 'Review complete' },
];

export const managerTenants: ManagerTenant[] = [
  { id: 'mt-1', name: 'Luvuyo Mthembu', propertyId: 'p1', roomId: 'r1', moveInLabel: 'Feb 2024', status: 'Active' },
  { id: 'mt-2', name: 'Farai Ncube', propertyId: 'p1', roomId: 'r2', moveInLabel: 'Jan 2024', status: 'Active' },
  { id: 'mt-3', name: 'Keanu Williams', propertyId: 'p2', roomId: 'r2', moveInLabel: 'Mar 2024', status: 'Active' },
];

function cloneProperty(property: Property): ManagedProperty {
  const rooms = getCurrentRooms(property).map((room) => ({ ...room }));
  return withPropertyGallery({
    ...property,
    images: [...property.images],
    amenities: [...property.amenities],
    rooms,
    available: rooms.reduce((total, room) => total + room.available, 0),
    price: rooms.length ? Math.min(...rooms.map((room) => room.price)) : property.price,
    manager: { ...property.manager },
    rules: [...property.rules],
    tags: [...property.tags],
  }, propertyGallery(property));
}

export function createManagerState(allProperties: readonly Property[] = studentProperties): ManagerState {
  const portfolio = allProperties
    .filter((property) => MANAGER_PROPERTY_IDS.includes(property.id as typeof MANAGER_PROPERTY_IDS[number]))
    .map(cloneProperty);
  const propertyIds = new Set(portfolio.map((property) => property.id));
  return {
    properties: portfolio,
    applications: managerApplications.filter((application) => propertyIds.has(application.propertyId)).map((application) => ({ ...application, funding: application.funding ? { ...application.funding } : undefined })),
    tenants: managerTenants.filter((tenant) => propertyIds.has(tenant.propertyId)).map((tenant) => ({ ...tenant })),
    reviewNotes: {},
    fundingReviews: {},
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
  return {
    totalProperties: state.properties.length,
    availableRooms,
    // roomId identifies an offering/category, not an individual physical unit.
    // Tenant count cannot establish occupied rooms or occupancy percentage.
    occupiedRooms: null,
    awaitingReview,
    activeTenants,
    occupancyRate: null,
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

export function normalizeAmenities(value: string): string[] {
  const names = new Map<string, string>();
  for (const part of value.split(',')) {
    const name = part.trim().replace(/\s+/g, ' ');
    if (name && !names.has(name.toLocaleLowerCase())) names.set(name.toLocaleLowerCase(), name);
  }
  return [...names.values()];
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
  const rooms = getRoomFormFields(fields);
  Object.assign(errors, validateRoomForm(rooms[0] ?? { roomType: '', roomCapacity: '', roomPrice: '', roomAvailable: '' }));
  if (rooms.length < 1 || rooms.length > ROOM_TYPES.length || validateRoomSections(rooms).some((room) => Object.keys(room).length)) errors.rooms = 'Configure one or two different room types and correct the highlighted fields.';
  return errors;
}

export function emptyRoomForm(roomType = ''): RoomFormFields {
  return { draftId: newLocalId('room-section'), roomType, roomCapacity: roomType === 'Single' ? '1' : roomType === 'Shared' ? '2' : '', roomPrice: '', roomAvailable: '' };
}

// Existing callers can still provide the original flat first-room fields.
// The creation UI uses the room array as its canonical, independently keyed draft.
export function getRoomFormFields(fields: PropertyFormFields): RoomFormFields[] {
  return fields.rooms ?? [{ draftId: 'initial-room', roomType: fields.roomType, roomPrice: fields.roomPrice, roomCapacity: fields.roomCapacity, roomAvailable: fields.roomAvailable }];
}

export function validateRoomForm(fields: RoomFormFields): FieldErrors<keyof RoomFormFields> {
  const errors: FieldErrors<keyof RoomFormFields> = {};
  if (!isRoomType(fields.roomType)) errors.roomType = 'Select Single Room or Shared Room.';
  const capacity = Number(fields.roomCapacity);
  if (!fields.roomCapacity?.trim() || classifyRoomCapacity(capacity) !== fields.roomType) errors.roomCapacity = 'Use capacity 1 for Single Room or a whole number of 2 or more for Shared Room.';
  const price = Number(fields.roomPrice);
  if (!fields.roomPrice.trim() || !Number.isFinite(price) || price <= 0) errors.roomPrice = 'Enter a price greater than zero.';
  const available = Number(fields.roomAvailable);
  if (!fields.roomAvailable.trim() || !Number.isInteger(available) || available < 0) errors.roomAvailable = 'Enter a whole number of zero or more.';
  return errors;
}

export function validateRoomSections(rooms: readonly RoomFormFields[]) {
  return rooms.map((room, index) => {
    const errors = validateRoomForm(room);
    if (rooms.some((other, otherIndex) => otherIndex !== index && other.roomType === room.roomType && isRoomType(room.roomType))) errors.roomType = 'This property already has that room type.';
    return errors;
  });
}

function withRoomForms(fields: PropertyFormFields, rooms: RoomFormFields[]): PropertyFormFields {
  const first = rooms[0];
  return { ...fields, rooms, roomType: first?.roomType ?? '', roomCapacity: first?.roomCapacity ?? '', roomPrice: first?.roomPrice ?? '', roomAvailable: first?.roomAvailable ?? '' };
}

export function changeRoomSection(fields: PropertyFormFields, index: number, key: keyof Omit<RoomFormFields, 'draftId'>, value: string): PropertyFormFields {
  const rooms = getRoomFormFields(fields);
  if (!rooms[index] || (key === 'roomType' && (!isRoomType(value) || rooms.some((room, otherIndex) => index !== otherIndex && room.roomType === value)))) return fields;
  const next = { ...rooms[index], [key]: value };
  if (key === 'roomType') next.roomCapacity = value === 'Single' ? '1' : Number.isInteger(Number(next.roomCapacity)) && Number(next.roomCapacity) >= 2 ? next.roomCapacity : '2';
  return withRoomForms(fields, rooms.map((room, roomIndex) => roomIndex === index ? next : room));
}

export function addRoomSection(fields: PropertyFormFields): PropertyFormFields {
  const rooms = getRoomFormFields(fields);
  if (rooms.length >= ROOM_TYPES.length || rooms.some((room) => !isRoomType(room.roomType))) return fields;
  const missing = ROOM_TYPES.find((type) => !rooms.some((room) => room.roomType === type));
  return missing ? withRoomForms(fields, [...rooms, emptyRoomForm(missing)]) : fields;
}

export function removeRoomSection(fields: PropertyFormFields, index: number): PropertyFormFields {
  const rooms = getRoomFormFields(fields);
  return rooms.length > 1 && rooms[index] ? withRoomForms(fields, rooms.filter((_, roomIndex) => roomIndex !== index)) : fields;
}

export function propertyFormSignature(fields: PropertyFormFields) {
  return JSON.stringify({ ...fields, rooms: getRoomFormFields(fields).map(({ roomType, roomCapacity, roomPrice, roomAvailable }) => ({ roomType, roomCapacity, roomPrice, roomAvailable })) });
}

function makeManagerRoom(id: string, fields: RoomFormFields): Room {
  if (!isRoomType(fields.roomType) || Object.keys(validateRoomForm(fields)).length) throw new Error('Valid room details are required.');
  return { id, type: fields.roomType, capacity: Number(fields.roomCapacity), price: Number(fields.roomPrice), available: Number(fields.roomAvailable), bathroom: 'Not specified', furnished: false };
}

export function getMissingRoomTypes(property: Property) {
  return ROOM_TYPES.filter((type) => !getCurrentRooms(property).some((room) => room.type === type));
}

export function addManagerRoom(property: Property, fields: RoomFormFields): ManagedProperty {
  if (Object.keys(validateRoomForm(fields)).length || !getMissingRoomTypes(property).some((type) => type === fields.roomType)) throw new Error('Choose a missing room type and valid room details.');
  const base = `${property.id}-room-${fields.roomType.toLowerCase()}`;
  let id = base, suffix = 2;
  while (property.rooms.some((room) => room.id === id) || isRetiredRoom(property.id, id)) id = `${base}-${suffix++}`;
  const rooms = [...getCurrentRooms(property), makeManagerRoom(id, fields)];
  return withPropertyGallery({ ...property, rooms, available: rooms.reduce((sum, room) => sum + room.available, 0), price: Math.min(...rooms.map((room) => room.price)) }, propertyGallery(property));
}

export function createManagerProperty(fields: PropertyFormFields, sequence: number): Property {
  if (Object.keys(validatePropertyForm(fields)).length) throw new Error('Valid property and room details are required.');
  const id = `manager-property-${sequence}`;
  const rooms = getRoomFormFields(fields).map((room, index) => makeManagerRoom(`${id}-room-${index + 1}`, room));
  const price = Math.min(...rooms.map((room) => room.price));
  const available = rooms.reduce((sum, room) => sum + room.available, 0);
  const amenities = normalizeAmenities(fields.amenities);
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
    rooms,
    manager: { name: 'Property Manager', responseTime: 'Not available', verified: false },
    rules: [],
    tags: [],
  };
}

export function updateManagerProperty(property: Property, fields: PropertyFormFields): Property {
  const amenities = normalizeAmenities(fields.amenities);
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

export function updateManagerRoom(property: Property, roomId: string, fields: RoomEditFields): ManagedProperty {
  const rooms = getCurrentRooms(property).map((room) => room.id === roomId
    ? { ...room, price: Number(fields.price), available: Number(fields.available) }
    : room);
  const available = rooms.reduce((total, room) => total + room.available, 0);
  const prices = rooms.map((room) => room.price);
  return withPropertyGallery({ ...property, rooms, available, price: prices.length ? Math.min(...prices) : property.price }, propertyGallery(property));
}

export function getPropertyAnalytics(state: Pick<ManagerState, 'properties' | 'tenants'>) {
  return state.properties.map((property) => {
    const available = getPropertyAvailableRooms(property);
    const activeTenants = state.tenants.filter((tenant) => tenant.status === 'Active' && tenant.propertyId === property.id).length;
    return { propertyId: property.id, propertyName: property.name, available, activeTenants, occupied: null, occupancyRate: null };
  });
}

export function managerReducer(state: ManagerState, action: ManagerAction): ManagerState {
  if (action.type === 'set-funding-review') {
    if (!state.applications.some((application) => application.id === action.applicationId)
      || !FUNDING_REVIEW_STATUSES.includes(action.status)) return state;
    const fundingReviews = { ...state.fundingReviews };
    if (action.status === 'Not reviewed') delete fundingReviews[action.applicationId];
    else fundingReviews[action.applicationId] = action.status;
    return { ...state, fundingReviews };
  }
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
  if (action.type === 'add-room') {
    const property = state.properties.find((item) => item.id === action.propertyId);
    if (!property || Object.keys(validateRoomForm(action.fields)).length || !getMissingRoomTypes(property).some((type) => type === action.fields.roomType)) return state;
    const updated = addManagerRoom(property, action.fields);
    return { ...state, properties: state.properties.map((item) => item.id === property.id ? updated : item) };
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
