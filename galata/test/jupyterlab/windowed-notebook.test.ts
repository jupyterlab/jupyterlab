// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { expect, galata, test } from '@jupyterlab/galata';
import * as path from 'path';

const fileName = 'windowed_notebook.ipynb';
const injectionFile = 'css_js_injection.ipynb';

test.use({
  mockSettings: {
    ...galata.DEFAULT_SETTINGS,
    '@jupyterlab/notebook-extension:tracker': {
      ...galata.DEFAULT_SETTINGS['@jupyterlab/notebook-extension:tracker'],
      windowingMode: 'full'
    }
  }
});

test.beforeEach(async ({ page, tmpPath }) => {
  await page.contents.uploadFile(
    path.resolve(__dirname, `../galata/notebooks/${fileName}`),
    `${tmpPath}/${fileName}`
  );
  await page.contents.uploadFile(
    path.resolve(__dirname, `./notebooks/${injectionFile}`),
    `${tmpPath}/${injectionFile}`
  );
});

test('should not update height when hiding', async ({ page, tmpPath }) => {
  await page.notebook.openByPath(`${tmpPath}/${fileName}`);

  // Wait to ensure the rendering logic is stable.
  await page.waitForTimeout(200);

  const h = await page.notebook.getNotebookInPanel();
  const initialHeight = parseInt(
    (await h?.$$eval(
      '.jp-WindowedPanel-inner',
      nodes => nodes[0].style.height
    )) ?? '0',
    10
  );

  expect(initialHeight).toBeGreaterThan(0);

  await page.menu.clickMenuItem('File>New Launcher');

  const innerHeight =
    (await h?.$$eval(
      '.jp-WindowedPanel-inner',
      nodes => nodes[0].style.height
    )) ?? '-1';

  expect(parseInt(innerHeight, 10)).toEqual(initialHeight);
});

test('should hide first code cell when scrolling down', async ({
  page,
  tmpPath
}) => {
  await page.notebook.openByPath(`${tmpPath}/${fileName}`);

  const h = await page.notebook.getNotebookInPanel();
  const firstCellSelector = '.jp-Cell[data-windowed-list-index="0"]';
  const firstCell = await h!.waitForSelector(firstCellSelector);

  const bbox = await h!.boundingBox();
  await page.mouse.move(bbox!.x, bbox!.y);
  await Promise.all([
    firstCell.waitForElementState('hidden'),
    page.mouse.wheel(0, 600)
  ]);

  // Check the content contains only the output
  expect(await firstCell.textContent()).toEqual('[16]:local link\n');
});

test('should reattached a code code cell when scrolling back into the viewport', async ({
  page,
  tmpPath
}) => {
  await page.notebook.openByPath(`${tmpPath}/${fileName}`);

  const h = await page.notebook.getNotebookInPanel();
  const firstCellSelector = '.jp-Cell[data-windowed-list-index="0"]';
  const firstCell = await h!.waitForSelector(firstCellSelector);

  const bbox = await h!.boundingBox();
  await page.mouse.move(bbox!.x, bbox!.y);
  await Promise.all([
    firstCell.waitForElementState('hidden'),
    h!.waitForSelector('.jp-MarkdownCell[data-windowed-list-index="6"]'),
    page.mouse.wheel(0, 1200)
  ]);

  await Promise.all([
    firstCell.waitForElementState('visible'),
    page.mouse.wheel(0, -1200)
  ]);

  // Check that the input area is back
  expect(await firstCell.waitForSelector('.jp-InputArea')).toBeDefined();
});

test('should detach a markdown code cell when scrolling out of the viewport', async ({
  page,
  tmpPath
}) => {
  await page.notebook.openByPath(`${tmpPath}/${fileName}`);

  const h = await page.notebook.getNotebookInPanel();
  const mdCellSelector = '.jp-MarkdownCell[data-windowed-list-index="2"]';
  const mdCell = await h!.waitForSelector(mdCellSelector);

  const bbox = await h!.boundingBox();
  await page.mouse.move(bbox!.x, bbox!.y);
  await Promise.all([
    mdCell.waitForElementState('hidden'),
    page.mouse.wheel(0, 1200)
  ]);

  let found = true;
  try {
    await h!.waitForSelector(mdCellSelector, { timeout: 150 });
  } catch (r) {
    found = false;
  }
  expect(found).toEqual(false);
});

test('should reattach a markdown code cell when scrolling back into the viewport', async ({
  page,
  tmpPath
}) => {
  await page.notebook.openByPath(`${tmpPath}/${fileName}`);

  const h = await page.notebook.getNotebookInPanel();
  const mdCellSelector = '.jp-MarkdownCell[data-windowed-list-index="2"]';
  const mdCell = await h!.waitForSelector(mdCellSelector);

  const bbox = await h!.boundingBox();
  await page.mouse.move(bbox!.x, bbox!.y);
  await Promise.all([
    mdCell.waitForElementState('hidden'),
    h!.waitForSelector('.jp-MarkdownCell[data-windowed-list-index="6"]'),
    page.mouse.wheel(0, 1200)
  ]);

  await page.waitForTimeout(400);

  await page.mouse.wheel(0, -1200);

  expect(await h!.waitForSelector(mdCellSelector)).toBeDefined();
});

test('should remove all cells including hidden outputs artifacts', async ({
  page,
  tmpPath
}) => {
  await page.notebook.openByPath(`${tmpPath}/${fileName}`);

  const h = await page.notebook.getNotebookInPanel();

  const bbox = await h!.boundingBox();
  await page.mouse.move(bbox!.x, bbox!.y);
  await Promise.all([
    h!.waitForSelector('.jp-MarkdownCell[data-windowed-list-index="6"]'),
    page.mouse.wheel(0, 1200)
  ]);

  // Select all cells
  await page.keyboard.press('Control+a');
  // Delete all cells
  await page.keyboard.press('d');
  await page.keyboard.press('d');

  // Check that the notebook only contains one cell
  expect(await (await h!.$('.jp-WindowedPanel-inner'))!.textContent()).toEqual(
    '[ ]:'
  );

  // Check there are no hidden cells
  let found = true;
  try {
    await h!.waitForSelector('.jp-Cell', { state: 'hidden', timeout: 150 });
  } catch (r) {
    found = false;
  }
  expect(found).toEqual(false);
});

test('should scroll past end when running and inserting a cell at the viewport bottom', async ({
  page,
  tmpPath
}) => {
  await page.notebook.openByPath(`${tmpPath}/${fileName}`);

  const h = await page.notebook.getNotebookInPanel();
  const mdCellSelector = '.jp-MarkdownCell[data-windowed-list-index="2"]';
  const mdCell = await h!.waitForSelector(mdCellSelector);

  await page
    .locator('.jp-Notebook-ExecutionIndicator[data-status="idle"]')
    .waitFor();

  await mdCell.click();

  await expect
    .soft(
      page
        .getByRole('main')
        .locator('.jp-RawCell[data-windowed-list-index="4"]')
    )
    .not.toBeInViewport();

  await page.keyboard.press('Shift+Enter');

  await expect(
    page.getByRole('main').locator('.jp-RawCell[data-windowed-list-index="4"]')
  ).toBeInViewport();
});

test('should rendered injected styles of out-of-viewport cells', async ({
  page,
  tmpPath
}) => {
  await page.notebook.openByPath(`${tmpPath}/${injectionFile}`);
  await page.notebook.trust();

  // Check the cell is out of the viewport
  await expect
    .soft(page.locator('.jp-Cell[data-windowed-list-index="4"]'))
    .not.toBeVisible();

  await page.waitForFunction(() => {
    const cell = document.querySelector('.jp-Notebook-cell');
    if (cell) {
      return (
        window.getComputedStyle(cell, '::after').content ==
        '"CSS ::after element"'
      );
    } else {
      return false;
    }
  });

  const afterCellCount = await page.evaluate(() => {
    let count = 0;
    for (const cell of document.querySelectorAll('.jp-Notebook-cell')) {
      count +=
        window.getComputedStyle(cell, '::after').content ==
        '"CSS ::after element"'
          ? 1
          : 0;
    }
    return count;
  });

  expect(afterCellCount).toBeGreaterThan(1);
});

test('should rendered injected HTML scripts of out-of-viewport cells', async ({
  page,
  tmpPath
}) => {
  await page.notebook.openByPath(`${tmpPath}/${injectionFile}`);
  await page.notebook.trust();

  // Check the cell is out of the viewport
  await expect
    .soft(page.locator('.jp-Cell[data-windowed-list-index="4"]'))
    .not.toBeVisible();

  await page.getByText('JavaScript injected from HTML').first().waitFor();
  expect(
    await page.getByText('JavaScript injected from HTML').count()
  ).toBeGreaterThan(1);
});

test('should rendered injected JavaScript snippets of out-of-viewport cells', async ({
  page,
  tmpPath
}) => {
  await page.notebook.openByPath(`${tmpPath}/${injectionFile}`);
  await page.notebook.trust();

  // Check the cell is out of the viewport
  await expect
    .soft(page.locator('.jp-Cell[data-windowed-list-index="4"]'))
    .not.toBeVisible();

  await page.getByText('JavaScript injected header').first().waitFor();
  expect(
    await page.getByText('JavaScript injected header').count()
  ).toBeGreaterThan(1);
});
