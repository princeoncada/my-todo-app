import { test } from "@playwright/test";

import {
  createItem,
  createList,
  createListAndImmediatelyAddItem,
  deleteItem,
  renameItem,
} from "./utils/app";
import { expectItemNotVisible, expectItemVisible, reloadAndExpectMissing, reloadAndExpectPersisted } from "./utils/assertions";
import { cleanupNamedList, collectConsoleErrors, expectNoConsoleErrors, gotoDashboard, uniqueTestName } from "./utils/seed";

let consoleErrors: string[];

test.beforeEach(async ({ page }) => {
  consoleErrors = collectConsoleErrors(page);
  await gotoDashboard(page);
});

test.afterEach(async () => {
  expectNoConsoleErrors(consoleErrors);
});

test("create item inside a list", async ({ page }) => {
  const listName = uniqueTestName("item-list");
  const itemName = uniqueTestName("item-create");
  await createList(page, listName);
  await createItem(page, listName, itemName);
  await expectItemVisible(page, itemName);
  await reloadAndExpectPersisted(page, itemName);
  await cleanupNamedList(page, listName);
});

test("immediate item creation after list creation persists after reload", async ({ page }) => {
  const listName = uniqueTestName("immediate-item-list");
  const itemName = uniqueTestName("immediate-item");

  await createListAndImmediatelyAddItem(page, listName, itemName);
  await expectItemVisible(page, itemName);
  await reloadAndExpectPersisted(page, listName);
  await expectItemVisible(page, itemName);
  await cleanupNamedList(page, listName);
});

test("create multiple items", async ({ page }) => {
  const listName = uniqueTestName("items-list");
  const items = [uniqueTestName("item-a"), uniqueTestName("item-b"), uniqueTestName("item-c")];
  await createList(page, listName);
  for (const item of items) await createItem(page, listName, item);
  for (const item of items) await expectItemVisible(page, item);
  await page.reload();
  for (const item of items) await expectItemVisible(page, item);
  await cleanupNamedList(page, listName);
});

test("rename item if supported", async ({ page }) => {
  const listName = uniqueTestName("rename-item-list");
  const itemName = uniqueTestName("item-original");
  const renamedItem = uniqueTestName("item-renamed");
  await createList(page, listName);
  await createItem(page, listName, itemName);
  await renameItem(page, itemName, renamedItem);
  await reloadAndExpectPersisted(page, renamedItem);
  await expectItemNotVisible(page, itemName);
  await cleanupNamedList(page, listName);
});

test("delete item if supported", async ({ page }) => {
  const listName = uniqueTestName("delete-item-list");
  const itemName = uniqueTestName("item-delete");
  await createList(page, listName);
  await createItem(page, listName, itemName);
  await deleteItem(page, itemName);
  await reloadAndExpectMissing(page, itemName);
  await cleanupNamedList(page, listName);
});

test("refresh keeps item visible if persistence exists", async ({ page }) => {
  const listName = uniqueTestName("persist-item-list");
  const itemName = uniqueTestName("item-persist");
  await createList(page, listName);
  await createItem(page, listName, itemName);
  await reloadAndExpectPersisted(page, itemName);
  await cleanupNamedList(page, listName);
});
