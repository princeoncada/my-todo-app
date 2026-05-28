# Known Issues

## Purpose
Keep a concise list of known bugs, risky implementation details, and validation gaps.

## Current Implementation
The app is functional and actively developed, but it has several known correctness, UX, testing, and production-readiness gaps.

## Important Files
- `trpc/routers/listItemRouter.ts`: ownership gaps on some item mutations.
- `components/auth/Register.tsx`: incorrect submit label.
- `app/page.tsx`: product copy typos/inconsistency.
- `app/layout.tsx`: references `apple-icon.png`.
- `components/list/ListTagPicker.tsx`: complex local batching and rollback.
- `components/views/ViewsSidebarPreview.tsx`: complex optimistic view logic.
- `hooks/useOptimisticSync.ts`: in-memory queue only.
- `prisma/schema.prisma`: unused enum variants.

## Data Flow
Risk tends to appear where local UI, cache state, and server state diverge:

- Optimistic list creation followed by immediate item/tag changes.
- Fast view switching with multiple fetches in flight.
- Reorders involving optimistic objects.
- Tag deletes or tag toggles that affect custom view membership.
- Auth logout with cached user data.

## Invariants
- Treat this file and `docs/FUTURE_PLANS.md` as living documents.
- Do not remove an issue because it is inconvenient. Remove it only after code and validation prove it is resolved.
- Security/ownership issues outrank UI polish.

## Known Risks
- Security: `listItem.renameListItem`, `deleteListItem`, and `setCompletionListItem` should verify the item belongs to `ctx.userId` through `parentList`.
- Testing: no dedicated unit/integration/e2e suite is present.
- Sync: optimistic queues are not durable across refresh/offline.
- Observability: dev measurement exists, but production telemetry/error reporting does not.
- Product copy: home page and register flow need polish.
- PWA: app is not installable/offline-ready yet.
- Accessibility: drag/drop and command interactions need keyboard/screen-reader review.
- Data model: `UNTAGGED` and `ANY` are not implemented in UX/server logic.

## What Codex Should Read Before Editing
- For any bug fix, read the relevant feature doc and this file.
- For security fixes, read `04-auth-and-api.md` and `03-data-model.md`.
- For sync issues, read `05-dashboard-state-cache.md` and `06-optimistic-sync.md`.

## What Codex Must Update After Editing
- Remove or amend fixed issues with a note in `docs/DECISIONS.md` when the fix changes behavior.
- Add newly discovered issues here and to `docs/FUTURE_PLANS.md`.
- Update `13-testing-and-validation.md` with regression checks for fixed bugs.
