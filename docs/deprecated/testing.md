# Testing

## Strategy
Tidy uses two test layers:

- Unit tests for pure logic that should not need a browser, database, Supabase session, or Next server.
- Playwright E2E tests for public smoke coverage and authenticated dashboard flows.

Keep tests focused on current behavior. Do not rewrite product behavior only to satisfy tests.

## Commands
- `npm run test`: run Vitest unit tests once.
- `npm run test:watch`: run Vitest in watch mode.
- `npm run test:ui`: run the Vitest UI.
- `npm run test:e2e`: run non-authenticated Playwright tests only.
- `npm run test:e2e:smoke`: run public smoke E2E only.
- `npm run test:e2e:auth`: run authenticated dashboard E2E with an existing `tests/.auth/user.json`.
- `npm run test:e2e:dashboard`: alias for authenticated dashboard E2E.
- `npm run test:e2e:auth:setup`: generate `tests/.auth/user.json`.
- `npm run test:e2e:headed`: run non-authenticated E2E with a visible browser.
- `npm run test:e2e:debug`: run non-authenticated E2E in debug mode.
- `npm run test:e2e:report`: open the last Playwright HTML report.
- `npm run test:ci`: run typecheck, lint, unit tests, and default E2E.
- `npm run test:all`: run unit tests, then default E2E.

## Smoke E2E
Smoke tests cover public routes that do not require Supabase auth.

Run smoke and non-auth dashboard checks with `npm run test:e2e`.

The default E2E command does not require credentials. It covers public routes and the unauthenticated dashboard redirect only.

## Authenticated Dashboard E2E
Dashboard tests require a real Supabase test user and a reachable database.

Set:

- `E2E_TEST_EMAIL`
- `E2E_TEST_PASSWORD`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `DATABASE_URL`

First create `.env.local` from the example and set local test credentials:

```text
copy .env.example .env.local
```

Then generate storage state:

```text
npm run test:e2e:auth:setup
```

The `auth-setup` project logs in through `/login` and writes storage state to:

```text
tests/.auth/user.json
```

That file is ignored by git. Do not commit storage state or credentials.

If credentials are missing, authenticated E2E fails loudly with setup instructions. It does not silently skip dashboard coverage.

After `tests/.auth/user.json` exists, run dashboard tests:

```text
npm run test:e2e:auth
```

## Playwright Traces
Playwright records traces on first retry and screenshots/videos on failure.

After a failed run:

```text
npm run test:e2e:report
```

Use the trace to inspect the exact selector, action, network state, and DOM snapshot before changing tests or app code.

## Data Naming
Generated E2E data must use a visible `e2e-` prefix plus a deterministic run id and per-process sequence. Helpers in `tests/e2e/utils/seed.ts` provide `uniqueTestName`.

Clean up test-created lists through the UI when possible. If cleanup fails, the visible prefix makes leftover data easy to identify.

## Data Test IDs
Use `data-testid` only for stable product surfaces where role/text selectors are not specific enough.

Allowed current test IDs:

- `app-shell`
- `create-list-button`
- `list-card`
- `list-title`
- `list-title-input`
- `list-drag-handle`
- `list-drop-zone`
- `create-item-input`
- `list-item`
- `list-item-title`
- `item-drag-handle`
- `delete-list-button`
- `view-create-button`
- `view-card`
- `tag-selector`
- `save-view-button`

Do not add test IDs everywhere. Prefer role, label, placeholder, and visible text selectors when they are stable.

## Flake Rules
- Do not rely on arbitrary waits.
- Wait for visible UI state, persistence after reload, or specific assertions.
- Do not use random data without the `e2e-` prefix.
- Do not overuse `test.skip`; skip only the specific test that cannot run in the current environment.
- Document every skipped test with the exact missing fixture, selector, or capability.
- Do not silently skip authenticated dashboard tests because credentials are missing.
- Do not delete failing tests to make a suite pass.

## Extending Tests
When adding a feature:

1. Add or update the smallest relevant unit or E2E test.
2. Run the targeted test first.
3. Run the full relevant suite.
4. Update this document if a new command, fixture, or selector convention is introduced.

## Current Gaps
- No Playwright tests are intentionally skipped in the current suite.
- `npm run test:e2e` intentionally excludes authenticated dashboard coverage.
- Authenticated dashboard E2E requires CI secrets before it can run in GitHub Actions.
- Drag/drop tests use a lower-level mouse movement helper because dnd-kit does not always work with `locator.dragTo`.
- API ownership tests are still needed for protected tRPC procedures.
