

## Plan: Address Autocomplete with OpenStreetMap Nominatim

### Overview
Add a reusable address autocomplete component that queries the free OpenStreetMap Nominatim API as the user types, showing real address suggestions in a dropdown. Apply it to all location/address input fields.

### Technical approach

**New component: `src/components/AddressAutocomplete.tsx`**
- Text input with debounced (300ms) queries to `https://nominatim.openstreetmap.org/search?format=json&q={query}&addressdetails=1&limit=5`
- Uses Popover + Command (already in the project) to show suggestion dropdown below the input
- Each suggestion displays the `display_name` from Nominatim
- On selection, fires an `onSelect(address: string)` callback with the chosen address
- User can also type freely without selecting a suggestion
- Requires a `User-Agent` header per Nominatim usage policy (set to app name)

**Files to modify:**
1. `src/components/AddressAutocomplete.tsx` — new component
2. `src/pages/CreateProject.tsx` — replace the location `<Input>` with `<AddressAutocomplete>`
3. `src/pages/ProjectDetail.tsx` — replace the location edit `<Input>` with `<AddressAutocomplete>`

Client address fields (e.g. on ClientsPage) can also use this component if desired, but the primary targets are the two project location inputs.

### Nominatim usage notes
- Free, no API key needed
- Rate limit: 1 request/second (debounce handles this)
- Requires `User-Agent` header identifying the app

