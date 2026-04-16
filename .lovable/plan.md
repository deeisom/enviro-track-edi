
The user wants the AI prompts to consistently know "EDI = Environmental Design Inc." Currently, the `generate-proposal-content` edge function calls EDI "Environmental Dynamics Inc." in the background prompt — that's a bug. The clauses recommender already uses "Environmental Design Inc." Let me verify and plan the fix.

Looking at the current state:
- `generate-proposal-content/index.ts` system prompts say **"Environmental Dynamics Inc. (EDI)"** — wrong company name
- `recommend-proposal-clauses/index.ts` says **"Environmental Design Inc. (EDI)"** — correct

### Plan

**Single file edit: `supabase/functions/generate-proposal-content/index.ts`**

1. Add a shared `COMPANY_CONTEXT` constant at the top:
   > "EDI is the abbreviation for Environmental Design Inc., an environmental consulting firm. Always expand 'EDI' as 'Environmental Design Inc.' on first mention in the section, then use 'EDI' thereafter. Never refer to the company by any other name."

2. Prepend this context to BOTH the background and scope system prompts.

3. Fix the existing typo: change "Environmental Dynamics Inc." → "Environmental Design Inc." in both system prompts.

4. Also add a reinforcement line in the user prompt: `Company: Environmental Design Inc. (EDI)` so the model sees it in user context too.

That's it — one file, three small edits. Edge functions auto-deploy so no further action needed.

### Why this works
LLMs reliably follow naming rules when stated explicitly in the system prompt AND echoed in the user prompt. Putting it in both places makes the binding stick across regenerations.

### Files modified
- `supabase/functions/generate-proposal-content/index.ts`
