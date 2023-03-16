// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

const DEFAULT_NAME = 'untitled';
const EXTENSION = {
  Text: '.txt',
  Notebook: '.ipynb',
  Markdown: '.md'
};

for (const type of ['Text', 'Notebook', 'Markdown']) {
  test(`Prompt to rename new ${type} file`, async ({ page }) => {
    await page.menu.clickMenuItem(
      type === 'Notebook' ? `File>New>${type}` : `File>New>${type} File`
    );

    await page.waitForSelector(
      `[role="main"] >> text=${DEFAULT_NAME}${EXTENSION[type]}`
    );

    if (type === 'Notebook') {
      // Select the kernel
      await page.click('.jp-Dialog >> button >> text=Select');
    }

    await page.menu.clickMenuItem(
      type === 'Markdown' ? `File>Save ${type} File` : `File>Save ${type}`
    );

    await page.waitForSelector('.jp-Dialog >> text=Rename file');

    await expect(
      page.locator('.jp-Dialog >> input[placeholder="File name"]')
    ).toHaveValue(
      type === 'Notebook'
        ? `U${DEFAULT_NAME.slice(1)}${EXTENSION[type]}`
        : `${DEFAULT_NAME}${EXTENSION[type]}`
    );

    await page.click('.jp-Dialog >> button >> text=Cancel');
  });
}

for (const type of ['Text', 'Notebook', 'Markdown']) {
  test(`Should not prompt to rename new renamed ${type} file`, async ({
    page
  }) => {
    await page.menu.clickMenuItem(
      type === 'Notebook' ? `File>New>${type}` : `File>New>${type} File`
    );

    await page.waitForSelector(
      `[role="main"] >> text=${DEFAULT_NAME}${EXTENSION[type]}`
    );

    if (type === 'Notebook') {
      // Select the kernel
      await page.click('.jp-Dialog >> button >> text=Select');
    }

    await page.menu.clickMenuItem(
      type === 'Markdown' ? `File>Rename ${type} File…` : `File>Rename ${type}…`
    );

    await page.fill('.jp-Dialog >> input', `dummy${EXTENSION[type]}`);

    await page.click('.jp-Dialog >> button >> text=Rename');

    await page.menu.clickMenuItem(
      type === 'Markdown' ? `File>Save ${type} File` : `File>Save ${type}`
    );

    await expect(page.locator('.jp-Dialog')).toHaveCount(0);
  });
}
