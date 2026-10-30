// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';

const fileName = 'selection-search.ipynb';

test.beforeEach(async ({ page, tmpPath }) => {
  await page.contents.uploadContent(
    JSON.stringify(galata.Notebook.generateNotebook(3, 'code', ['with'])),
    'text',
    `${tmpPath}/${fileName}`
  );
  await page.filebrowser.open(`${tmpPath}/${fileName}`, 'Notebook (no kernel)');
  await page.notebook.activate(fileName);
  await page.keyboard.press('ControlOrMeta+f');
  await page.getByPlaceholder('Find').fill('with');
  await page.click('button[title="Show Search Filters"]');
  await page.getByText('Search in 1 Selected Cell', { exact: true }).click();
  await expect(page.locator('.jp-DocumentSearch-index-counter')).toHaveText(
    '1/1'
  );
});

for (const cellIndex of [0, 1, 2]) {
  test(`Search counter after collapsing selection to cell ${cellIndex}`, async ({
    page
  }) => {
    const counter = page.locator('.jp-DocumentSearch-index-counter');
    const firstCell = await page.notebook.getCellLocator(0);
    await firstCell!.locator('.jp-InputPrompt').click();
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Shift+ArrowDown');
    await expect(
      page.getByText('Search in 3 Selected Cells', { exact: true })
    ).toBeVisible();
    await expect(counter).toHaveText('1/3');

    const cell = await page.notebook.getCellLocator(cellIndex);
    await cell!.locator('.jp-InputPrompt').click();

    await expect(
      page.getByText('Search in 1 Selected Cell', { exact: true })
    ).toBeVisible();
    await expect(counter).toHaveText('1/1');
    await expect(cell!.locator('.jp-current-match')).toHaveText('with');
  });
}

test('Extending cell selection preserves the current match', async ({
  page
}) => {
  const counter = page.locator('.jp-DocumentSearch-index-counter');
  const middleCell = await page.notebook.getCellLocator(1);
  await middleCell!.locator('.jp-InputPrompt').click();
  await expect(counter).toHaveText('1/1');
  await expect(middleCell!.locator('.jp-current-match')).toHaveText('with');

  await page.keyboard.press('Shift+ArrowUp');
  await expect(
    page.getByText('Search in 2 Selected Cells', { exact: true })
  ).toBeVisible();
  await expect(counter).toHaveText('2/2');
});

test('Changing the active cell preserves the current match in a full notebook search', async ({
  page
}) => {
  await page.getByText('Search in 1 Selected Cell', { exact: true }).click();
  const counter = page.locator('.jp-DocumentSearch-index-counter');
  await expect(counter).toHaveText('1/3');

  const lastCell = await page.notebook.getCellLocator(2);
  await lastCell!.locator('.jp-InputPrompt').click();
  await expect(counter).toHaveText('1/3');
});
