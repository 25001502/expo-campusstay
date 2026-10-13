# UI Phase B: student discovery

Phase B keeps the existing CampusStay navigation, mock property data, visual identity, and frontend-only behavior while making discovery interactions consistent and testable.

## State and data behavior

- `FavoritesProvider` owns one session-only set of stable property IDs. Home, Explore, Favorites, and Property Details read and update that same state. Persistence and authentication remain outside this phase.
- `filterAndSortProperties` is the single discovery pipeline. Search, university, maximum price, quick filters, amenity filters, and sort order combine rather than resetting one another.
- Multiple amenities use **AND** behavior: a property must contain every selected amenity.
- Recommended order preserves the source data order. Every other sort uses source order as a deterministic tie-breaker.
- University cards use the exact `Property.university` relationship. Search also recognizes university names and abbreviations.
- Room-specific Apply actions pass `selectedRoomId`; Apply accepts it only when the room belongs to the property and remains available.

## Shared property presentation

`PropertyCard` has focused `featured`, `list`, and `saved` variants. It centralizes reliable images, favorite controls, price and availability presentation, wrapping, and separate action targets. Saved cards add an explicit comparison control. The variants retain their prior screen-specific proportions instead of forcing every discovery layout into one card shape.

## Accessibility and responsive conventions

- Favorite and comparison controls expose selected state and action-based names.
- Search, filter, amenity, sort, and tab controls expose their role and selected state.
- Property images use `RemoteImage`; missing sources display the same accessible fallback as failed requests.
- Home card and university widths derive from the current viewport.
- Property galleries derive paging width from `useWindowDimensions`.
- Compare uses a vertical page with one discoverable horizontal table, responsive columns, headings, and labels for every criterion.
- Discovery screens use screen-appropriate status-bar contrast.

Phase B does not implement persistence, authentication, backend filtering, application validation, or manager workflow changes.
