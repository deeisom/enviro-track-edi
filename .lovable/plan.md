

## Plan: Proposal Generation Feature — Phased Build

This is a large feature. I recommend building it in **3 phases** to get a working system quickly, then layering on advanced capabilities.

---

### Phase 1 — Foundation (database, types, dashboard, basic builder)

**Database migration** — Create these tables:

- `proposals` — core record linking to client/project/estimate, storing status, metadata, all section content as JSONB fields (cover_page, proposal_details, background, scope, fee_items, terms_selections, acceptance), version number, dates, template settings
- `proposal_clauses` — reusable terms clause library (title, body text, category, is_default, sort_order)
- `proposal_counter` — auto-incrementing proposal numbers (like existing project/invoice counters)

RLS: authenticated can CRUD, admin can delete.

**Types** (`src/types/proposal.ts`) — Define `Proposal`, `ProposalFeeItem`, `ProposalClauseSelection`, `ProposalStatus` (Draft, Draft with AI, Internal Review, Finalized, Sent, Accepted, Rejected, Superseded), AI content block types.

**Storage service** (`src/services/proposalStorage.ts`) — CRUD for proposals, clauses, counter RPC.

**Proposal Dashboard** (`src/pages/ProposalsPage.tsx`) — List view with status badges, create/duplicate/open actions. Add "Proposals" to sidebar nav.

**Proposal Builder** (`src/pages/ProposalBuilder.tsx`) — Multi-step guided builder:

1. **Setup step** — Select client (searchable combobox), project, linked estimate, auto-fill known fields
2. **Details step** — Edit proposal number, date, expiration, service type, site/facility info, contact, company rep info
3. **Content step** — Split-view layout:
   - Left: structured input panels for Background inputs, Scope inputs, fee schedule editor, terms clause toggles
   - Right: live document-style preview matching the template layout
4. **Review & Export step** — Final preview, save draft, export DOCX/PDF

**Route**: `/proposals` (dashboard), `/proposals/new` and `/proposals/:id` (builder)

---

### Phase 2 — Document preview, fee schedule, terms engine

**Live document preview component** (`src/components/proposals/ProposalPreview.tsx`) — A styled div that visually mirrors the legacy template:
- Cover page with logo, service title, site info, client info, project number, date
- Proposal details page (Between the Client / And the Consultant / For the Project)
- Background & Scope section with editable text areas
- Fee schedule table (Item, Description, Qty, Rate, Amount) with auto-calculated totals
- Terms & Conditions assembled from selected clauses
- Acceptance page with signature blocks

**Fee schedule editor** — Import line items from linked estimate, allow reorder/add/remove/edit display values, store both source and display values, optional/alternate row flag, live total calculation.

**Terms clause engine** — Seed default clauses from the legacy template content. UI shows clause toggles grouped by category (foundation, billing, testing limitations, disposal, legal). Each clause is editable inline. Assemble final terms in document order.

**DOCX export** (`src/services/proposalExport.ts`) — Using `docx` npm package to generate Word documents matching the template: correct fonts (likely Times New Roman/Calibri per the legacy doc), margins, logo placement, header/footer with "EDI", fee table styling, signature spacing, page breaks. Copy the logo image from the uploaded template into `public/images/`.

**PDF export** — Convert via the same structured data, using a print-friendly layout or server-side conversion.

---

### Phase 3 — AI assistance, versioning, duplication

**AI content generation** — Edge function using Lovable AI gateway for Background and Scope sections only. Structured prompt inputs (service type, concern, affected areas, methods, deliverables, etc.) sent to AI. Response is editable text. Per-section controls: Generate, Regenerate, Edit, Lock/Unlock. Warning on regeneration about overwriting.

**Duplication** — Deep copy all proposal content. AI sections become static saved text. No auto-regeneration. Locked by default.

**Versioning** — Save version snapshots. Track version number. Allow viewing previous versions.

**Status workflow** — Full status progression with validation (e.g., warn on missing fields before Finalized).

---

### Technical Details

**New files created:**
- `src/types/proposal.ts`
- `src/services/proposalStorage.ts`
- `src/services/proposalExport.ts`
- `src/pages/ProposalsPage.tsx`
- `src/pages/ProposalBuilder.tsx`
- `src/components/proposals/ProposalPreview.tsx`
- `src/components/proposals/ProposalSetup.tsx`
- `src/components/proposals/ProposalDetails.tsx`
- `src/components/proposals/FeeScheduleEditor.tsx`
- `src/components/proposals/TermsClauseEngine.tsx`
- `src/components/proposals/AcceptanceSection.tsx`
- `src/components/proposals/CoverPagePreview.tsx`
- `src/components/proposals/AIContentControls.tsx`

**Modified files:**
- `src/App.tsx` — add proposal routes
- `src/components/AppSidebar.tsx` — add Proposals nav item

**Database migration:**
- `proposals` table with JSONB content fields
- `proposal_clauses` table with seed data from legacy template
- `proposal_counter` table + RPC function
- RLS policies for all new tables

**Dependencies:**
- `docx` (npm) — DOCX generation for export

**Logo/branding:** Extract the EDI logo from the uploaded template and store in `public/images/` for use in both preview and export.

---

### What ships first

Phase 1 gives you a working proposal dashboard, guided setup, and basic builder with live preview. You can create, save, and manage proposals immediately. Phase 2 adds polished export and the terms engine. Phase 3 adds optional AI. I will build Phase 1 first, then continue with Phase 2 in the same pass if scope allows.

