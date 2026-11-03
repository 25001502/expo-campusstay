import { properties, type Property } from '../data';

// Stack params can outlive a listing or arrive malformed from navigation state.
// Keep valid snapshots (including historical room references), reject unknown IDs.
export function getRouteProperty(property: Property | undefined): Property | undefined {
  return property && properties.some((item) => item.id === property.id)
    && typeof property.name === 'string' && typeof property.city === 'string'
    && typeof property.address === 'string' && typeof property.description === 'string'
    && Array.isArray(property.rooms) && (property.images === undefined || Array.isArray(property.images))
    && Array.isArray(property.amenities) && Array.isArray(property.rules)
    && typeof property.manager?.name === 'string'
    ? property : undefined;
}
