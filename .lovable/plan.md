

## Plan: Complete Terms & Conditions Engine (Remaining Work)

The "Save Custom Clauses to Library" feature is already implemented. Here is everything else from our earlier planning that still needs to be built.

### 1. Database migration — Seed ~24 real clauses with variables

Delete the current generic clauses and insert the comprehensive library derived from the real EDI proposals. Each clause includes verbatim language with `[bracketed]` variable placeholders.

**Categories and clauses:**

| Category | Clauses | Default? |
|---|---|---|
| `pricing_authorization` | Fee Validity Period (`[feeValidityPeriod]`), Signed Authorization, PO Requirement, Payment Terms (`[paymentTiming]`), Credit Card Surcharge, Regulatory-Change Pricing, Additional Services / Retesting | Fee Validity, Signed Auth, Payment Terms, Additional Services = default |
| `billing` | Working Hours, Portal-to-Portal, Minimum Hours / Overtime / Weekend / Holiday Rates (`[minHours]`, `[overtimeRate]`, etc.), PM Out-of-Scope Rate (`[pmRate]`), Contractor Delay Charges | None default — service-specific |
| `testing_limitations` | Point-in-Time Testing, Not Comprehensive Evaluation, Method-Specific Limitations (`[methodDetails]`), Sampling Damage Disclaimer | None default — testing jobs only |
| `scope_liability` | Scope Limitation, No Environmental Certainty, Consultant Did Not Create Hazard, Third-Party Reporting Exclusion, Security Disclaimer | All 5 = default |
| `client_responsibilities` | Hazardous Substance Notification, Drawings Requirement, Unauthorized Persons | None default — site work |
| `disposal` | Disposal Assumptions (`[wasteClassification]`), Generator Report / Manifest, Generator's Agent Authorization, Indemnity | None default — disposal/hazmat |
| `legal` | Legal Fees / Collections, Arbitration (AAA, Camden County NJ) | Arbitration = default |

~10 clauses marked `is_default: true` (the foundation block), rest marked false with `service_types` tags for auto-suggestion.

### 2. Variable fill-in UI in TermsClauseEngine

When a clause body contains `[variableName]` placeholders:
- Parse them and render inline inputs below the clause toggle
- Known-option variables get dropdowns (e.g. fee validity: "30 days" / "60 days" / "per contract"; payment timing: "upon receipt of final invoice" / "upon receipt of final report" / "at time of on-site assessment" / "per contract")
- Open variables get free-text inputs
- The clause preview text shows variables substituted in real-time
- Values stored in `termsSelections[].variables`

### 3. Service-type "Recommended" badges

When the proposal has a `serviceType` set (e.g. "air_quality", "disposal", "inspection"):
- Clauses whose `service_types` array includes the selected type show a "Recommended" badge
- A button at the top: "Add recommended clauses for [service type]" — toggles them on with one click
- Never auto-enables without user action

### 4. AI Clause Advisor — edge function + UI

**New edge function** `supabase/functions/recommend-proposal-clauses/index.ts`:
- Receives: natural language job description + full clause library (titles + bodies)
- Uses Lovable AI gateway to return JSON: recommended clause IDs, suggested variable values, and any new clause drafts for things not covered by the library
- Returns structured response the UI can parse

**UI in TermsClauseEngine:**
- Collapsible "AI Clause Advisor" panel with a textarea for describing the job
- "Get Recommendations" button
- Results appear as a checklist: existing clauses to enable (with suggested variable values), plus any new draft clauses
- "Apply All" or individual accept/reject buttons
- Completely optional — manual toggles work independently

### 5. Preview and DOCX export — variable substitution

Update both `ProposalPreview.tsx` and `proposalExport.ts`:
- When rendering terms, replace `[variableName]` in clause body with the value from the selection's `variables` map
- Unfilled variables render as `[___]` (visible placeholder) so the user knows they missed one
- Group clauses by category with section headers

### 6. ProposalBuilder — auto-suggest on serviceType change

When `serviceType` changes, show a toast or inline prompt: "We found X recommended clauses for [service type]. Add them?" — links to the Terms tab.

### Files affected

- **New migration** — delete old clauses, insert ~24 new ones with body text, categories, sort orders, service_types, `[variable]` placeholders
- **New edge function** `supabase/functions/recommend-proposal-clauses/index.ts`
- `src/components/proposals/TermsClauseEngine.tsx` — variable fill-in UI, service-type badges, AI advisor panel
- `src/components/proposals/ProposalPreview.tsx` — variable substitution in terms rendering
- `src/services/proposalExport.ts` — variable substitution in DOCX export
- `src/pages/ProposalBuilder.tsx` — service-type clause suggestion logic

