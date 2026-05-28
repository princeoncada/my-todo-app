# Mobile And PWA Readiness

## Purpose
Document current responsive/mobile behavior and the gap between the app's PWA goals and implemented functionality.

## Current Implementation
Tidy has responsive dashboard layout and app metadata, but it is not yet a real PWA/offline app.

Implemented:

- Responsive list grid in `ListsContainer`: one/two/three columns by viewport.
- Mobile `ListAdder` uses an icon-only button.
- `ViewsSidebarPreview` appears above lists on small screens and as a sticky right sidebar on large screens.
- Touch-related classes exist on drag handles and scroll areas.
- Metadata in `app/layout.tsx` includes app name, description, Open Graph/Twitter data, icons, and apple icon reference.

Not implemented:

- `manifest.webmanifest`.
- Service worker.
- Offline queue persistence.
- Install prompt handling.
- Push notifications.
- Background sync.
- Local persistent cache hydration beyond normal browser memory.

## Important Files
- `components/Dashboard.tsx`: mobile vs desktop sidebar placement.
- `components/list/ListsContainer.tsx`: responsive grid.
- `components/list/ListAdder.tsx`: mobile add button.
- `components/list/ListComponent.tsx`: card height, scroll area, touch classes.
- `components/list/ListItemComponent.tsx`: touch drag handle.
- `components/views/ViewsSidebarPreview.tsx`: compact view panel.
- `app/layout.tsx`: metadata/icons.
- `public/icon-clean.png`: available icon.
- `next.config.ts`: currently empty.

## Data Flow
Mobile dashboard:

1. `/dashboard` renders same component tree for all viewports.
2. CSS classes determine whether views appear inline (`lg:hidden`) or in the right sidebar (`hidden lg:block`).
3. Lists remain in a grid; each card has a fixed scrollable item area.
4. Drag and scroll gestures compete in list card areas, so touch behavior must be tested manually.

Future PWA/offline flow would need:

1. Persistent query/cache storage.
2. Durable optimistic mutation queue.
3. Replay/reconciliation on reconnect.
4. Conflict policy for reorders, deletes, and tag/view recomputes.

## Invariants
- Mobile should preserve all core dashboard workflows: select view, add list, edit tags, add items, drag where possible, logout.
- Desktop and mobile must share the same cache/query behavior.
- Do not claim offline support until pending writes survive refresh and network loss.
- App metadata should remain in `app/layout.tsx` unless Next.js 16 docs recommend a different structure.

## Known Risks
- `apple-icon.png` is referenced in metadata but only `public/icon-clean.png` is visible in the repo scan.
- Drag/drop on touch devices is unvalidated.
- Fixed card/item area heights may feel cramped on small screens.
- No viewport screenshot tests.
- No PWA manifest/service worker means installability is incomplete.

## What Codex Should Read Before Editing
- `Dashboard`, `ListsContainer`, `ListComponent`, `ViewsSidebarPreview`.
- `09-ui-components.md` for component conventions.
- `06-optimistic-sync.md` before adding offline persistence.
- Relevant Next docs under `node_modules/next/dist/docs/` if available before metadata/PWA config changes.

## What Codex Must Update After Editing
- Update this file for responsive, touch, metadata, manifest, service worker, or offline queue changes.
- Update `14-production-readiness.md` for deployment/runtime implications.
- Update `docs/FUTURE_PLANS.md` under mobile/PWA and offline-first sections.
