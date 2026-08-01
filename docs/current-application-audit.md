# Phone Shepherd Current Application Audit

Audit date: June 21, 2026

## Executive Summary

Phone Shepherd has a strong premium consumer identity and a broad, coherent product demonstration. Its most mature production path is screenshot scanning and server-side AI analysis. Most broader digital-life features are visually complete but backed by local mock data. The strategic priority is to turn the existing Universal Capture and Transformation experience into the first real, persistent cross-source loop.

Core principle: **Preserve what matters. Release what doesn't.**

## 1. Current Features Completed

### Working screens and flows

- Welcome and onboarding: emotional positioning, privacy promise, and entry to sign-in.
- Authentication: demo session, email magic-link request, and Supabase Apple/Google OAuth initiation.
- Home / Digital Wellness: time-based greeting, 82/100 wellness presentation, weekly improvement, personalized insight cards, capture entry, Intent Engine, Connect the Dots, reset, treasures, monthly report, source Shepherds, and privacy entry.
- Screenshot Shepherd: device permission request, recent screenshot scan, demo fallback, local categorization, production Edge Function analysis, categorized cards, and keep/archive/delete choices.
- Memory Care / Photo Cleanup: duplicate estimate, blurry/accidental placeholders, screenshot count, and storage estimate presentation.
- Weekly Reset: ritual overview, wellness progress, weekly insights, forgotten treasures, report entry, and 3-minute session.
- Shepherd Session: animated greeting, recommendations, review steps, haptics, progress, completion, and Transformation Result handoff.
- Shepherd Tasks: default task dashboard, custom task creation, editing, deletion, manual run, results, Coming Soon labeling, and transformation output.
- Universal Capture: capture source gallery, recent inbox, AI-style content review, suggested Shepherd, action selection, and Transformation Result handoff.
- Transformation Results: found-source summary, generated artifact, next action, Library save, reminder, share, and Useful / Not useful / Wrong category feedback.
- Universal Library: category and collection filtering, keyword search, saved-item cards, Intent Engine suggestions, progress cards, Connect the Dots entry, and Digital Life Timeline entry.
- Ask Your Memory: conversational prompts, contextual response, related saved items, follow-up questions, and intent suggestions.
- Connect the Dots: recurring-theme cards, evidence counts, goals, unfinished ideas, and Timeline entry.
- Digital Life Timeline: month/year chapters, focus areas, saved/created counts, turning points, and evolution narrative.
- Forgotten Treasures: rediscovery cards and privacy framing.
- Monthly Digital Life Report: metrics, interests, trends, and native sharing.
- Privacy: environment status, connection check, persisted local privacy preferences, and AI-analysis deletion request.
- Asset detail: detailed screenshot review and action handling.

### Working backend foundations

- Supabase profiles, settings, media assets, AI analyses, embeddings, groups, review actions, summaries, subscriptions, scan jobs, Shepherd tasks, and task-result schema.
- RLS policies for user-owned records and private Storage bucket policies.
- OpenAI Vision analysis with structured JSON and sensitive-content handling.
- Embedding generation and semantic screenshot search.
- Weekly summary, action application, and AI-analysis deletion Edge Functions.
- New persistent Library, Transformation, feedback, and reminder schema.
- New `transform-capture` Edge Function for structured AI outputs from captured content.

## 2. Partially Implemented Features

- Digital Wellness score is visually working but hard-coded at 82 with a fixed +7 improvement.
- Home counts use minimum demo values, so they are not reliable user metrics.
- Photo duplicate detection is a dimension/date heuristic. Blur and accidental-photo counts remain zero.
- Screenshot analysis is real only when Supabase and OpenAI are configured; demo mode uses filename metadata.
- Device actions update the app and backend record, but deleting does not yet remove a photo from the native camera roll.
- Shepherd Tasks are stored in volatile Zustand memory and run against mock findings. Supabase task tables are not connected to the client.
- Notes, tabs, saved posts, documents, links, receipts, and reminders have polished placeholder flows but no platform connectors.
- Universal Capture uses synthetic captures. Native iOS/Android share extensions and deep-link payload ingestion are not implemented.
- Capture-to-Transformation now has a production API path, but it requires migration/function deployment and real incoming capture payloads.
- Library, Intent Engine, Connect the Dots, Timeline, Treasures, and Monthly Report use realistic static data rather than persisted user history.
- Ask Your Memory is keyword/rule based over mock Library items; real semantic search exists only for analyzed screenshots.
- Save/reminder/feedback actions persist for production transformations, but demo-mode state is session-only.
- OAuth providers require Supabase provider configuration and native deep-link acceptance testing.
- Privacy preferences persist locally but are not synchronized to `user_settings` yet.
- Delete AI analysis removes screenshot embeddings and analyses only; it does not yet erase Library items, transformations, reminders, or capture history.
- Subscription table exists, but there is no entitlement service, paywall, trial, usage meter, purchase SDK, or restore-purchase flow.

## 3. Missing Features From Previous Roadmap

| Vision area | Current state | Missing production work |
| --- | --- | --- |
| Digital Wellness dashboard | Strong UI | Real score model, event ledger, trends, explanation, and user-specific counts |
| Shepherd score | Presented as 82/100 | Transparent scoring formula and server aggregation |
| Weekly reset ritual | Complete ritual UI | Real weekly queue, saved progress, notification scheduling, and summary data |
| Shepherd tasks | Full local CRUD UX | Supabase repository, schedules, connector execution, retries, and persisted results |
| Photo cleanup | Summary only | Perceptual hashing, blur model, accidental-photo rules, grouped review, and native deletion |
| Screenshot understanding | Best-developed real feature | Production deployment, batching jobs, retries, pagination, and real end-to-end beta validation |
| Notes intelligence | Mock | Apple Notes import/share path or user-authorized connector and embeddings |
| Saved posts intelligence | Mock | Share-to-Shepherd capture first; direct platform APIs only where legally supported |
| Browser tab management | Mock | Browser extension or Safari share flow; age/visit metadata and explicit permissions |
| Universal digital library | Polished mock | Repository backed by `library_items`, pagination, sync, item detail, and cross-source embeddings |
| Universal capture | Polished mock plus backend contract | Native share extensions, file/link payload parsing, uploads, offline queue, and retries |
| Social sharing into Shepherd | Mock source chooser | iOS Share Extension, Android Sharesheet target, app links, and source normalization |
| AI transformations | UI plus new production pipeline | Deploy, evaluate quality, persist versioned prompts, and generate multi-item transformations |
| Natural language search | Mock Library; real screenshot vector search | Unified Library index, conversational synthesis, citations, and result permissions |
| Digital life timeline | Static documentary | Event aggregation, monthly chapter generation, edits, and privacy controls |
| Privacy approvals | Strong language and basic controls | Consent ledger, per-source permission center, retention controls, export, and complete deletion |
| Premium subscriptions | Database row only | RevenueCat/StoreKit/Play Billing, offerings, entitlements, trials, metering, and paywall |

## 4. Technical Architecture Review

### Code organization

Strengths: Expo Router routes are understandable; domain types, feature stores, reusable components, and Supabase functions are separated. The visual system is centralized and consistent.

Risks: mock and production behavior are mixed inside stores; no repository layer; no generated Supabase database types; large screens own orchestration; no automated tests; Zustand stores are mostly non-persistent.

### Scalability

The Edge Function boundary is appropriate, but screenshot analysis is sequential and performs one Vision call plus one embedding call per item. Base64 images increase memory and request size. Scan jobs exist in schema but are not used. Production needs queued jobs, concurrency limits, idempotency, pagination, retries, and cost quotas.

### Database

The media schema, user ownership, vector search, and RLS foundation are good. The new migration adds first-class Library and Transformation records. Gaps include schema version typing in the app, lifecycle/retention policies, transformation prompt versions, source connector records, user-event scoring data, and subscription entitlement history.

### AI architecture

OpenAI keys stay server-side, structured outputs are used, and credential transcription is explicitly avoided. The new transformation service follows the same boundary. Risks include silent fallback to zero embeddings, no prompt/evaluation versioning, no budget controls, no model telemetry, and no asynchronous job path.

### Authentication

Supabase sessions, magic links, OAuth initiation, secure server identity checks, and demo mode exist. Native OAuth callback behavior and provider setup need device validation. Demo mode should never be enabled in release builds.

### Storage

Private Storage policies are prepared, but the app normally sends resized data URLs directly to Edge Functions and does not upload originals. That supports privacy, but large batches need signed uploads or ephemeral processing. Capture files and thumbnails do not yet have a storage lifecycle.

### Performance

Risks are unpaginated mock lists, repeated in-memory filtering, large base64 conversion, sequential AI calls, no query cache, and no background scan execution. The current scale is acceptable for an MVP demo, not for a large personal Library.

### Security and privacy

Strong points: RLS, private bucket, server-only service key, user checks on every function, sensitive-content flags, and approval-first copy. This audit fixed semantic search to execute with the user's RLS context and added explicit user scoping to the privileged record fetch. Remaining concerns are rate limiting, abuse controls, complete account erasure, connector-token encryption, audit logs, privacy policy/terms, and App Store privacy disclosures.

## 5. Prioritized Development Plan

1. **Real Capture-to-Transformation loop** — Highest immediate user value and shareability; now started with persistent schema, API, and fallback behavior.
2. **Native Share Extension beta** — Safari, Photos, Files, and system shares into the real capture pipeline; strongest activation and organic acquisition path.
3. **Production Universal Library** — Load persisted Library items, item detail, pagination, collections, and cross-source embeddings.
4. **Unified Ask Your Memory** — Retrieval across screenshots and Library items with grounded answers and source citations.
5. **Screenshot beta hardening** — Background jobs, idempotency, retries, cost controls, quality evaluation, and production telemetry.
6. **Real Weekly Reset queue and score** — Event-derived wellness score, weekly summaries, reminders, and progress persistence for retention.
7. **Photo cleanup engine** — Perceptual duplicates, blur scoring, accidental-photo review, storage estimates, and native deletion approval.
8. **Notes and document capture** — Share/import-first integration before fragile direct platform connectors.
9. **Premium entitlement architecture** — RevenueCat, trial, transformation/search limits, restore purchases, and $9.99/month paywall.
10. **Social and browser connectors** — Begin with browser extension/share flows; add direct APIs only where platform policy and user permission allow.

## Changes Implemented During This Audit

- Added persistent Library, Transformation, feedback, and reminder database tables with RLS.
- Added a server-side structured AI `transform-capture` pipeline with a privacy-safe fallback.
- Connected captured content to real transformations in production and instant mock transformations in demo mode.
- Connected Transformation Result save, reminder, and feedback actions to persistence APIs.
- Fixed semantic search to use the authenticated user's RLS context.
- Made AI analysis idempotent per media asset.
- Persisted screenshot review actions with optimistic rollback on failure.
- Made privacy switches functional and locally persistent.
- Updated production deployment documentation for the transformation model and function.
