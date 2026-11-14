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

    await page
      .locator(`[role="main"] >> text=${DEFAULT_NAME}${EXTENSION[type]}`)
      .waitFor();

    if (type === 'Notebook') {
      // Select the kernel
      await page.click('.jp-Dialog >> button >> text=Select');
    }

    // Save is enabled once the document has loaded, and an open menu does
    // not update its items.
    await page.waitForFunction(() =>
      window.jupyterapp.commands.isEnabled('docmanager:save')
    );
    await page.menu.clickMenuItem(
      type === 'Markdown' ? `File>Save ${type} File` : `File>Save ${type}`
    );

    await page.locator('.jp-Dialog >> text=Rename file').waitFor();

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

    await page
      .locator(`[role="main"] >> text=${DEFAULT_NAME}${EXTENSION[type]}`)
      .waitFor();

    if (type === 'Notebook') {
      // Select the kernel
      await page.click('.jp-Dialog >> button >> text=Select');
    }

    await page.menu.clickMenuItem(
      type === 'Markdown' ? `File>Rename ${type} File…` : `File>Rename ${type}…`
    );

    await page.fill('.jp-Dialog >> input', `dummy${EXTENSION[type]}`);

    await page.click('.jp-Dialog >> button >> text=Rename');

    // The file stays untitled until the server confirms the rename.
    await page
      .locator(`[role="main"] >> text=dummy${EXTENSION[type]}`)
      .waitFor();

    await page.menu.clickMenuItem(
      type === 'Markdown' ? `File>Save ${type} File` : `File>Save ${type}`
    );

    await expect(page.locator('.jp-Dialog')).toHaveCount(0);
  });
}

test('Should keep prompt on save when rename fails due to conflict', async ({
  page
}) => {
  await page.contents.uploadContent('dummy', 'text', 'conflict.txt');

  await page.menu.clickMenuItem('File>New>Text File');

  await page
    .locator(`[role="main"] >> text=${DEFAULT_NAME}${EXTENSION['Text']}`)
    .waitFor();

  await page.waitForFunction(() =>
    window.jupyterapp.commands.isEnabled('docmanager:save')
  );
  await page.menu.clickMenuItem('File>Save Text File');

  await page.locator('.jp-Dialog >> text=Rename file').waitFor();

  await page.fill(
    '.jp-Dialog >> input[placeholder="File name"]',
    'conflict.txt'
  );
  await page.click('.jp-Dialog >> button >> text=Rename and Save');

  // Error dialog should appear indicating the rename failed
  await page.locator('.jp-Dialog >> text=Rename Error').waitFor();
  await page.click('.jp-Dialog >> button >> text=Dismiss');

  // Verify that saving again still prompts to rename because isUntitled remains true
  await page.menu.clickMenuItem('File>Save Text File');
  await page.locator('.jp-Dialog >> text=Rename file').waitFor();
  await page.click('.jp-Dialog >> button >> text=Cancel');
});

test('Should keep prompt on save when rename fails due to invalid name', async ({
  page
}) => {
  await page.menu.clickMenuItem('File>New>Text File');

  await page
    .locator(`[role="main"] >> text=${DEFAULT_NAME}${EXTENSION['Text']}`)
    .waitFor();

  await page.waitForFunction(() =>
    window.jupyterapp.commands.isEnabled('docmanager:save')
  );
  await page.menu.clickMenuItem('File>Save Text File');

  await page.locator('.jp-Dialog >> text=Rename file').waitFor();

  // Enter an invalid file name containing '/'
  await page.fill(
    '.jp-Dialog >> input[placeholder="File name"]',
    'invalid/name.txt'
  );
  await page.click('.jp-Dialog >> button >> text=Rename and Save');

  // Error dialog should appear indicating the rename failed
  await page.locator('.jp-Dialog >> text=Rename Error').waitFor();
  await page.click('.jp-Dialog >> button >> text=Dismiss');

  // Verify that saving again still prompts to rename because isUntitled remains true
  await page.menu.clickMenuItem('File>Save Text File');
  await page.locator('.jp-Dialog >> text=Rename file').waitFor();
  await page.click('.jp-Dialog >> button >> text=Cancel');
});
