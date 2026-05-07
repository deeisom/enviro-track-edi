# Off-Lovable Deployment Checklist

Use this checklist to make EnviroTrack fully available without Lovable hosting or Lovable-managed runtime services.

## 1. Confirm Backend Ownership

Open the Lovable Cloud settings for the original project and confirm whether the backend is:

- Your own Supabase project: continue using the current project ref if you can see it in your Supabase dashboard.
- Lovable Cloud managed: create a new Supabase project you own, then replace the project id/url/key in `.env.local`, Vercel, and `supabase/config.toml`.

Current checked-in project ref:

```text
wzlqrcrwhafzuqtnfhou
```

## 2. Configure Local Environment

Create `.env.local` from `.env.example`, then fill in the real Supabase publishable/anon key.

Required frontend values:

```text
VITE_SUPABASE_PROJECT_ID
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Do not put `OPENAI_API_KEY` in Vercel or Vite frontend env vars. It belongs in Supabase Edge Function secrets only.

## 3. Prepare Supabase

Run the migrations in `supabase/migrations` against the Supabase project you own.

If the CLI asks for a database password, set it for the current shell before pushing:

```powershell
$env:SUPABASE_DB_PASSWORD="your-project-database-password"
npx supabase db push --yes
```

Deploy these Edge Functions:

```text
generate-proposal-content
recommend-proposal-clauses
```

Set these Supabase Edge Function secrets:

```text
OPENAI_API_KEY
OPENAI_MODEL
```

Use `gpt-5-mini` for `OPENAI_MODEL` unless you intentionally choose another supported model.

## 4. Configure Auth

In Supabase Auth settings, add every real app URL as an allowed redirect/site URL:

```text
http://127.0.0.1:8080
http://localhost:8080
your Vercel preview URL
your Vercel production URL
your custom domain, if used
```

Enable Google Auth if users should sign in with Google.

## 5. Deploy Frontend

Connect Vercel to the GitHub repo:

```text
deeisom/enviro-track-edi
```

Use:

```text
Framework: Vite
Build command: npm run build
Output directory: dist
```

Add these Vercel environment variables:

```text
VITE_SUPABASE_PROJECT_ID
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

## 6. Verify Before Cutover

Run:

```powershell
npm run verify:deploy
```

Then smoke test the deployed app:

- Login works.
- Users and permissions behave correctly.
- Clients/projects can be created and edited.
- Proposal AI generation works.
- Clause recommendation works.
- Proposal/invoice exports download correctly.
- Storage uploads/downloads work if storage buckets are used.

When these pass, the app is operational outside Lovable.
