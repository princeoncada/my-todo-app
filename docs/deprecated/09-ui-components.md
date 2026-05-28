# UI Components

## Purpose
Map the frontend component system and document UI conventions for dashboard edits.

## Current Implementation
The UI uses Tailwind v4, shadcn/radix primitives, lucide icons, and motion for list reveal/layout animation. The dashboard is client-heavy and optimized for immediate feedback.

Global layout:

- `app/layout.tsx` sets metadata, Geist fonts, `TRPCReactProvider`, and `Toaster`.
- `app/globals.css` imports Tailwind, shadcn styles, and defines theme tokens.

Dashboard layout:

- `Dashboard` uses `MaxWidthWrapper`, a list main area, mobile view sidebar preview above lists, and desktop sticky sidebar.
- The list grid is responsive: one column base, two at `md`, three at `xl`.

## Important Files
- `components/Dashboard.tsx`: dashboard shell.
- `components/MaxWidthWrapper.tsx`: page width/layout wrapper.
- `components/UserAccountNav.tsx`: account/logout menu.
- `components/views/ViewsSidebarPreview.tsx`: view panel and dialogs.
- `components/list/ListAdder.tsx`: add list dialog.
- `components/list/ListsContainer.tsx`: grid and loading/error/empty states.
- `components/list/ListComponent.tsx`: list card.
- `components/list/ListItemComponent.tsx`: item row.
- `components/list/ListInlineEdit.tsx`: inline edit primitive used by lists/items.
- `components/list/ListMenu.tsx`: list actions.
- `components/list/ListTagPicker.tsx`: tag chips and command menu.
- `components/list/ListSkeleton.tsx`, `ListEmpty.tsx`: placeholder states.
- `components/ui/*`: shadcn/radix primitives.

## Data Flow
UI state categories:

- Local UI state: dialog open, drag previews, revealed ids, adder text, selected tags in a dialog.
- TanStack cache state: lists, items, tags, views, selected view payloads.
- Server state: PostgreSQL through tRPC.

Visual feedback:

- Loading dashboard grid shows six `ListSkeleton` cards.
- Empty selected view renders `ListEmpty`.
- New optimistic lists/items use reveal-on-mount flags tracked by ids so animations happen once.
- Delete operations set local deleted state first, then remove from cache after a short delay.
- Toasts are handled by `sonner`.

## Invariants
- Buttons use lucide icons where appropriate.
- shadcn/radix primitives live in `components/ui`; app-specific behavior lives outside them.
- Do not put dashboard business logic into generic UI primitives.
- Inline edit must preserve cache rollback behavior in callers.
- Text in compact cards and rows must truncate or wrap without breaking layout.
- Keep mobile and desktop sidebar behavior in sync when changing view features.

## Known Risks
- Large components mix UI, cache, and mutation logic. Biggest files: `ViewsSidebarPreview`, `ListTagPicker`, `ListComponent`, `ListsContainer`.
- No automated visual regression tests.
- Accessibility for drag/drop, command menus, and inline editing needs a focused pass.
- Some copy needs polish: landing page product name, register button text, typo "optimisic" on home page.

## What Codex Should Read Before Editing
- Target component and its parent.
- `05-dashboard-state-cache.md` for components that mutate cache.
- `07-drag-and-drop.md` for draggable UI.
- `10-mobile-and-pwa-readiness.md` for layout/mobile changes.

## What Codex Must Update After Editing
- Update this file when adding/removing components, moving ownership, changing UI state conventions, or changing layout behavior.
- Add visual/manual checks to `13-testing-and-validation.md`.
- Add UI polish follow-ups to `docs/FUTURE_PLANS.md`.
