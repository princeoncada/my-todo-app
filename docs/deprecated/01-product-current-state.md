> **DEPRECATED**: Content migrated to `docs/AI_HANDOFF.md` (Current Product Snapshot, Architecture Invariants, Data Flow, Known Risks). This file is retained for reference but is no longer the source of truth.

# Product Current State

## Purpose
Describe what Tidy does today so future Codex sessions can reason about behavior without re-reading every component.

## Current Implementation
Tidy is an authenticated personal todo workspace. Users can create lists, add list items, mark items complete, rename/delete lists and items, tag lists, create custom tag-based views, switch views, and reorder lists/items/views with drag and drop.

The app is intentionally optimistic-first. The UI updates immediately through TanStack Query cache writes or local drag preview state, then server writes are queued or debounced.

Current public routes:

- `/`: simple card with register/login links.
- `/register`: Supabase email signup.
- `/login`: Supabase password login.
- `/forgot-password`: password reset request page.
- `/reset-password`: password update page after auth flow.
- `/auth/confirm` and `/api/auth/confirm`: Supabase confirmation callbacks.
- `/dashboard`: authenticated dashboard.

## Important Files
- `README.md`: product positioning and high-level features.
- `app/page.tsx`: landing card.
- `app/dashboard/page.tsx`: dashboard route.
- `components/Dashboard.tsx`: main dashboard layout.
- `components/list/ListsContainer.tsx`: list grid, drag/drop, list/item rendering.
- `components/views/ViewsSidebarPreview.tsx`: view management sidebar.
- `components/list/ListAdder.tsx`: create list dialog.
- `components/list/ListComponent.tsx`: list card behavior.
- `components/list/ListItemComponent.tsx`: item row behavior.
- `components/list/ListTagPicker.tsx`: tag create/edit/delete/attach flow.
- `components/auth/*.tsx`: auth forms.

## Data Flow
1. Unauthenticated users land on `/`, then register or log in with Supabase.
2. Successful auth redirects to `/dashboard`.
3. Dashboard queries views and selected view payloads through tRPC.
4. User actions update local UI/cache immediately.
5. Queued or debounced tRPC mutations persist changes.
6. Successful server responses reconcile optimistic objects, affected views, and saved tag/list/item payloads.

## Invariants
- The dashboard is the product center. Do not build major task functionality only on a separate route without updating these docs.
- A list can exist in many views through `ViewList`.
- Custom views are currently tag filters requiring all selected tags.
- List tags are list-level metadata, not item-level metadata.
- List and item creation accept client-generated UUIDs to support optimistic rendering.

## Known Risks
- Product copy is inconsistent: README says Tidy, while `app/page.tsx` still says "Simple Todo App".
- `/register` submit button text says "Login" even though it creates an account.
- PWA/offline language exists in README goals but is not implemented.
- No onboarding or empty state beyond dashboard `ListEmpty`.

## What Codex Should Read Before Editing
- Product/UI behavior: this file plus `09-ui-components.md`.
- Dashboard interactions: `05-dashboard-state-cache.md` and `06-optimistic-sync.md`.
- Views/tags: `08-views-tags-system.md`.
- Auth: `04-auth-and-api.md`.

## What Codex Must Update After Editing
- Update this file when product capabilities, routes, or user-visible workflows change.
- Update `backlog.md` with product polish or UX follow-ups discovered during the change.
- Update `15-decision-log.md` if a product behavior decision is made or reversed.
