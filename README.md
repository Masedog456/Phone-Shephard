# Phone Shepherd

Phone Shepherd is an Expo + Supabase MVP for calm AI-powered screenshot organization, photo cleanup, smart search, and weekly reset.

## First milestone

The current build focuses on the activation loop:

1. Sign in.
2. Grant photo access.
3. Scan recent screenshots.
4. Review categorized cards.
5. Archive, keep, or mark items for deletion.

It now also includes Shepherd Tasks, a flexible digital-life cleanup layer for photos, screenshots, tabs, notes, saved posts, documents, receipts, links, reminders, and custom user-created tasks. Unsupported integrations use clearly labeled mock data until real connectors are added.

## Setup

```bash
npm install
cp .env.example .env
npm run start
```

The app can run immediately in demo mode with `EXPO_PUBLIC_DEMO_MODE=true`. Demo mode lets you open the app, sign in locally, scan screenshots, and use local fallback categorization without Supabase credentials.

Fill in:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

For production mode, set `EXPO_PUBLIC_DEMO_MODE=false`, then apply the database migrations in `supabase/migrations`.

## Supabase Edge Functions

Set secrets:

```bash
supabase secrets set OPENAI_API_KEY=sk-proj-your-key
supabase secrets set OPENAI_VISION_MODEL=gpt-4.1-mini
supabase secrets set OPENAI_EMBEDDING_MODEL=text-embedding-3-small
supabase secrets set OPENAI_TRANSFORMATION_MODEL=gpt-4.1-mini
```

Deploy:

```bash
supabase functions deploy analyze-assets
supabase functions deploy search-assets
supabase functions deploy apply-action
supabase functions deploy weekly-summary
supabase functions deploy delete-analysis
supabase functions deploy transform-capture
```

## Privacy model

- The mobile app never stores the OpenAI API key.
- AI calls run only inside Supabase Edge Functions.
- The default scan scope is screenshots and recent assets.
- Deletion is always user-confirmed.

## Production beta

Use [docs/production-beta-setup.md](docs/production-beta-setup.md) to connect Supabase, deploy Edge Functions, and run the first real OpenAI screenshot analysis.

