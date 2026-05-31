import { expect, type Page } from "@playwright/test";

import { getListCards, getVisibleListCard } from "./assertions";
import { testIds } from "./test-ids";

export const authStoragePath = "tests/.auth/user.json";
const runId = process.env.E2E_RUN_ID ?? new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
let sequence = 0;

export function uniqueTestName(prefix: string) {
  sequence += 1;
  const suffix = `${runId}-${String(sequence).padStart(3, "0")}`;
  return `e2e-${prefix}-${suffix}`;
}

export async function gotoDashboard(page: Page) {
  await page.goto("/dashboard");
  await expect(page.getByTestId(testIds.appShell)).toBeVisible();
}

export function collectConsoleErrors(page: Page) {
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  return errors;
}

export function expectNoConsoleErrors(errors: string[]) {
  expect(errors).toEqual([]);
}

export async function cleanupNamedList(page: Page, name: string) {
  const matchingCards = getListCards(page).filter({ hasText: name });

  if (await matchingCards.count() === 0) return;

  const card = await getVisibleListCard(page, name);
  await card.getByRole("button", { name: /list options/i }).click();
  await page.getByTestId(testIds.deleteListButton).click();
  await expect(matchingCards).toHaveCount(0);
}
