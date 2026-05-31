import { expect, type Locator, type Page } from "@playwright/test";

import { testIds } from "./test-ids";

export async function firstVisible(locator: Locator) {
  await expect
    .poll(async () => {
      const count = await locator.count();

      for (let index = 0; index < count; index += 1) {
        if (await locator.nth(index).isVisible()) return index;
      }

      return -1;
    })
    .not.toBe(-1);

  const count = await locator.count();

  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);

    if (await candidate.isVisible()) return candidate;
  }

  throw new Error("Expected a visible locator match.");
}

export function getListCards(page: Page) {
  return page.getByTestId(testIds.listCard);
}

export function getViewCards(page: Page) {
  return page.getByTestId(testIds.viewCard);
}

export async function getVisibleListCard(page: Page, name: string) {
  return firstVisible(getListCards(page).filter({ hasText: name }));
}

export async function getVisibleViewCard(page: Page, name: string) {
  return firstVisible(getViewCards(page).filter({ hasText: name }));
}

export async function expectListVisible(page: Page, name: string) {
  await expect(await getVisibleListCard(page, name)).toBeVisible();
}

export async function expectListNotVisible(page: Page, name: string) {
  await expect(getListCards(page).filter({ hasText: name })).toHaveCount(0);
}

export async function expectItemVisible(page: Page, itemName: string) {
  await expect(page.getByTestId(testIds.listItem).filter({ hasText: itemName })).toBeVisible();
}

export async function expectItemNotVisible(page: Page, itemName: string) {
  await expect(page.getByTestId(testIds.listItem).filter({ hasText: itemName })).toHaveCount(0);
}

export async function reloadAndExpectPersisted(page: Page, text: string) {
  await page.reload();
  await expect(page.getByText(text, { exact: true })).toBeVisible({ timeout: 15_000 });
}

export async function reloadAndExpectMissing(page: Page, text: string) {
  await page.reload();
  await expect(page.getByText(text, { exact: true })).toHaveCount(0);
}

export async function expectNoDuplicateText(page: Page, text: string) {
  await expect(page.getByText(text, { exact: true })).toHaveCount(1);
}

export async function getVisibleListNames(page: Page) {
  return await getListCards(page).evaluateAll(
    (nodes, listTitleTestId) =>
      nodes
        .filter((node) => {
          const element = node as HTMLElement;
          const style = window.getComputedStyle(element);

          return style.visibility !== "hidden" &&
            style.display !== "none" &&
            element.getClientRects().length > 0;
        })
        .map((node) =>
          node.querySelector(`[data-testid="${listTitleTestId}"]`)?.textContent?.trim() ?? ""
        )
        .filter(Boolean),
    testIds.listTitle
  );
}

export async function expectListOrder(page: Page, orderedNames: string[]) {
  await expect
    .poll(async () => {
      const names = await getVisibleListNames(page);
      const indexes = orderedNames.map((name) => names.indexOf(name));
      return indexes.every((index) => index >= 0) &&
        indexes.every((index, position) => position === 0 || indexes[position - 1] < index);
    })
    .toBe(true);
}

export async function expectItemInList(page: Page, listName: string, itemName: string) {
  const card = await getVisibleListCard(page, listName);
  await expect(card.getByTestId(testIds.listItem).filter({ hasText: itemName })).toBeVisible();
}

export async function expectItemNotInList(page: Page, listName: string, itemName: string) {
  const card = await getVisibleListCard(page, listName);
  await expect(card.getByTestId(testIds.listItem).filter({ hasText: itemName })).toHaveCount(0);
}

export async function getVisibleViewNames(page: Page) {
  return await getViewCards(page).evaluateAll((nodes) =>
    nodes
      .filter((node) => {
        const element = node as HTMLElement;
        const style = window.getComputedStyle(element);

        return style.visibility !== "hidden" &&
          style.display !== "none" &&
          element.getClientRects().length > 0;
      })
      .map((node) => node.textContent?.trim() ?? "")
      .filter(Boolean)
  );
}

export async function expectViewOrder(page: Page, orderedNames: string[]) {
  await expect
    .poll(async () => {
      const names = await getVisibleViewNames(page);
      const indexes = orderedNames.map((name) => names.findIndex((viewName) => viewName.includes(name)));

      return indexes.every((index) => index >= 0) &&
        indexes.every((index, position) => position === 0 || indexes[position - 1] < index);
    })
    .toBe(true);
}
