// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

const fileName = 'motion.ipynb';
const cellSelector = '[role="main"] >> .jp-NotebookPanel >> .jp-Cell';

test.beforeEach(async ({ page }) => {
  await page.notebook.createNew(fileName);

  // Populate the notebook
  await page.notebook.setCell(0, 'markdown', '# Heading 1');
  await page.notebook.addCell('code', '1+1');
  await page.notebook.addCell('markdown', '## Heading 1.1');
  await page.notebook.addCell('code', '2+2');
  await page.notebook.addCell('markdown', '# Heading 2');
  await page.notebook.addCell('code', '3+3');

  await page.notebook.run();
});

test('Move down a cell', async ({ page }) => {
  const content = await page
    .locator(`${cellSelector} >> nth=2`)
    .allTextContents();
  await page
    .locator(`${cellSelector} >> nth=2 >> .jp-InputArea-prompt`)
    .click();

  await page.keyboard.press('Control+Shift+ArrowDown');

  await expect(page.locator(`${cellSelector} >> nth=3`)).toHaveClass(
    /jp-mod-active/
  );
  expect(
    await page.locator(`${cellSelector} >> nth=3`).allTextContents()
  ).toEqual(content);
});

test('Move up a cell', async ({ page }) => {
  const content = await page
    .locator(`${cellSelector} >> nth=2`)
    .allTextContents();
  await page
    .locator(`${cellSelector} >> nth=2 >> .jp-InputArea-prompt`)
    .click();
  await page.keyboard.press('Control+Shift+ArrowUp');

  await expect(page.locator(`${cellSelector} >> nth=1`)).toHaveClass(
    /jp-mod-active/
  );
  expect(
    await page.locator(`${cellSelector} >> nth=1`).allTextContents()
  ).toEqual(content);
});

test('Move down two cells with first active', async ({ page }) => {
  const content1 = await page
    .locator(`${cellSelector} >> nth=2`)
    .allTextContents();
  const content2 = await page
    .locator(`${cellSelector} >> nth=3`)
    .allTextContents();

  await page
    .locator(`${cellSelector} >> nth=3 >> .jp-InputArea-prompt`)
    .click();

  await page.keyboard.press('Shift+ArrowUp');
  await page.keyboard.press('Control+Shift+ArrowDown');

  await expect(page.locator(`${cellSelector} >> nth=3`)).toHaveClass(
    /jp-mod-active/
  );
  await expect(page.locator(`${cellSelector} >> nth=4`)).toHaveClass(
    /jp-mod-selected/
  );
  expect(
    await page.locator(`${cellSelector} >> nth=3`).allTextContents()
  ).toEqual(content1);
  expect(
    await page.locator(`${cellSelector} >> nth=4`).allTextContents()
  ).toEqual(content2);
});

test('Move up two cells with first active', async ({ page }) => {
  const content1 = await page
    .locator(`${cellSelector} >> nth=2`)
    .allTextContents();
  const content2 = await page
    .locator(`${cellSelector} >> nth=3`)
    .allTextContents();

  await page
    .locator(`${cellSelector} >> nth=3 >> .jp-InputArea-prompt`)
    .click();

  await page.keyboard.press('Shift+ArrowUp');
  await page.keyboard.press('Control+Shift+ArrowUp');

  await expect(page.locator(`${cellSelector} >> nth=1`)).toHaveClass(
    /jp-mod-active/
  );
  await expect(page.locator(`${cellSelector} >> nth=2`)).toHaveClass(
    /jp-mod-selected/
  );
  expect(
    await page.locator(`${cellSelector} >> nth=1`).allTextContents()
  ).toEqual(content1);
  expect(
    await page.locator(`${cellSelector} >> nth=2`).allTextContents()
  ).toEqual(content2);
});

test('Move down two cells with last active', async ({ page }) => {
  const content1 = await page
    .locator(`${cellSelector} >> nth=2`)
    .allTextContents();
  const content2 = await page
    .locator(`${cellSelector} >> nth=3`)
    .allTextContents();

  await page
    .locator(`${cellSelector} >> nth=2 >> .jp-InputArea-prompt`)
    .click();
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Control+Shift+ArrowDown');

  await expect(page.locator(`${cellSelector} >> nth=3`)).toHaveClass(
    /jp-mod-selected/
  );
  await expect(page.locator(`${cellSelector} >> nth=4`)).toHaveClass(
    /jp-mod-active/
  );
  expect(
    await page.locator(`${cellSelector} >> nth=3`).allTextContents()
  ).toEqual(content1);
  expect(
    await page.locator(`${cellSelector} >> nth=4`).allTextContents()
  ).toEqual(content2);
});

test('Move up two cells with last active', async ({ page }) => {
  const content1 = await page
    .locator(`${cellSelector} >> nth=2`)
    .allTextContents();
  const content2 = await page
    .locator(`${cellSelector} >> nth=3`)
    .allTextContents();
  await page
    .locator(`${cellSelector} >> nth=2 >> .jp-InputArea-prompt`)
    .click();

  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Control+Shift+ArrowDown');

  await expect(page.locator(`${cellSelector} >> nth=3`)).toHaveClass(
    /jp-mod-selected/
  );
  await expect(page.locator(`${cellSelector} >> nth=4`)).toHaveClass(
    /jp-mod-active/
  );
  expect(
    await page.locator(`${cellSelector} >> nth=3`).allTextContents()
  ).toEqual(content1);
  expect(
    await page.locator(`${cellSelector} >> nth=4`).allTextContents()
  ).toEqual(content2);
});
