
# Environmental Project Management App

## Overview
A project management tool for an environmental consulting company, starting with project tracking and status management. Uses local storage initially, designed to migrate to a cloud database later.

## Pages & Layout

### 1. Dashboard (Home)
- Summary cards showing project counts by status phase (1.0 through 7.0)
- Quick-action buttons: "New Project", "Search Projects"
- Recent activity feed showing latest status changes

### 2. Projects List
- Searchable, filterable table of all projects
- Filter by status phase, client name, date range
- Sort by project number, date created, status
- Tabs or toggle: "Active" vs "Archived" (phases 6.0, 7.0, and 1.1 auto-archive)
- Bulk actions for status updates

### 3. Create/Edit Project
- Auto-generated sequential project number (PR-0001, PR-0002...)
- Fields: Project name, description, client (from saved clients or add new), location/site address, assigned team member(s), notes
- Status selector defaulting to "1.0 - Proposal Phase"
- Option to link a parent project (for the 1.1 placeholder → child project workflow)

### 4. Project Detail View
- Full project info with edit capability
- **Status timeline** — visual progress bar showing all 7 phases with sub-statuses (3.1, 3.2, 4.1), current phase highlighted
- Status change button with confirmation and optional note
- Activity log of all status changes with timestamps
- Linked client/contact info displayed inline

### 5. Clients & Contacts Database
- Client list with search
- Each client: company name, address, industry/type, notes
- Contacts linked to clients: name, title, email, phone
- When creating a project, pick existing client or create new inline
- View all projects associated with a client

## Project Status System (from your document)
Phases implemented exactly as provided:
- **1.0** Proposal Phase (with 1.1 Placeholder → archive)
- **2.0** Planning Phase
- **3.0** Fieldwork/Active Phase (with 3.1 Pre-Paid, 3.2 Partial Invoice sub-statuses)
- **4.0** Deliverables Phase (with 4.1 Invoiced/Need Final Report)
- **5.0** Billing Phase
- **6.0** Closed/Complete → auto-archive
- **7.0** Cancelled → auto-archive

Each status change logs who changed it and when, with optional notes.

## Data Architecture (Local Storage, migration-ready)
All data stored in structured JSON via localStorage with a service layer abstraction, making it straightforward to swap in Supabase later:
- `projects` — project records with status history
- `clients` — company records
- `contacts` — people linked to clients
- `activityLog` — status change history

## Design & UX
- Clean, professional interface with sidebar navigation
- Color-coded status badges for quick scanning
- Responsive layout for desktop-first use (tablet-friendly)
- Toast notifications for actions (project created, status updated, etc.)

## Future-Ready Considerations
- Data layer abstracted so Supabase can replace localStorage later
- Client/contact structure ready to support the invoicing feature when added
- Project number generator designed to be configurable (prefix, format)
