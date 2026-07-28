# MAT-7 Launch Readiness

Stand: 2026-07-28 11:20 CEST  
Issue: MAT-7 Validate deployment, QA, analytics, and launch readiness

## Grenzen

- Kein oeffentliches Deployment ohne ausdrueckliche Owner-Freigabe.
- Keine kostenpflichtigen Dienste aktivieren.
- Keine Produktivdaten fuer QA verwenden.
- Secrets werden nur als benoetigte Variablennamen dokumentiert, nicht als Werte.

## Deployment-Ziel

Launch-Kandidat ist die aktuelle TanStack/React-App ueber Cloudflare:

- Build: `npm run build`.
- Deploy-Konfiguration: `wrangler.jsonc` plus Nitro-generierte `.output/server/wrangler.json`.
- Produktiv-Deploy: `npx wrangler deploy` erst nach Owner-Freigabe.

Netlify, `public/` und `docs/` sind fuer diesen Launch als Legacy/static eingestuft. Sie enthalten nuetzliche statische Artefakte, sind aber nicht der aktuelle App-Deploy-Pfad.

## Env-Konfiguration

Aktuelle Supabase Project-Ref: `rzmcoxnfcpqqyxgkafwk`.

Client/SSR:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` nur serverseitig

Edge Function Secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL` fuer `migrate-helper`
- `OPENROUTER_API_KEY`
- `ANTHROPIC_API_KEY`
- `BRAVE_SEARCH_API_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `APP_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_TOKEN`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `WHATSAPP_WEBHOOK_SECRET`

Validated in repo:

- `supabase/config.toml` points to `rzmcoxnfcpqqyxgkafwk`.
- Web fallback client uses `https://rzmcoxnfcpqqyxgkafwk.supabase.co`.
- iOS backend client uses `https://rzmcoxnfcpqqyxgkafwk.supabase.co`.
- `.env.example` and `DEPLOY.md` have been corrected from the dead `urjpyhyezrwhwgnkkxjv` ref to the current ref.

Still requires owner/dashboard validation:

- Supabase project linked to `rzmcoxnfcpqqyxgkafwk` in the CLI.
- Migration status matches local `supabase/migrations`.
- Edge Functions are deployed from disk via Supabase CLI.
- Required Edge Function secrets and OAuth redirect URLs are present in Supabase/provider dashboards.

## Analytics und Monitoring

Present:

- Admin Co-Pilot metrics route reads `ai_usage` and summarizes success/error/timeout states.
- Backend schema includes `ai_usage`, `ai_token_grants`, `mcp_action_logs`, `secret_access_log`, and execution job/event tables for operational review.
- SSR/server error capture logs original errors to runtime logs instead of only generic 500 responses.
- User-facing failure states exist for auth, waitlist confirmation, matching/swipe, events registration, uploads, Co-Pilot, backend offline states, and iOS live fallback states.

Deferred:

- No third-party product analytics (PostHog/GA/Mixpanel) is configured. Defer until owner picks privacy posture, consent UX, and vendor.
- No third-party error monitoring (Sentry/Bugsnag/etc.) is configured. Defer until owner approves vendor and data-processing terms.

Launch recommendation: ship with server/platform logs and `ai_usage`/admin metrics only for private beta, then add privacy-reviewed analytics/error monitoring as a post-launch backlog item.

## Data Safeguards

Checked from migrations/code:

- RLS is broadly enabled for user-owned data.
- Admin surfaces rely on `user_roles`; RLS remains the backend guard.
- Public reads are scoped to published/public content such as guides, events, partner offers, and published company profiles.
- Service-role code is isolated to server-side clients/functions; client code uses anon/publishable keys.
- Token/secret-related tables exist for connected accounts, Vault-style secrets, MCP OAuth tokens, and secret access logs.

Launch checks before public release:

- Verify RLS policies in the live Supabase project, not only migrations.
- Confirm storage bucket policies for avatars/media/company assets.
- Confirm OAuth consent scopes and redirect URLs for Google/GitHub/Lovable/Apple.
- Test account deletion/export/privacy request path or explicitly defer from public launch.
- Use seeded or synthetic QA accounts only.

## QA Checklist

Web desktop and mobile:

- `/` landing loads without authenticated app shell.
- `/auth` email login/signup, magic link, reset password, OAuth buttons, and error states.
- `/onboarding` completes both founder and talent paths.
- `/heute` loads daily tasks, morning report fallback, achievements, and Co-Pilot entry.
- `/discover`, `/matches`, and match detail cover empty, loading, error, and success states.
- `/co-pilot` covers normal answer, slow answer, fallback answer, action confirmation, and worker follow-up.
- `/foerderung/exist-gruenderstipendium` uses the generated slug, fills an application, and exports/copies content.
- `/firma` creates/edits blocks, reorders by drag and drop, previews, and publishes a public `/s/$slug` profile with safe data.
- `/marketplace`, category pages, guides, events, and admin routes handle unauthenticated, non-admin, admin, empty, and failed-fetch states.
- Mobile 375px: bottom navigation, overflow menu, dialogs/sheets, auth/onboarding forms, and detail pages fit without overlap.

iOS:

- Build on iPhone 16 Pro Max simulator `7F2BCAA3-8AB3-4D64-9B50-B99B8B893C99` with normal SPM resolution.
- Auth, onboarding, Today, Discover/Swipe, Community, Business/Profile, Co-Pilot, Documents, and offline/error banners.
- Confirm product decision on current native tab set before App Store/TestFlight handoff.

Backend/Supabase:

- `supabase db push --dry-run` or migration status against `rzmcoxnfcpqqyxgkafwk`.
- Deploy Edge Functions from disk via CLI only.
- Smoke `copilot`, `copilot-worker`, `matching`, `swipe`, `daily-digest`, `morning-report`, `connect-google`, `mcp-connect`, `mcp-act`, `whatsapp-webhook`, and `resend-confirm` with synthetic data or dashboard-level validation.
- Confirm cron jobs are no-op until Vault/service-role secrets are configured, then test only after owner approval.

## Final Launch Checklist

- Owner approves Cloudflare as the public deployment target.
- Owner confirms no public launch until Supabase/OAuth/secrets checklist is complete.
- `.env.example`, `DEPLOY.md`, and live env vars all point to `rzmcoxnfcpqqyxgkafwk`.
- Web `npm run lint` and `npm run build` pass.
- iOS simulator build passes or iOS launch is explicitly deferred.
- Auth and onboarding smoke pass with synthetic account.
- Core web flows pass on desktop and 375px mobile.
- Supabase migration/function state validated by CLI or dashboard evidence.
- Monitoring/analytics posture accepted: platform logs/admin metrics for beta, third-party tools deferred.
- Privacy-sensitive flows reviewed: public company profile publishing, connected accounts, uploaded files, chat/Co-Pilot content, account lifecycle.

## Post-Launch Backlog

- Add privacy-reviewed product analytics with consent controls.
- Add third-party error monitoring with PII scrubbing.
- Add CI gates for lint, build, and type/schema generation.
- Split the large main client chunk.
- Consolidate or archive legacy Netlify/GitHub Pages/static deploy configs.
- Regenerate Supabase TypeScript types from the linked project.
- Add automated Playwright smoke tests for the Web QA checklist.
- Verify and document iOS TestFlight/App Store release pipeline.
