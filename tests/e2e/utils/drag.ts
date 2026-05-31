import { expect, type Locator, type Page } from "@playwright/test";

import { waitForSuccessfulTrpcMutation } from "./app";

async function center(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();

  return {
    x: box!.x + box!.width / 2,
    y: box!.y + box!.height / 2,
  };
}

export async function dragByMouse(page: Page, source: Locator, target: Locator) {
  const from = await center(source);
  const to = await center(target);

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
}

export async function dragByMouseAndWaitForMutation(
  page: Page,
  source: Locator,
  target: Locator,
  procedure: string
) {
  const persisted = waitForSuccessfulTrpcMutation(page, procedure);

  await dragByMouse(page, source, target);
  await persisted;
}
