# Local-First Product Roadmap

## Purpose
This document is the product-readiness checklist for turning Tidy from an optimistic-update experiment into a more production-ready local-first app.

It is not an implementation spec for the current branch. Use it before major sync, persistence, offline, rollback, or product-readiness work.

## Branching Strategy For Major Architecture Work
Every major implementation phase must happen in its own isolated branch. Never implement large architectural refactors directly on master/main.

Every phase branch should remain independently testable and revertable. Merge only after stability validation.

Required branch naming convention:

```text
phase/<phase-name>
```

Examples:

- `phase/dexie-foundation`
- `phase/outbox-sync-queue`
- `phase/operation-coalescing`
- `phase/rollback-hardening`
- `phase/query-splitting`
- `phase/security-hardening`
- `phase/observability`
- `phase/background-jobs`

Rules for phase branches:

- One major architectural concern per branch.
- Do not combine unrelated systems in one phase branch.
- Keep commits scoped and reversible.
- Rebase frequently against master/main.
- Do not allow partially working sync systems into master/main.
- If a phase becomes unstable, abandon the branch instead of contaminating stable branches.

Required workflow:

1. Create new phase branch.
2. Implement isolated feature.
3. Validate locally.
4. Validate drag/drop behavior.
5. Validate optimistic behavior.
6. Validate rollback behavior.
7. Validate cache consistency.
8. Validate no major regression.
9. Merge only after stability confirmation.

## Critical Warning
The local-first migration changes the app's core data flow.

Bad merges can corrupt:

- optimistic cache behavior
- reorder logic
- drag/drop state
- rollback guarantees
- sync ordering
- entity ownership validation

Because of this:

- never rush merge architecture branches
- never stack multiple unstable architecture systems together
- never develop local-first sync directly on master/main

## Current Problem
The current app already has optimistic updates, shared queues, debounced reordering, separated view caches, and drag/drop performance rules.

The next bottleneck is that the app still depends too much on immediate server sync and TanStack cache coordination. The UI feels instant, but pending writes are not durable, failed sync is not visible enough, and refresh/offline states can lose queued work.

## Phase 1: Local-First Foundation
- [ ] Add Dexie local database.
- [ ] Add local tables for views, lists, listItems, tags, listTags/viewTags/viewLists if needed, and outboxOperations.
- [ ] Add clientId for every local entity.
- [ ] Keep serverId nullable until synced.
- [ ] Add syncStatus: local, pending, synced, failed.
- [ ] Add lastSyncedAt, retryCount, createdAt, updatedAt, deletedAt where useful.
- [ ] Make UI write to Dexie first.
- [ ] Make TanStack/server sync secondary.
- [ ] Add outbox operation queue.
- [ ] Add operationId for every mutation.
- [ ] Add basic sync replay.
- [ ] Add sync status UI.

## Phase 2: Outbox and Sync Model
- [ ] Every create, rename, delete, move, reorder, tag change, and view change should create an outbox operation.
- [ ] Sync worker reads pending operations.
- [ ] Sync worker sends operations to server in safe order.
- [ ] Server confirms.
- [ ] Client marks operation as synced.
- [ ] Failed operations become failed and visible to the user.
- [ ] Retry should not duplicate server effects.
- [ ] Use operationId for idempotency.
- [ ] Server validates ownership, entity existence, operation permission, and payload size.

## Phase 3: Operation Coalescing
- [ ] Multiple renames on the same entity should sync only the latest rename.
- [ ] Multiple reorder operations should sync only the final order.
- [ ] Move plus reorder should resolve into the final visible state.
- [ ] Delete should remove unnecessary pending updates for that entity.
- [ ] Old drag positions should never be sent if the user can no longer see them.
- [ ] Keep this aligned with the existing useOptimisticSync replacePending behavior.

## Phase 4: Rollback and Error Handling
- [ ] Add central error boundary.
- [ ] Add global mutation/sync error handling.
- [ ] Add toast feedback for failed sync.
- [ ] Add retry action.
- [ ] Add failed operation drawer or log.
- [ ] Make failed reorder/move recoverable.
- [ ] Avoid aggressive invalidation after every small action.
- [ ] Refetch only the affected entity or view when needed.

## Phase 5: Query and Database Scale Prep
- [ ] Split heavy queries.
- [ ] Do not always fetch view -> lists -> items -> tags -> metadata.
- [ ] Fetch views separately.
- [ ] Fetch visible lists separately.
- [ ] Fetch visible list items separately.
- [ ] Fetch tags only when needed.
- [ ] Prepare for pagination.
- [ ] Prepare for virtualization.
- [ ] Add useful database indexes.
- [ ] Consider denormalized counters later.

## Phase 6: Security Before Public Launch
- [ ] Add rate limiting for login, signup, create item, reorder item, sync endpoint, and bulk mutation endpoint.
- [ ] Use Redis or Upstash Redis later, not during Phase 1.
- [ ] Add mutation validation hardening.
- [ ] Validate input shape.
- [ ] Validate ownership.
- [ ] Validate entity existence.
- [ ] Validate payload size.
- [ ] Validate order values.
- [ ] Add audit logs for important destructive actions.
- [ ] Add session invalidation rules if needed.
- [ ] Consider CSRF protection if cookie-based auth is used for dangerous mutations.
- [ ] Add per-user, per-IP, and per-route API abuse limits.

## Phase 7: Observability
- [ ] Add Sentry later for frontend errors, backend errors, API failures, slow queries, mutation failure rates, sync queue failures, and backend latency.
- [ ] Consider PostHog later for product analytics and session replay.
- [ ] Do not add this before the local-first sync foundation is stable.

## Phase 8: Background Jobs
- [ ] Add QStash only after local-first sync and security basics.
- [ ] Use background jobs for scheduled reminders, retry emails, daily cleanup, sync reconciliation, export generation, and notifications.
- [ ] Consider Inngest only if workflows become multi-step and complex.
- [ ] Do not add background jobs during Phase 1.

## Explicit Non-Goals For Now
- [ ] Do not implement full CRDT multiplayer sync yet.
- [ ] Do not implement Redis yet.
- [ ] Do not implement Sentry yet.
- [ ] Do not implement QStash yet.
- [ ] Do not implement onboarding yet.
- [ ] Do not rewrite the whole app.
- [ ] Do not create a second source of truth that conflicts with existing view cache rules.

## Next Implementation Priority
The next real build phase should be Dexie + outbox + sync status + safer rollback. Redis, Sentry, QStash, and onboarding are later.

## Acceptance Criteria
- [ ] App still feels instant.
- [ ] App can survive temporary offline state.
- [ ] Create, rename, delete, reorder, and move work locally first.
- [ ] Drag/drop does not spam server calls.
- [ ] Failed sync does not corrupt visible order.
- [ ] User can see pending and failed sync.
- [ ] Server still validates every mutation.
- [ ] No aggressive invalidation after every small optimistic action.
