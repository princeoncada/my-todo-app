# Testing Validation

## Commands

- `npm run typecheck`: TypeScript validation.
- `npm run lint`: ESLint validation.
- `npm run test`: Vitest unit tests.
- `npm run test:e2e`: non-authenticated Playwright tests only.
- `npm run test:e2e:smoke`: public smoke E2E only.
- `npm run test:e2e:auth:setup`: login through `/login` and create local storage state at `tests/.auth/user.json`.
- `npm run test:e2e:auth`: authenticated dashboard E2E using existing `tests/.auth/user.json`.
- `npm run test:ci`: typecheck, lint, unit tests, and non-authenticated E2E.

## Coverage

- Unit tests cover pure dashboard cache projection and view matching logic.
- Non-authenticated E2E covers public app load, login page load, initial console health, and unauthenticated dashboard redirect behavior.
- Authenticated E2E covers list create/rename/delete/persistence, item create/rename/delete/persistence, rapid create regression checks, basic view/tag filtering, and drag/drop persistence.

## Test-First Change Workflow
Every implementation must include matching tests in the same branch. Do not mark a feature, bug fix, refactor, or UI change complete unless the relevant tests are added or updated and the validation command passes.

Before coding:

- Identify the happy path.
- Identify common failure paths.
- Identify edge cases.
- Decide what needs unit coverage.
- Decide what needs E2E coverage.
- Decide what requires both.

Test rules:

- Unit tests are required for isolated logic, data transforms, cache helpers, query helpers, validation helpers, and pure state transitions.
- E2E tests are required for user-facing flows, forms, navigation, drag/drop, optimistic behavior, auth behavior, and persistence after reload.
- Bug fixes must include a regression test that would fail before the fix and pass after it.
- Refactors must preserve or improve existing tests for the behavior being moved.
- Manual validation is acceptable only when automation is not practical yet.
- Any untested behavior must be documented in `Known Gaps` with a concrete reason and follow-up.

## Test Requirements by Change Type

| Change type | Required coverage |
| --- | --- |
| Utility/helper changes | Unit tests for normal input, empty input, invalid input, null/undefined where allowed, duplicate handling, and ordering/filtering correctness. |
| UI component changes | E2E or component-level coverage for visible state, interaction state, loading/empty/error states, and narrow viewport behavior when layout changes. |
| Forms | E2E coverage for valid submit, invalid input, loading/disabled state, error feedback, duplicate submit, and persistence or navigation after success. |
| Database/query/cache logic | Unit tests for cache transforms where possible, plus E2E or integration coverage for reload persistence, stale cache behavior, missing entities, and ownership rules. |
| Optimistic updates | E2E coverage for immediate visible update, server-confirmed persistence, failed mutation rollback, refresh after optimistic update, and rapid repeated actions. |
| Drag/drop behavior | E2E coverage for reorder correctness, first/last item movement, moving into empty targets, persistence after reload, and no duplicate visible entities. |
| Auth behavior | E2E coverage for protected-route redirect, login-dependent flow when auth state is available, sign-out behavior, and auth expiration where practical. |
| Bug fixes | Regression test reproducing the original bug, plus the smallest common-case test needed to prove the fixed path still works. |
| Refactors | Existing behavior tests must keep passing; add focused tests for any extracted logic or changed public contract. |

## Common Case Checklist

- Happy path.
- Empty state.
- Loading state.
- Error state.
- Valid create/update/delete flow.
- Persistence after reload.
- Permission or ownership rule for protected data.
- Mobile or narrow viewport behavior when UI layout changes.

## Edge Case Checklist

- Invalid input.
- Null or undefined values.
- Duplicate action.
- Duplicate names.
- Long names.
- Special characters.
- Slow network or delayed mutation.
- Failed mutation.
- Stale cache.
- Deleted parent entity.
- Rapid repeated clicks.
- Reordering first item.
- Reordering last item.
- Moving item into empty list.
- Refresh after optimistic update.
- Sign-out mid-flow.

If a checklist item does not apply, state why in the implementation notes or final report.

## Authenticated Setup
Normal validation:

```text
npm run test:ci
```

Normal E2E without credentials:

```text
npm run test:e2e
```

Authenticated dashboard E2E is opt-in and not part of default CI yet. To run it locally:

```text
copy .env.example .env.local
```

Set local placeholder values to a real test account only on your machine:

```text
E2E_TEST_EMAIL=your-test-user@example.com
E2E_TEST_PASSWORD=your-test-password
```

Then generate storage state and run authenticated tests:

```text
npm run test:e2e:auth:setup
npm run test:e2e:auth
```

`tests/.auth/user.json` is local-only and ignored by git. Do not commit it.

## Manual Checklist

- Login and confirm the dashboard loads.
- Create, rename, delete, and refresh a list.
- Create, rename, delete, and refresh an item.
- Create a tag, create a view from that tag, and confirm unmatched lists are hidden.
- Drag lists and items, then refresh to confirm order/move persisted.
- Check the Playwright report or trace for selector, console, or network failures before changing tests.

## Definition of Done
A branch is complete only when:

- Implementation is finished.
- Associated tests are added or updated.
- Existing tests pass.
- `npm run test:ci` passes.
- Authenticated E2E is run when the changed behavior requires auth coverage and local auth state is available.
- Known gaps are documented.
- Manual validation notes exist only for flows not yet automated.

## Known Gaps

- Authenticated dashboard E2E requires a real Supabase test user and database; it is not part of `npm run test:e2e` or `npm run test:ci`.
- API ownership/security tests are not implemented yet.
- Drag/drop uses a mouse movement helper because dnd-kit is not reliably exercised by Playwright `locator.dragTo`.
- View cleanup is still minimal; test data uses an `e2e-` prefix so leftovers are easy to identify.
