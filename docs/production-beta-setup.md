# Production Beta Setup

This is the path from demo mode to the first real AI screenshot analysis.

## 1. Create Supabase Project

Create a Supabase project, then copy:

- Project URL
- anon public key
- service role key

Put the public values in `.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_DEMO_MODE=false
```

Keep the service role key out of the mobile app.

## 2. Link Supabase Locally

```bash
supabase login
supabase link --project-ref your-project-ref
```

## 3. Apply Database Migrations

```bash
supabase db push
```

This applies:

- PostgreSQL tables
- `pgvector`
- RLS policies
- private Storage bucket policies
- Shepherd Tasks and Task Results tables

## 4. Configure Auth

In Supabase Auth settings:

- Enable email magic links.
- Set Site URL: `phoneshepherd://`
- Add redirect URLs:
  - `phoneshepherd://`
  - `exp://127.0.0.1:8081`
  - `http://localhost:8082`

Apple and Google sign-in can come after the email flow is proven.

## 5. Set Edge Function Secrets

```bash
supabase secrets set OPENAI_API_KEY=sk-proj-your-key
supabase secrets set OPENAI_VISION_MODEL=gpt-4.1-mini
supabase secrets set OPENAI_EMBEDDING_MODEL=text-embedding-3-small
supabase secrets set OPENAI_TRANSFORMATION_MODEL=gpt-4.1-mini
```

## 6. Deploy Edge Functions

```bash
supabase functions deploy analyze-assets
supabase functions deploy search-assets
supabase functions deploy apply-action
supabase functions deploy weekly-summary
supabase functions deploy delete-analysis
supabase functions deploy transform-capture
```

## 7. Verify App Env

```bash
npm run verify:prod-env
npm run typecheck
npm run start
```

## 8. First Real AI Test

1. Sign in with email.
2. Grant photo access.
3. Run screenshot scan.
4. Open Screenshot Shepherd.
5. Tap Analyze selected screenshots.
6. Confirm cards return:
   - category
   - summary
   - reason
   - sensitive flag when relevant

Use 5-10 harmless screenshots first. Do not begin with password screenshots.

## 9. Beta Acceptance Criteria

The first beta build is ready when:

- A real user can sign in.
- The app scans recent screenshots.
- 5-10 screenshots are analyzed by the Edge Function.
- AI results are stored in Supabase tables.
- Search returns analyzed screenshots.
- Privacy settings can delete analysis data.

