# Repo Map

## Purpose
Give future Codex sessions a compact, file-by-file ownership map so they can edit the right files without broad source scanning.

## Current Implementation
The repo is a Next.js App Router project with a client-heavy authenticated dashboard, Supabase auth, tRPC server routers, TanStack Query caching, Prisma/PostgreSQL persistence, dnd-kit interactions, shadcn/radix primitives, and Tailwind v4 styling.

Top-level areas:

- `app/`: routes, global layout, global CSS, API route handlers, generated Prisma output.
- `components/`: dashboard shell, auth screens, list/view feature components, account nav, shadcn/radix UI primitives.
- `hooks/`: client hooks for auth state and queued optimistic writes.
- `lib/`: shared utilities, Supabase clients, Prisma client, dashboard cache projection helpers, optimistic debug helpers.
- `trpc/`: tRPC client/server setup, query client defaults, API routers, view helper functions.
- `prisma/`: schema and migrations.
- `docs/`: historical notes and the AI documentation system.
- `public/`: app icon assets.

## Important Files
- `AGENTS.md`: mandatory agent instructions, required AI-doc reading path, scope controls, and Next.js caution.
- `package.json`: scripts (`dev`, `build`, `start`, `typecheck`, `lint`) and framework/library versions.
- `next.config.ts`: Next.js config; currently minimal.
- `eslint.config.mjs`: ESLint 9 + Next config.
- `tsconfig.json`: TypeScript strict/project config.
- `components.json`: shadcn registry aliases and style settings.
- `postcss.config.mjs`: Tailwind v4 PostCSS setup.
- `prisma.config.ts`: Prisma 7 config.
- `README.md`: human-facing setup overview.
- `CLAUDE.md`: older agent notes; prefer `AGENTS.md` and `docs/ai/*` for Codex work.

## App Router Files
- `app/layout.tsx`: root metadata, Geist fonts, global body shell, `TRPCReactProvider`, and `Toaster`. Metadata references `/icon-clean.png` and `/apple-icon.png`.
- `app/globals.css`: Tailwind v4 imports, custom variants, design tokens, theme variables, and base styles.
- `app/page.tsx`: public landing card with register/login links.
- `app/dashboard/page.tsx`: server route entry that renders `components/Dashboard.tsx`.
- `app/login/page.tsx`: renders `components/auth/Login.tsx`.
- `app/register/page.tsx`: renders `components/auth/Register.tsx`.
- `app/forgot-password/page.tsx`: client-side forgot-password form using Supabase `resetPasswordForEmail` and `absoluteUrl("/auth/confirm?next=/reset-password")`.
- `app/reset-password/page.tsx`: renders `components/auth/ResetPassword.tsx`.
- `app/auth/confirm/route.ts`: delegates GET handling to `handleAuthConfirmRequest`.
- `app/api/auth/confirm/route.ts`: compatibility alias for auth confirmation, also delegates to `handleAuthConfirmRequest`.
- `app/api/trpc/[trpc]/route.ts`: tRPC fetch adapter for GET/POST at `/api/trpc`.
- `app/favicon.ico`: favicon asset.
- `app/generated/prisma/`: generated Prisma client output from `prisma/schema.prisma`; do not manually edit.

## Route Protection And Proxy Files
- `proxy.ts`: Next proxy entry. Currently matches only `/dashboard` and calls `updateSession`.
- `lib/supabase/proxy.ts`: creates a Supabase SSR server client, refreshes cookies, calls `supabase.auth.getClaims()`, and redirects unauthenticated non-auth/non-login dashboard requests to `/login`.

## tRPC Files
- `trpc/init.ts`: creates Supabase-backed tRPC context, configures `superjson`, exports `baseProcedure`, `protectedProcedure`, router factory, and caller factory.
- `trpc/routers/_app.ts`: root router with `test`, `user`, `list`, `listItem`, `tag`, and `view` namespaces.
- `trpc/routers/testRouter.ts`: public `hello` smoke query.
- `trpc/routers/userRouter.ts`: current-user identity queries.
- `trpc/routers/listRouter.ts`: list creation, fetch, rename, and delete procedures; list creation also ensures view membership.
- `trpc/routers/listItemRouter.ts`: item CRUD/completion/reorder procedures.
- `trpc/routers/tagRouter.ts`: tag CRUD plus list/tag attachment batching and custom-view recompute triggers.
- `trpc/routers/viewRouter.ts`: view fetch, selected-view persistence, custom-view CRUD/filter updates, and view/list reordering.
- `trpc/routers/viewHelpers.ts`: `ALL_LISTS`/default view helpers, view selection, all-lists backfill, and custom-view recompute utilities.
- `trpc/client.tsx`: browser-side tRPC client, `QueryClientProvider`, and `AuthSync` mount.
- `trpc/server.tsx`: server-side tRPC caller/query helpers, `server-only` boundary, and hydration helpers.
- `trpc/query-client.ts`: TanStack Query defaults and superjson serialization/deserialization.

## Data And Persistence Files
- `prisma/schema.prisma`: canonical data model. Models include `List`, `ListItem`, `Tag`, `ListTag`, `View`, and `ViewList` plus enums `ViewType` and `ViewMatchMode`.
- `prisma/migrations/*/migration.sql`: committed schema history. Do not edit old migrations except for explicit migration-repair tasks.
- `lib/db.ts`: Prisma 7 client using `@prisma/adapter-pg` and `DATABASE_URL`.
- `lib/trpc.ts`: exports `AppRouter` type for cache helpers/components.

## Supabase And Auth Files
- `lib/supabase/client.ts`: browser Supabase client from `@supabase/ssr`.
- `lib/supabase/server.ts`: async server Supabase client using Next cookies.
- `lib/supabase/auth-confirm.ts`: shared OTP/token-hash confirmation logic with safe `next` redirect handling.
- `components/AuthSync.tsx`: listens to Supabase auth state, writes the `['user']` query cache, and clears the full QueryClient on logout.
- `hooks/useUser.ts`: `useQuery` wrapper around `supabase.auth.getUser()` with `staleTime: Infinity` and `retry: false`.
- `components/auth/Login.tsx`: login form using `signInWithPassword`, toast feedback, and post-login redirect.
- `components/auth/Register.tsx`: register form using `signUp` and `emailRedirectTo` confirmation flow.
- `components/auth/ResetPassword.tsx`: password update form for users arriving from the reset confirmation flow.

## Dashboard And Feature Components
- `components/Dashboard.tsx`: authenticated dashboard shell; composes account nav, `ListAdder`, responsive `ViewsSidebarPreview`, and `ListsContainer`; signs out via Supabase, clears QueryClient, and routes home.
- `components/UserAccountNav.tsx`: account dropdown/avatar and logout action wiring.
- `components/UserDetails.tsx`: small user display component.
- `components/MaxWidthWrapper.tsx`: layout wrapper for centered single-card pages and dashboard width.
- `components/list/types.ts`: shared inferred types for dashboard lists, views, tags, optimistic list/item shapes, and cache snapshots.
- `components/list/ListAdder.tsx`: create-list dialog, view-aware optimistic insertion, and dashboard cache updates.
- `components/list/ListsContainer.tsx`: main list grid, selected-view payload query, list drag/drop, item cross-list drag/drop, queued reorder writes, and dashboard query invalidation.
- `components/list/ListComponent.tsx`: list card with inline rename/delete, item creation, list-local item rendering, drag handle/drop zone behavior, and tag picker/menu integration.
- `components/list/ListItemComponent.tsx`: single item row with checkbox completion, inline rename, delete, and drag handle behavior.
- `components/list/ListInlineEdit.tsx`: reusable inline edit input behavior for list/item names.
- `components/list/ListMenu.tsx`: list-card actions menu.
- `components/list/ListTagPicker.tsx`: tag create/update/delete and batched list-tag operations.
- `components/list/ListTag.tsx`: compact tag badge/rendering helper.
- `components/list/ListSkeleton.tsx`: loading skeletons for dashboard lists.
- `components/list/ListEmpty.tsx`: empty-state display for list containers.
- `components/views/ViewsSidebarPreview.tsx`: view sidebar/mobile selector, custom-view create/rename/delete/filter management, selected-view persistence, and view reorder UI.

## Shared Client Logic Files
- `hooks/useOptimisticSync.ts`: scoped in-memory optimistic mutation queue with latest-task replacement, delayed processing, pending-count tracking, and optional `onQueueIdle` callbacks.
- `lib/dashboard-cache.ts`: shared TanStack Query cache projection helpers for dashboard snapshots, selected views, tag changes, item/list updates, and view payload invalidation.
- `lib/optimistic-debug.tsx`: optional development/debug helpers for optimistic state inspection.
- `lib/helper.ts`: older `useMutationQueue` helper; current dashboard sync primarily uses `useOptimisticSync`.
- `lib/utils.ts`: `cn` class merging helper and `absoluteUrl` environment-aware URL builder.

## UI Primitive Files
- `components/ui/*`: shadcn/radix primitives and local wrappers (`button`, `card`, `dialog`, `dropdown-menu`, `command`, `field`, `input`, `checkbox`, `scroll-area`, `sonner`, etc.). Keep these generic; app-specific dashboard state belongs in feature components or shared helpers.

## Public Asset Files
- `public/icon-clean.png`: referenced by metadata as favicon/OpenGraph/Twitter image.
- `public/apple-icon.png`: referenced by metadata but not present in the current file list; keep the backlog item until fixed.

## Historical And AI Docs
- `docs/AI_HANDOFF.md`: first doc to read each session; product snapshot, architecture invariants, active branch, known risks.
- `docs/ai/task-routing-guide.md`: task-to-doc routing map.
- `docs/ai/02-repo-map.md`: this file.
- `docs/ai/03-data-model.md`: Prisma models, ownership, ordering, and view membership.
- `docs/ai/04-auth-and-api.md`: Supabase and tRPC contracts.
- `docs/ai/05-dashboard-state-cache.md`: TanStack Query cache shapes and projection rules.
- `docs/ai/06-optimistic-sync.md`: queue semantics and optimistic mutation contracts.
- `docs/ai/07-drag-and-drop.md`: drag/drop flow and invariants.
- `docs/ai/08-views-tags-system.md`: custom views, tags, matching, and recompute behavior.
- `docs/ai/09-ui-components.md`: component conventions.
- `docs/ai/10-mobile-and-pwa-readiness.md`: responsive and PWA state.
- `docs/ai/11-known-issues.md`: known bugs and risky areas.
- `docs/CODEX_RULES.md`: must-follow implementation rules.
- `docs/ai/13-testing-and-validation.md`: validation guidance.
- `docs/ai/14-production-readiness.md`: deployment and ops gaps.
- `docs/DECISIONS.md`: architecture decisions and rationale.
- `docs/FUTURE_PLANS.md`: structured future work backlog.
- `docs/deprecated/optimistic-updates.md`, `docs/deprecated/app-reverse-engineering.md`: older notes; verify against `docs/ai/*` and source before relying on them.

## Data Flow
Route ownership:

1. Public/auth routes render auth or landing components from `app/*/page.tsx`.
2. `/dashboard` is proxy-guarded and renders `Dashboard`.
3. `Dashboard` composes user/account controls, list creation, view selection, and the list grid.
4. Feature components call `useTRPC()` query/mutation options.
5. Browser requests use `httpBatchLink` to `/api/trpc`.
6. `app/api/trpc/[trpc]/route.ts` passes requests to `fetchRequestHandler`.
7. `createTRPCContext` reads the Supabase user from server cookies.
8. Protected routers use `ctx.userId` for data ownership checks.
9. Prisma persists data through `lib/db.ts` and the generated client in `app/generated/prisma`.
10. Client cache reconciliation happens through component-local optimistic handlers plus `lib/dashboard-cache.ts`.

Feature ownership:

- List creation: `ListAdder`, `listRouter.createList`, `viewHelpers.ensureAllListsView`, `viewHelpers.ensureDefaultView`.
- List display/edit/delete: `ListComponent`, `ListMenu`, `listRouter.renameList`, `listRouter.deleteList`.
- Item display/create/edit/delete/complete/reorder: `ListComponent`, `ListItemComponent`, `ListsContainer`, `listItemRouter`.
- Tag management: `ListTagPicker`, `ListTag`, `tagRouter`, custom-view recompute helpers.
- View selection/create/edit/delete/reorder/filtering: `ViewsSidebarPreview`, `viewRouter`, `viewHelpers`.
- Cross-cache reconciliation: `lib/dashboard-cache.ts`.
- Auth/session cache: `AuthSync`, `useUser`, Supabase client/server/proxy files.

## Invariants
- Client components using hooks must start with `"use client"`.
- tRPC server-only helpers stay in `trpc/server.tsx` and import `server-only`.
- Prisma imports use `@/app/generated/prisma/client`, not `@prisma/client`, because schema output is customized.
- Do not manually edit `app/generated/prisma`.
- Shared dashboard cache logic belongs in `lib/dashboard-cache.ts` when it affects more than one component.
- UI primitives in `components/ui` should not absorb app-specific dashboard state.
- Preserve tRPC router names, procedure names, query keys, and cache shapes unless the task explicitly requires a breaking change.
- Preserve view/list/item ordering semantics and optimistic rollback behavior unless the task explicitly changes them.

## Known Risks
- `app/generated/prisma` is generated output under `app/`; future edits should not manually patch it.
- Deprecated docs in `docs/deprecated/optimistic-updates.md` and `docs/deprecated/app-reverse-engineering.md` are not maintained; rely on `docs/ai/*` instead.
- Some components own substantial logic directly, especially `ListsContainer`, `ViewsSidebarPreview`, `ListTagPicker`, and `ListComponent`.
- `proxy.ts` currently matches only `/dashboard`; nested dashboard routes would need matcher updates.
- `app/layout.tsx` references `/apple-icon.png`, but only `public/icon-clean.png` appears in the current tracked public asset list.

## What Codex Should Read Before Editing
- Always read this file and the feature-specific doc from `task-routing-guide.md`.
- For component work, read the target component and `09-ui-components.md`.
- For server work, read `04-auth-and-api.md`, `03-data-model.md`, `_app.ts`, and the target router.
- For cache/optimistic work, read `05-dashboard-state-cache.md`, `06-optimistic-sync.md`, target component(s), and `lib/dashboard-cache.ts`.
- For generated/client types, read `components/list/types.ts`, `lib/trpc.ts`, and `prisma/schema.prisma`; do not edit generated output.

## What Codex Must Update After Editing
- Add new files, ownership shifts, routes, routers, procedures, cache helpers, or component responsibilities here.
- Update the relevant feature doc with new data flow, invariants, validation, and risk notes.
- Update `docs/FUTURE_PLANS.md` with completed items, newly discovered risks, or follow-up refactors.
