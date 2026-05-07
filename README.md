# EnviroTrack EDI

Project management software for Environmental Design Inc. environmental consulting work.

## Main Code Location

This repository is the source of truth:

`C:/Users/jm/Documents/Codex/2026-04-30/i-want-to-move-a-project/enviro-track-edi`

The app is a Vite + React + TypeScript frontend using Supabase for auth, database, row-level security, and edge functions.

## Local Setup

Prerequisites:

```text
Node.js 20 or newer
npm
Supabase CLI, via npx or a supported installer
```

1. Install dependencies:

   ```powershell
   npm ci
   ```

2. Create a local `.env.local` file from `.env.example` and fill in the Supabase values:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Start local development:

   ```powershell
   npm run dev
   ```

4. Open the app:

   ```text
   http://127.0.0.1:8080/
   ```

## Quality Checks

Run these before committing or deploying:

```powershell
npm run verify:off-lovable
npm run typecheck
npm run lint
npm run test
npm run build
```

Current known lint status: the app passes with warnings from existing React Fast Refresh and hook dependency rules.

For a stricter pre-deploy check after `.env.local` is filled in:

```powershell
npm run verify:deploy
```

`verify:off-lovable` confirms the repo has no Lovable runtime dependency, checks the Supabase/Vercel deployment files, and warns about local account tooling or environment values that still need to be configured.

## Supabase Setup

The current Supabase project ref is:

```text
wzlqrcrwhafzuqtnfhou
```

Apply database migrations:

```powershell
supabase db push --project-ref wzlqrcrwhafzuqtnfhou
```

Set AI edge function secrets:

```powershell
supabase secrets set OPENAI_API_KEY=your-openai-api-key --project-ref wzlqrcrwhafzuqtnfhou
supabase secrets set OPENAI_MODEL=gpt-5-mini --project-ref wzlqrcrwhafzuqtnfhou
```

Deploy edge functions:

```powershell
supabase functions deploy generate-proposal-content --project-ref wzlqrcrwhafzuqtnfhou
supabase functions deploy recommend-proposal-clauses --project-ref wzlqrcrwhafzuqtnfhou
```

For Google sign-in, enable Google as a Supabase Auth provider and add local plus production URLs to Supabase Auth redirect settings.

## Vercel Deployment

Connect Vercel to:

```text
deeisom/enviro-track-edi
```

Use:

```text
Framework: Vite
Build command: npm run build
Output directory: dist
```

Set these Vercel environment variables:

```text
VITE_SUPABASE_PROJECT_ID
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

OpenAI secrets belong in Supabase Edge Function secrets, not Vercel frontend environment variables.
