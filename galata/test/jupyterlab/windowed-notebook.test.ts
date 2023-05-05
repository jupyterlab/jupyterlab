// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { expect, test } from '@jupyterlab/galata';
import * as path from 'path';

const fileName = 'windowed_notebook.ipynb';

test.beforeEach(async ({ page, tmpPath }) => {
  await page.contents.uploadFile(
    path.resolve(__dirname, `../galata/notebooks/${fileName}`),
    `${tmpPath}/${fileName}`
  );
  await page.notebook.openByPath(`${tmpPath}/${fileName}`);
});

test('should not update height when hiding', async ({ page }) => {
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

test('should hide first code cell when scrolling down', async ({ page }) => {
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
  page
}) => {
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
  page
}) => {
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
  page
}) => {
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
  page
}) => {
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
  page
}) => {
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
