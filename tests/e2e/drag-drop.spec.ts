import { test, type Page } from "@playwright/test";

import {
  createItemInVisibleList,
  createList,
  openAllLists,
  waitForSuccessfulTrpcMutation,
} from "./utils/app";
import {
  expectItemInList,
  expectItemNotInList,
  expectListOrder,
  getVisibleListCard,
} from "./utils/assertions";
import { dragByMouseAndWaitForMutation } from "./utils/drag";
import { cleanupNamedList, collectConsoleErrors, expectNoConsoleErrors, gotoDashboard, uniqueTestName } from "./utils/seed";
import { testIds } from "./utils/test-ids";

let consoleErrors: string[];

async function createPersistedList(page: Page, name: string) {
  const persisted = waitForSuccessfulTrpcMutation(page, "list.createList");

  await createList(page, name);
  await persisted;
}

test.beforeEach(async ({ page }) => {
  consoleErrors = collectConsoleErrors(page);
  await gotoDashboard(page);
  await openAllLists(page);
});

test.afterEach(async () => {
  expectNoConsoleErrors(consoleErrors);
});

test("reorder lists if drag/drop is currently implemented", async ({ page }) => {
  const first = uniqueTestName("drag-list-first");
  const second = uniqueTestName("drag-list-second");
  await createPersistedList(page, first);
  await createPersistedList(page, second);

  const firstCard = await getVisibleListCard(page, first);
  const secondCard = await getVisibleListCard(page, second);
  await expectListOrder(page, [second, first]);

  await dragByMouseAndWaitForMutation(
    page,
    firstCard.getByTestId(testIds.listDragHandle),
    secondCard.getByTestId(testIds.listDragHandle),
    "view.reorderViewLists"
  );

  await expectListOrder(page, [first, second]);
  await page.reload();
  await expectListOrder(page, [first, second]);
  await cleanupNamedList(page, first);
  await cleanupNamedList(page, second);
});

test("move item between lists if implemented", async ({ page }) => {
  const sourceList = uniqueTestName("move-source");
  const targetList = uniqueTestName("move-target");
  const itemName = uniqueTestName("move-item");
  await createPersistedList(page, sourceList);
  await createPersistedList(page, targetList);
  await createItemInVisibleList(page, sourceList, itemName, { waitForPersistence: true });

  const item = page.getByTestId(testIds.listItem).filter({ hasText: itemName }).first();
  const targetCard = await getVisibleListCard(page, targetList);
  await dragByMouseAndWaitForMutation(
    page,
    item.getByTestId(testIds.itemDragHandle),
    targetCard.getByTestId(testIds.listDropZone),
    "listItem.reorderListItems"
  );

  await expectItemNotInList(page, sourceList, itemName);
  await expectItemInList(page, targetList, itemName);
  await page.reload();
  await expectItemNotInList(page, sourceList, itemName);
  await expectItemInList(page, targetList, itemName);
  await cleanupNamedList(page, sourceList);
  await cleanupNamedList(page, targetList);
});

test("move item into empty list if implemented", async ({ page }) => {
  const sourceList = uniqueTestName("empty-move-source");
  const targetList = uniqueTestName("empty-move-target");
  const itemName = uniqueTestName("empty-move-item");
  await createPersistedList(page, sourceList);
  await createPersistedList(page, targetList);
  await createItemInVisibleList(page, sourceList, itemName, { waitForPersistence: true });

  const item = page.getByTestId(testIds.listItem).filter({ hasText: itemName }).first();
  const targetCard = await getVisibleListCard(page, targetList);
  await dragByMouseAndWaitForMutation(
    page,
    item.getByTestId(testIds.itemDragHandle),
    targetCard.getByTestId(testIds.listDropZone),
    "listItem.reorderListItems"
  );

  await expectItemNotInList(page, sourceList, itemName);
  await expectItemInList(page, targetList, itemName);
  await page.reload();
  await expectItemNotInList(page, sourceList, itemName);
  await expectItemInList(page, targetList, itemName);
  await cleanupNamedList(page, sourceList);
  await cleanupNamedList(page, targetList);
});
