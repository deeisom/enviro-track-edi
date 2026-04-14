

## Plan: Enhanced Client & Contact Search

### Problem
Current search only matches client company names. With ~3,000 clients and ~3,400 contacts, users need to search across multiple fields including contact names, emails, and phone numbers.

### Solution
Replace the simple text input with a comprehensive search that:

1. **Searches across all fields** -- company name, address, industry, phone, website, AND contact names, emails, and phone numbers
2. **Shows what matched** -- when a result matches on a contact name or email, display that info on the card so users know why it appeared
3. **Loads contacts alongside clients** -- fetch all contacts on page load and index them by `clientId` for fast cross-referencing
4. **Adds a switchable view** -- toggle between card grid view and a compact table/list view for scanning large result sets faster
5. **Pagination** -- show results in pages (e.g. 50 at a time) instead of rendering all 3,000 cards at once

### Technical Details

**File: `src/pages/ClientsPage.tsx`** (ClientsList component)
- Add state: `contacts` (all contacts loaded via `getAllContacts()`), `viewMode` (grid/table), `page` number
- Build a contacts-by-client map: `Map<string, Contact[]>`
- Update filter logic to search across client fields AND associated contact fields
- When a match comes from a contact, show the matching contact name/email on the client card
- Add a view toggle (grid vs table) and pagination controls
- Table view shows: company name, industry, phone, contact count, matched contact info

**No database or backend changes needed** -- all done client-side with existing data.

### Files Modified
- `src/pages/ClientsPage.tsx` -- enhanced search, view toggle, pagination

