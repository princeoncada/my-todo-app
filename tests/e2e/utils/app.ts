import { expect, type Page } from "@playwright/test";

import { testIds } from "./test-ids";
import {
  expectItemNotVisible,
  expectListNotVisible,
  firstVisible,
  getVisibleListCard,
  getVisibleViewCard,
} from "./assertions";

export function waitForSuccessfulTrpcMutation(page: Page, procedure: string) {
  return page.waitForResponse((response) =>
    response.request().method() === "POST" &&
    response.url().includes(`/api/trpc/${procedure}`) &&
    response.ok()
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function createList(page: Page, name: string) {
  const createListButton = await firstVisible(page.getByTestId(testIds.createListButton));

  await createListButton.click();
  await page.getByPlaceholder("Enter your list name...").fill(name);
  await page.getByRole("button", { name: "Create List" }).click();
  await expect(await getVisibleListCard(page, name)).toBeVisible();
}

export async function createItemInVisibleList(
  page: Page,
  listName: string,
  itemName: string,
  options: { waitForPersistence?: boolean } = {}
) {
  const card = await getVisibleListCard(page, listName);
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: /list options/i }).click();
  await page.getByRole("menuitem", { name: "Add Item" }).click();
  await card.getByTestId(testIds.createItemInput).fill(itemName);
  const persisted = options.waitForPersistence
    ? waitForSuccessfulTrpcMutation(page, "listItem.createListItem")
    : undefined;
  await card.getByTestId(testIds.createItemInput).press("Enter");
  await expect(card.getByTestId(testIds.listItem).filter({ hasText: itemName })).toBeVisible();
  await persisted;
}

export async function createListAndImmediatelyAddItem(
  page: Page,
  listName: string,
  itemName: string
) {
  await createList(page, listName);
  await createItemInVisibleList(page, listName, itemName, {
    waitForPersistence: true,
  });
}

export async function renameList(page: Page, oldName: string, newName: string) {
  const card = await getVisibleListCard(page, oldName);
  await card.getByTestId(testIds.listTitle).click();
  await card.getByTestId(testIds.listTitleInput).fill(newName);
  await card.getByTestId(testIds.listTitleInput).press("Enter");
  await expect(await getVisibleListCard(page, newName)).toBeVisible();
  await expectListNotVisible(page, oldName);
}

export async function deleteList(page: Page, name: string) {
  const card = await getVisibleListCard(page, name);
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: /list options/i }).click();
  await page.getByTestId(testIds.deleteListButton).click();
  await expectListNotVisible(page, name);
}

export async function openAllLists(page: Page) {
  const allListsButton = await firstVisible(page.getByRole("button", { name: /all lists/i }));

  await allListsButton.click();
}

export async function openViewByName(page: Page, viewName: string) {
  const viewCard = await getVisibleViewCard(page, viewName);

  await viewCard.getByRole("button", { name: viewName }).click();
}

export async function createItem(page: Page, listName: string, itemName: string) {
  await createItemInVisibleList(page, listName, itemName);
}

export async function renameItem(page: Page, oldName: string, newName: string) {
  const item = await firstVisible(page.getByTestId(testIds.listItem).filter({ hasText: oldName }));
  await item.getByTestId(testIds.listItemTitle).click();
  await item.getByTestId(testIds.listTitleInput).fill(newName);
  await item.getByTestId(testIds.listTitleInput).press("Enter");
  await expect(page.getByTestId(testIds.listItem).filter({ hasText: newName })).toBeVisible();
  await expectItemNotVisible(page, oldName);
}

export async function deleteItem(page: Page, itemName: string) {
  const item = await firstVisible(page.getByTestId(testIds.listItem).filter({ hasText: itemName }));
  await expect(item).toBeVisible();
  await item.getByRole("button").last().click();
  await expectItemNotVisible(page, itemName);
}

export async function createTag(page: Page, listName: string, tagName: string) {
  const card = await getVisibleListCard(page, listName);
  await card.getByTestId(testIds.tagSelector).click();
  await page.getByPlaceholder("Search or create tag...").fill(tagName);
  await page.getByText(`Create "${tagName}"`).click();
  await expect(card.getByText(tagName, { exact: true })).toBeVisible();
}

export async function removeTagFromList(page: Page, listName: string, tagName: string) {
  const card = await getVisibleListCard(page, listName);
  await card.getByRole("button", { name: `Remove ${tagName} tag` }).click();
  await expect(card.getByText(tagName, { exact: true })).toHaveCount(0);
}

export async function createView(page: Page, viewName: string, tagName: string) {
  const createViewButton = await firstVisible(page.getByTestId(testIds.viewCreateButton));

  await expect(createViewButton).toBeVisible();
  await createViewButton.click();
  const dialog = page.getByRole("dialog");

  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Name").fill(viewName);
  await dialog
    .getByRole("button", { name: new RegExp(`^${escapeRegExp(tagName)}\\b`) })
    .click();
  const persisted = waitForSuccessfulTrpcMutation(page, "view.create");
  await dialog.getByTestId(testIds.saveViewButton).click();
  await expect(await getVisibleViewCard(page, viewName)).toBeVisible();
  await persisted;
}

export async function deleteView(page: Page, viewName: string) {
  const viewCard = await getVisibleViewCard(page, viewName);

  await expect(viewCard).toBeVisible();
  await viewCard.getByRole("button").last().click();
  const deleted = waitForSuccessfulTrpcMutation(page, "view.delete");
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(page.getByTestId(testIds.viewCard).filter({ hasText: viewName })).toHaveCount(0);
  await deleted;
}
